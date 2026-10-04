import { hashValue, utf8ByteLength } from "../../src/core/stable";

const maximumBytes = 4_000_000;
const maximumEntries = 10_000;
const prefixes = (fileKey: string) => ["audit", "context", "view"].map((kind) => `design-passport:cache:v1:${kind}:${hashValue(fileKey)}:`);
const owns = (key: string, fileKey: string) => prefixes(fileKey).some((prefix) => key.startsWith(prefix));
type RecordEntry = { key: string; value: unknown };
interface Checkpoint { schemaVersion: 1; fileKey: string; records: RecordEntry[]; digest: string }
const bytes = ({ key, value }: RecordEntry) => {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("Checkpoint values must be JSON data");
  return utf8ByteLength(key) + utf8ByteLength(encoded);
};

function validate(value: unknown, fileKey: string): Checkpoint {
  const checkpoint = value as Checkpoint | undefined;
  if (!checkpoint || checkpoint.schemaVersion !== 1 || checkpoint.fileKey !== fileKey || !Array.isArray(checkpoint.records)
    || checkpoint.records.length > maximumEntries) throw new Error("Invalid or oversized file storage checkpoint");
  const keys = new Set<string>();
  let previousKey = "";
  let total = 0;
  for (const entry of checkpoint.records) {
    if (!entry || typeof entry.key !== "string" || entry.key.length > 500 || !owns(entry.key, fileKey) || keys.has(entry.key) || entry.key <= previousKey) throw new Error("Checkpoint contains unordered, duplicate or foreign storage keys");
    keys.add(entry.key);
    previousKey = entry.key;
    total += bytes(entry);
    if (total > maximumBytes) throw new Error("Checkpoint exceeds the production storage budget");
  }
  const { schemaVersion, records } = checkpoint;
  if (checkpoint.digest !== hashValue({ schemaVersion, fileKey, records })) throw new Error("Checkpoint digest does not match its contents");
  return checkpoint;
}

export async function capture(fileKey: string): Promise<Checkpoint> {
  const keys = (await figma.clientStorage.keysAsync()).filter((key) => owns(key, fileKey)).sort();
  if (keys.length > maximumEntries) throw new Error("Too many file storage entries");
  const records: RecordEntry[] = [];
  let total = 0;
  for (const key of keys) {
    const value = await figma.clientStorage.getAsync(key);
    if (value === undefined) continue;
    const entry = { key, value };
    total += bytes(entry);
    if (total > maximumBytes) throw new Error("File checkpoint exceeds the production storage budget");
    records.push(entry);
  }
  const material = { schemaVersion: 1 as const, fileKey, records };
  return { ...material, digest: hashValue(material) };
}

/** Called only after the wrapper proves an idle, isolated, exact-file QA identity. */
export async function restore(value: unknown, fileKey: string): Promise<{ digest: string; entries: number; bytes: number }> {
  // Validate before any mutation; take an independent JSON copy before yielding.
  const checkpoint = validate(value, fileKey);
  const expectedDigest = checkpoint.digest;
  const records = JSON.parse(JSON.stringify(checkpoint.records)) as RecordEntry[];
  const currentKeys = await figma.clientStorage.keysAsync();
  let retainedBytes = 0;
  for (const key of currentKeys.filter((key) => !owns(key, fileKey))) {
    const value = await figma.clientStorage.getAsync(key);
    if (value !== undefined) retainedBytes += bytes({ key, value });
  }
  const checkpointBytes = records.reduce((total, entry) => total + bytes(entry), 0);
  if (retainedBytes + checkpointBytes > maximumBytes) throw new Error("Checkpoint would exceed the shared storage budget");
  // Only disposable isolated QA records are replaced; originals are inaccessible.
  for (const key of currentKeys.filter((key) => owns(key, fileKey))) await figma.clientStorage.deleteAsync(key);
  for (const entry of records) await figma.clientStorage.setAsync(entry.key, entry.value);
  const restored = await capture(fileKey);
  if (restored.digest !== expectedDigest || restored.records.length !== records.length) throw new Error("Storage restore verification failed; discard this benchmark attempt");
  return { digest: restored.digest, entries: records.length, bytes: checkpointBytes };
}
