import { deflateSync, inflateSync, strFromU8 } from "fflate";
import { sha256 } from "../core/conductor-digest";
import { utf8ByteLength } from "../core/stable";
import { CompanionRequestError, ConductorAuthorizationError, type CompanionUpload, type ConductorCredentials } from "./conductor-transport";
import { encodeUtf8 } from "./utf8";

export type CompanionKind = "audit" | "learning";
export type CompanionSource = { kind: "audit" } | { kind: "learning"; digest: string };
export type CompanionCommand =
  | { type: "companion-open"; source?: CompanionSource }
  | { type: "companion-close" }
  | { type: "companion-check"; requestId: string }
  | { type: "companion-review-retry"; requestId: string }
  | { type: "companion-send"; reviewId: string; projectId: string; consent: true; retryId?: string };
type Project = { id: string; name: string };
interface Pending { requestId: string; projectId: string; kind: CompanionKind; digest: string }
interface Snapshot extends Pending { filename: string; bytes: number; savedAt: number }
interface PendingEntry { item: Pending; snapshot?: Snapshot }
interface Receipt { requestId: string; projectId: string; evidenceId: string }
export interface CompanionView {
  busy?: boolean;
  needsConnection?: boolean;
  environment?: string;
  message?: string;
  projects: Project[];
  pending: Array<{ requestId: string; projectId: string; kind: CompanionKind; matches: boolean; canReview: boolean }>;
  preview?: { reviewId: string; filename: string; bytes: number; kind: CompanionKind; retry?: { requestId: string; projectId: string } };
  receipt?: Receipt;
}

const endpoint = "/api/figma-plugin/v1/companion";
const limits = { audit: 10_000_000, learning: 1_000_000 };
// Figma gives the plugin 5 MB, and the existing audit cache budgets up to 4 MB.
const snapshotBudget = 750_000;
const snapshotMaxAge = 24 * 60 * 60 * 1_000;
const headerMaxBytes = 4_096;
const packetHeaderBytes = 8 + 64; // Format and size words, followed by the header digest.
const storagePrefix = "companion-send-v1:";
const packetVersion = 0x44504332; // DPC2
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const emptyView = (): CompanionView => ({ projects: [], pending: [] });
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const identity = ({ requestId, projectId, kind, digest }: Pending): Pending => ({ requestId, projectId, kind, digest });
function readPending(value: unknown): Pending | undefined {
  if (!record(value) || typeof value.requestId !== "string" || !uuid.test(value.requestId)
    || typeof value.projectId !== "string" || value.projectId.length === 0 || value.projectId.length > 512
    || value.kind !== "audit" && value.kind !== "learning"
    || typeof value.digest !== "string" || !/^[a-f0-9]{64}$/.test(value.digest)) return;
  return { requestId: value.requestId, projectId: value.projectId, kind: value.kind, digest: value.digest };
}

function snapshotPacket(key: string, snapshot: Snapshot, raw: Uint8Array): Uint8Array {
  const header = encodeUtf8(JSON.stringify({ key, ...snapshot }));
  const body = deflateSync(raw, { level: 6 });
  if (header.byteLength > headerMaxBytes || packetHeaderBytes + header.byteLength + body.byteLength + utf8ByteLength(key) > snapshotBudget) {
    throw new Error("This export cannot fit in local retry storage. Download the JSON to keep a copy.");
  }
  const packet = new Uint8Array(packetHeaderBytes + header.byteLength + body.byteLength);
  const format = new DataView(packet.buffer);
  format.setUint32(0, packetVersion);
  format.setUint32(4, header.byteLength);
  packet.set(encodeUtf8(sha256(header)), 8);
  packet.set(header, packetHeaderBytes);
  packet.set(body, packetHeaderBytes + header.byteLength);
  return packet;
}

function readSnapshot(key: string, value: Uint8Array): { snapshot: Snapshot; body: Uint8Array } | undefined {
  if (value.byteLength <= packetHeaderBytes || value.byteLength > snapshotBudget) return;
  const format = new DataView(value.buffer, value.byteOffset, value.byteLength);
  const headerBytes = format.getUint32(4);
  const contentOffset = packetHeaderBytes + headerBytes;
  if (format.getUint32(0) !== packetVersion || headerBytes > headerMaxBytes || contentOffset >= value.byteLength) return;
  try {
    const metadata = value.subarray(packetHeaderBytes, contentOffset);
    if (strFromU8(value.subarray(8, packetHeaderBytes)) !== sha256(metadata)) return;
    const header: unknown = JSON.parse(strFromU8(metadata));
    const item = readPending(header);
    if (!item || !record(header) || header.key !== key || !key.endsWith(":" + item.requestId)
      || typeof header.filename !== "string" || !header.filename
      || typeof header.bytes !== "number" || !Number.isSafeInteger(header.bytes) || header.bytes < 1 || header.bytes > limits[item.kind]
      || typeof header.savedAt !== "number" || !Number.isSafeInteger(header.savedAt)) return;
    return {
      snapshot: { ...item, filename: header.filename, bytes: header.bytes, savedAt: header.savedAt },
      body: value.subarray(contentOffset),
    };
  } catch {
    return;
  }
}

function readSnapshotContent(snapshot: Snapshot, body: Uint8Array): string {
  try {
    const raw = inflateSync(body, { out: new Uint8Array(snapshot.bytes + 1) });
    if (raw.byteLength === snapshot.bytes) {
      const content = typeof TextDecoder === "undefined" ? strFromU8(raw) : new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw);
      if (sha256(encodeUtf8(content)) === snapshot.digest) return content;
    }
  } catch {
    // Treat a damaged packet like a missing saved export. Its receipt can still be checked.
  }
  throw new Error("The saved export could not be verified. Check its receipt.");
}

function readReceipt(value: unknown, pending: Pick<Pending, "projectId" | "requestId">): Receipt {
  if (!record(value) || value.requestId !== pending.requestId || value.projectId !== pending.projectId
    || typeof value.evidenceId !== "string" || !uuid.test(value.evidenceId)) throw new Error("Companion returned an unrecognized receipt. Check the saved submission.");
  return { projectId: pending.projectId, requestId: pending.requestId, evidenceId: value.evidenceId };
}

export function createCompanionSend(deps: {
  connection(): Promise<ConductorCredentials | undefined>;
  environment(origin: string): string;
  storage: Pick<ClientStorageAPI, "getAsync" | "setAsync" | "deleteAsync" | "keysAsync">;
  open(): void;
  stop(): void;
  request(token: ConductorCredentials, path: string, upload?: CompanionUpload): Promise<unknown>;
  export(source: CompanionSource): Promise<{ filename: string; content: string }>;
  newId(): string;
  now?: () => number;
  present(view: CompanionView | undefined): void;
}) {
  const now = deps.now ?? Date.now;
  const expired = (snapshot: Snapshot) => {
    const age = now() - snapshot.savedAt;
    return age < 0 || age >= snapshotMaxAge;
  };
  let storageQueue: Promise<unknown> = Promise.resolve();
  const serializeStorage = <T>(action: () => Promise<T>) => {
    const result = storageQueue.then(action);
    storageQueue = result.catch(() => undefined);
    return result;
  };
  const storedPending = async (keyPrefix?: string) => {
    const entries: PendingEntry[] = [];
    let usedBytes = 0;
    for (const key of await deps.storage.keysAsync()) {
      const requestId = key.slice(key.lastIndexOf(":") + 1);
      if (!key.startsWith(storagePrefix) || !uuid.test(requestId)) continue;
      const value: unknown = await deps.storage.getAsync(key);
      const currentAccount = keyPrefix !== undefined && key === keyPrefix + requestId;
      if (value instanceof Uint8Array) {
        const stored = readSnapshot(key, value);
        if (!stored) {
          await deps.storage.deleteAsync(key);
          continue;
        }
        const item = identity(stored.snapshot);
        if (expired(stored.snapshot)) {
          await deps.storage.setAsync(key, item);
          if (currentAccount) entries.push({ item });
          continue;
        }
        usedBytes += utf8ByteLength(key) + value.byteLength;
        if (currentAccount) entries.push({ item, snapshot: stored.snapshot });
      } else if (currentAccount) {
        const item = readPending(value);
        if (item && key === keyPrefix + item.requestId) entries.push({ item });
      }
    }
    return { entries, usedBytes };
  };
  let generation = 0;
  let opened = false;
  let busy = false;
  let view = emptyView();
  let owner: ConductorCredentials | undefined;
  let preview: { source: CompanionSource; digest: string } | { retry: Snapshot } | undefined;
  let pending: PendingEntry[] = [];
  const sameConnection = (left: ConductorCredentials, right: ConductorCredentials) =>
    left.origin === right.origin && left.ownerUserId === right.ownerUserId && left.token === right.token;
  const close = () => {
    if (!opened) return;
    opened = false; generation++; busy = false; owner = undefined; preview = undefined; pending = []; view = emptyView();
    deps.stop(); deps.present(undefined);
  };
  const guard = (session: number) => { if (generation !== session) throw new Error("Companion closed."); };
  const prefix = (token: ConductorCredentials) => `${storagePrefix}${encodeURIComponent(token.origin)}:${encodeURIComponent(token.ownerUserId)}:`;
  const display = () => deps.present({
    ...view, busy,
    pending: pending.map(({ item: { requestId, projectId, kind, digest }, snapshot }) => ({
      requestId, projectId, kind,
      matches: preview !== undefined && "source" in preview && digest === preview.digest && kind === preview.source.kind,
      canReview: snapshot !== undefined && !expired(snapshot),
    })),
  });
  const loadExport = async (source: CompanionSource) => {
    const result = await deps.export(source);
    const bytes = utf8ByteLength(result.content);
    if (bytes > limits[source.kind]) throw new Error("This export exceeds the Companion file size limit.");
    const raw = encodeUtf8(result.content);
    return { ...result, bytes, raw, digest: sha256(raw) };
  };
  const committed = async (session: number, token: ConductorCredentials, item: Pending, raw: unknown) => {
    guard(session);
    const receipt = readReceipt(raw, item);
    await serializeStorage(async () => {
      // Release the export bytes before storing the receipt hint. The request ID
      // remains discoverable if the plugin closes between these writes.
      const key = prefix(token) + item.requestId;
      if (await deps.storage.getAsync(key) instanceof Uint8Array) await deps.storage.setAsync(key, item);
      await deps.storage.setAsync(prefix(token) + "latest", receipt);
      await deps.storage.deleteAsync(key);
    });
    guard(session);
    pending = pending.filter(entry => entry.item.requestId !== item.requestId);
    view.receipt = receipt;
    view.message = "Companion saved this submission.";
    delete view.preview;
    preview = undefined;
  };
  return {
    close,
    async prune() { await serializeStorage(() => storedPending()); },
    async handle(command: CompanionCommand) {
      if (command.type === "companion-close") { close(); return; }
      if (busy) return;
      if (command.type === "companion-open") {
        close(); opened = true; deps.open();
      }
      if (!opened) return;
      const session = generation;
      busy = true; delete view.message; display();
      try {
        const token = await deps.connection(); guard(session);
        if (!token || owner && !sameConnection(owner, token)) {
          view = { ...emptyView(), needsConnection: true, message: "Connect to Conductor and approve Companion contributions. Then return to this export." };
          pending = []; preview = undefined; owner = undefined; return;
        }
        if (command.type === "companion-open") {
          owner = token;
          view.environment = deps.environment(token.origin);
          const result = await deps.request(token, endpoint); guard(session);
          if (!record(result) || !Array.isArray(result.projects) || !result.projects.every(p => record(p) && typeof p.id === "string" && typeof p.name === "string")) throw new Error("Companion returned an invalid project list.");
          view.projects = result.projects.map(p => ({id: p.id, name: p.name}));
          const permitted = new Set(view.projects.map(p => p.id));
          const keyPrefix = prefix(token);
          const { entries } = await serializeStorage(() => storedPending(keyPrefix)); guard(session);
          pending = entries.filter(entry => permitted.has(entry.item.projectId));
          if (command.source) {
            const file = await loadExport(command.source); guard(session);
            preview = { source: command.source, digest: file.digest };
            view.preview = { kind: command.source.kind, filename: file.filename, bytes: file.bytes, reviewId: deps.newId() };
          } else {
            const latest: unknown = await deps.storage.getAsync(keyPrefix + "latest"); guard(session);
            if (record(latest) && typeof latest.projectId === "string" && permitted.has(latest.projectId)
              && typeof latest.requestId === "string" && uuid.test(latest.requestId) && typeof latest.evidenceId === "string" && uuid.test(latest.evidenceId)) {
              // A cached ID is a lookup hint. Current server access establishes the displayable receipt.
              const raw = await deps.request(token, endpoint + "?project=" + encodeURIComponent(latest.projectId) + "&receipt=" + latest.requestId); guard(session);
              view.receipt = readReceipt(raw, { projectId: latest.projectId, requestId: latest.requestId });
            }
          }
          return;
        }
        if (!owner) throw new Error("Open the Companion review before continuing.");
        if (command.type === "companion-check") {
          const item = pending.find(entry => entry.item.requestId === command.requestId)?.item;
          if (!item) throw new Error("Choose a pending submission from this account.");
          const raw = await deps.request(token, endpoint + "?project=" + encodeURIComponent(item.projectId) + "&receipt=" + item.requestId);
          await committed(session, token, item, raw);
          return;
        }
        if (command.type === "companion-review-retry") {
          const snapshot = pending.find(entry => entry.item.requestId === command.requestId)?.snapshot;
          if (!snapshot || expired(snapshot)) throw new Error("The saved export is no longer available. Check its receipt.");
          preview = { retry: snapshot };
          view.preview = { kind: snapshot.kind, filename: snapshot.filename, bytes: snapshot.bytes,
            reviewId: deps.newId(), retry: { requestId: snapshot.requestId, projectId: snapshot.projectId } };
          delete view.receipt;
          return;
        }
        if (!view.preview || !preview || command.reviewId !== view.preview.reviewId || command.consent !== true
          || !view.projects.some(project => project.id === command.projectId)) throw new Error("Review the export and choose a permitted destination before sending.");
        let item: Pending;
        let content: string;
        if ("retry" in preview) {
          const snapshot = preview.retry;
          if (command.retryId !== snapshot.requestId || command.projectId !== snapshot.projectId) throw new Error("Confirm the original submission and project.");
          const key = prefix(token) + snapshot.requestId;
          const value: unknown = await deps.storage.getAsync(key); guard(session);
          const stored = value instanceof Uint8Array ? readSnapshot(key, value) : undefined;
          if (!stored || expired(stored.snapshot) || JSON.stringify(stored.snapshot) !== JSON.stringify(snapshot)) {
            throw new Error("The saved export is no longer available. Check its receipt.");
          }
          item = identity(snapshot);
          content = readSnapshotContent(snapshot, stored.body);
        } else {
          const { source, digest } = preview;
          const file = await loadExport(source); guard(session);
          if (file.digest !== digest || file.filename !== view.preview.filename) throw new Error("This export changed. Close this review and preview it again.");
          const keyPrefix = prefix(token);
          item = await serializeStorage(async () => {
            const { entries, usedBytes } = await storedPending(keyPrefix); guard(session);
            pending = entries.filter(entry => view.projects.some(project => project.id === entry.item.projectId));
            const matches = pending.filter(({ item }) => item.projectId === command.projectId && item.kind === source.kind && item.digest === file.digest);
            const existing = matches.find(entry => entry.item.requestId === command.retryId);
            if (existing?.snapshot || !existing && (command.retryId || matches.length)) {
              throw new Error("Check the receipt or review the original submission to retry.");
            }
            const item = existing?.item ?? { projectId: command.projectId, kind: source.kind, digest: file.digest, requestId: deps.newId() };
            const key = keyPrefix + item.requestId;
            const snapshot = { ...item, filename: file.filename, bytes: file.bytes, savedAt: now() };
            const packet = snapshotPacket(key, snapshot, file.raw);
            if (usedBytes + utf8ByteLength(key) + packet.byteLength > snapshotBudget) {
              throw new Error("Local retry storage is full. Check your pending submissions or download the JSON to keep a copy.");
            }
            try {
              await deps.storage.setAsync(key, packet);
            } catch {
              throw new Error("Local retry storage could not save this export. It may be full. Download the JSON to keep a copy.");
            }
            guard(session);
            pending = [...pending.filter(entry => entry.item.requestId !== item.requestId), { item, snapshot }];
            return item;
          }); guard(session);
          content = file.content;
        }
        const current = await deps.connection(); guard(session);
        if (!current || !sameConnection(token, current)) throw new ConductorAuthorizationError("Your Conductor connection changed. Connect again to check the saved submission.");
        const raw = await deps.request(token, endpoint + "?project=" + encodeURIComponent(item.projectId), { requestId: item.requestId, kind: item.kind, content });
        await committed(session, token, item, raw);
      } catch (error) {
        if (session !== generation) return;
        view.message = error instanceof Error ? error.message : "Companion could not confirm the operation.";
        if (command.type === "companion-check" && error instanceof CompanionRequestError && error.status === 404) {
          const snapshot = pending.find(entry => entry.item.requestId === command.requestId)?.snapshot;
          view.message = snapshot && !expired(snapshot)
            ? "No receipt is available yet. Review the saved export to retry."
            : "No receipt is available yet. You can retry if you still have the original export.";
        }
        if (error instanceof ConductorAuthorizationError || error instanceof CompanionRequestError && error.status === 403) {
          view = { ...emptyView(), needsConnection: true, message: error.message };
          pending = []; preview = undefined;
        }
      } finally {
        if (session === generation) { busy = false; display(); }
      }
    },
  };
}
