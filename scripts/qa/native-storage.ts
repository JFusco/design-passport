import { hashValue, utf8ByteLength } from "../../src/core/stable";

const maximumBytes = 4_000_000;
const maximumEntries = 10_000;
const prefixes = (fileKey: string) => ["audit", "context", "view"].map((kind) => `design-passport:cache:v1:${kind}:${hashValue(fileKey)}:`);
const owns = (key: string, fileKey: string) => prefixes(fileKey).some((prefix) => key.startsWith(prefix));
const reserveKey = (fileKey: string) => `design-passport:cache:v1:view:${hashValue(fileKey)}:native-qa-quota-reserve`;
type RecordEntry = { key: string; encoding: "json" | "uint8-base64"; value: unknown };
interface Checkpoint { schemaVersion: 2; fileKey: string; records: RecordEntry[]; quotaPressureBytes: number; digest: string }
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeBytes(bytes: Uint8Array): string {
  const chunks: string[] = [];
  let chunk = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]!, b = bytes[index + 1], c = bytes[index + 2];
    chunk += alphabet[a >> 2]! + alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)]!
      + (b === undefined ? "=" : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)]!)
      + (c === undefined ? "=" : alphabet[c & 63]!);
    if (chunk.length >= 4096) { chunks.push(chunk); chunk = ""; }
  }
  return chunks.join("") + chunk;
}

function binaryLength(value: unknown): number {
  if (typeof value !== "string" || value.length > Math.ceil(maximumBytes / 3) * 4 || value.length % 4
    || /[^A-Za-z0-9+/=]/.test(value)) throw new Error("Invalid binary checkpoint encoding");
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  if (value.slice(0, value.length - padding).includes("=")
    || padding === 2 && (alphabet.indexOf(value[value.length - 3]!) & 15) !== 0
    || padding === 1 && (alphabet.indexOf(value[value.length - 2]!) & 3) !== 0) throw new Error("Noncanonical binary checkpoint encoding");
  return value.length / 4 * 3 - padding;
}

function decodeBytes(value: string): Uint8Array {
  const output = new Uint8Array(binaryLength(value));
  for (let index = 0, offset = 0; index < value.length; index += 4) {
    const a = alphabet.indexOf(value[index]!), b = alphabet.indexOf(value[index + 1]!);
    const c = alphabet.indexOf(value[index + 2]!), d = alphabet.indexOf(value[index + 3]!);
    output[offset++] = (a << 2) | (b >> 4);
    if (offset < output.length) output[offset++] = ((b & 15) << 4) | (c >> 2);
    if (offset < output.length) output[offset++] = ((c & 3) << 6) | d;
  }
  return output;
}

function jsonBytes(value: unknown): number {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("Checkpoint values must be JSON data or Uint8Array");
  return utf8ByteLength(encoded);
}
const storedBytes = (key: string, value: unknown) => utf8ByteLength(key) + (value instanceof Uint8Array ? value.byteLength : jsonBytes(value));
const entryBytes = ({ key, encoding, value }: RecordEntry) => utf8ByteLength(key)
  + (encoding === "uint8-base64" ? binaryLength(value) : jsonBytes(value));
const material = ({ schemaVersion, fileKey, records, quotaPressureBytes }: Checkpoint) => ({ schemaVersion, fileKey, records, quotaPressureBytes });

function validate(value: unknown, fileKey: string): Checkpoint {
  const checkpoint = value as Checkpoint | undefined;
  if (!checkpoint || checkpoint.schemaVersion !== 2 || checkpoint.fileKey !== fileKey || !Array.isArray(checkpoint.records)
    || checkpoint.records.length > maximumEntries || !Number.isInteger(checkpoint.quotaPressureBytes)
    || checkpoint.quotaPressureBytes < 0 || checkpoint.quotaPressureBytes > maximumBytes) throw new Error("Invalid or oversized file storage checkpoint");
  const keys = new Set<string>();
  let previousKey = "", total = checkpoint.quotaPressureBytes;
  for (const entry of checkpoint.records) {
    if (!entry || typeof entry.key !== "string" || entry.key.length > 500 || !owns(entry.key, fileKey)
      || entry.key === reserveKey(fileKey) || keys.has(entry.key) || entry.key <= previousKey
      || !["json", "uint8-base64"].includes(entry.encoding)) throw new Error("Checkpoint contains invalid, unordered, duplicate or foreign storage keys");
    keys.add(entry.key);
    previousKey = entry.key;
    total += entryBytes(entry);
    if (total > maximumBytes) throw new Error("Checkpoint exceeds the production storage budget");
  }
  if (checkpoint.digest !== hashValue(material(checkpoint))) throw new Error("Checkpoint digest does not match its contents");
  return checkpoint;
}

export async function capture(fileKey: string): Promise<Checkpoint> {
  const keys = (await figma.clientStorage.keysAsync()).sort();
  if (keys.length > maximumEntries) throw new Error("Too many storage entries");
  const records: RecordEntry[] = [];
  let quotaPressureBytes = 0, total = 0;
  for (const key of keys) {
    const value = await figma.clientStorage.getAsync(key);
    if (value === undefined) continue;
    const size = storedBytes(key, value);
    total += size;
    if (total > maximumBytes) throw new Error("File checkpoint exceeds the production storage budget");
    if (!owns(key, fileKey) || key === reserveKey(fileKey)) {
      if (key === reserveKey(fileKey) && !(value instanceof Uint8Array)) throw new Error("Invalid isolated QA quota reserve");
      // Export only the aggregate pressure; unrelated keys/content never leave storage.
      quotaPressureBytes += size;
    } else {
      records.push(value instanceof Uint8Array ? { key, encoding: "uint8-base64", value: encodeBytes(value) }
        : { key, encoding: "json", value });
    }
  }
  const checkpoint = { schemaVersion: 2 as const, fileKey, records, quotaPressureBytes };
  return { ...checkpoint, digest: hashValue(checkpoint) };
}

/** Called only after the wrapper proves an idle, isolated, exact-file QA identity. */
export async function restore(value: unknown, fileKey: string): Promise<{ digest: string; entries: number; bytes: number; quotaPressureBytes: number }> {
  const checked = validate(value, fileKey);
  // Freeze before yielding, and reconstruct the native binary type rather than JSON objects.
  const checkpoint = JSON.parse(JSON.stringify(checked)) as Checkpoint;
  const records = checkpoint.records.map((entry) => ({ key: entry.key,
    value: entry.encoding === "uint8-base64" ? decodeBytes(entry.value as string) : entry.value }));
  const currentKeys = await figma.clientStorage.keysAsync();
  if (currentKeys.length > maximumEntries) throw new Error("Too many storage entries");
  let retainedBytes = 0;
  for (const key of currentKeys.filter((key) => !owns(key, fileKey))) {
    const value = await figma.clientStorage.getAsync(key);
    if (value !== undefined) retainedBytes += storedBytes(key, value);
  }
  if (retainedBytes > checkpoint.quotaPressureBytes) throw new Error("Unrelated retained storage exceeds checkpoint pressure or shared storage budget");
  const reserveBytes = checkpoint.quotaPressureBytes - retainedBytes;
  const reserve = reserveKey(fileKey);
  if (reserveBytes > 0 && reserveBytes < utf8ByteLength(reserve)) throw new Error("The remaining quota pressure is too small for an exact reserve");
  if (currentKeys.filter((key) => !owns(key, fileKey)).length + records.length + (reserveBytes > 0 ? 1 : 0) > maximumEntries) throw new Error("Too many restored storage entries");
  const checkpointBytes = checkpoint.records.reduce((total, entry) => total + entryBytes(entry), checkpoint.quotaPressureBytes);
  // Only disposable isolated QA records are replaced; real unrelated records remain intact.
  for (const key of currentKeys.filter((key) => owns(key, fileKey))) await figma.clientStorage.deleteAsync(key);
  for (const entry of records) await figma.clientStorage.setAsync(entry.key, entry.value);
  if (reserveBytes > 0) await figma.clientStorage.setAsync(reserve, new Uint8Array(reserveBytes - utf8ByteLength(reserve)));
  const restored = await capture(fileKey);
  if (restored.digest !== checkpoint.digest || restored.records.length !== records.length) throw new Error("Storage restore verification failed; discard this benchmark attempt");
  return { digest: restored.digest, entries: records.length, bytes: checkpointBytes, quotaPressureBytes: checkpoint.quotaPressureBytes };
}
