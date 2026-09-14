import { gzipSync, gunzipSync } from "fflate";
import { validateContract } from "../core/schema";
import { hashValue, utf8ByteLength } from "../core/stable";
import type { CapturedAuditTarget } from "../figma/adapter";
import type { KnowledgeSummary } from "./messages";
import {
  canonicalAuditTargetKey,
  isAuditViewState,
  type AuditSaveStatus,
  type AuditViewState,
  type SavedAuditSummary,
  type SavedAuditV1,
  type SaveAuditInput,
} from "./audit-state";

export interface ClientStoragePort {
  getAsync(key: string): Promise<unknown>;
  setAsync(key: string, value: unknown): Promise<void>;
  deleteAsync(key: string): Promise<void>;
  keysAsync(): Promise<string[]>;
}

export interface AuditStorageOptions {
  /** Leave room below Figma's 5 MB quota for concurrent writes and bookkeeping. */
  maximumBytes?: number;
  maximumAudits?: number;
  now?: () => number;
  nonce?: () => string;
  onCodec?: (measurement: AuditCodecMeasurement) => void;
}

export interface AuditCodecMeasurement {
  operation: "compress" | "decompress";
  durationMs: number;
  compressedBytes: number;
  rawBytes: number;
}

const PREFIX = "design-passport:cache:v1:";
const AUDIT_PREFIX = `${PREFIX}audit:`;
const CONTEXT_PREFIX = `${PREFIX}context:`;
const VIEW_PREFIX = `${PREFIX}view:`;
const MAXIMUM_RAW_BYTES = 128 * 1024 * 1024;

interface StoredEntry {
  key: string;
  bytes: number;
  audit?: AuditMetadata;
  lastViewedAt?: string;
}

interface AuditMetadata {
  id: string;
  fileKey: string;
  targetKey: string;
  target: CapturedAuditTarget;
  savedAt: string;
  label: string;
  report: Pick<SavedAuditV1["report"], "generatedAt" | "grade">;
  checksum: number;
}

interface ViewRecord {
  schemaVersion: 1;
  lastViewedAt: string;
  viewState?: AuditViewState;
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function date(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function target(value: unknown): value is CapturedAuditTarget {
  const candidate = object(value);
  if (!candidate) return false;
  if (candidate.scope === "file") return true;
  if (candidate.scope === "page") return nonempty(candidate.pageId);
  return candidate.scope === "selection" && Array.isArray(candidate.nodeIds)
    && candidate.nodeIds.length > 0 && candidate.nodeIds.every(nonempty)
    && new Set(candidate.nodeIds).size === candidate.nodeIds.length;
}

function knowledge(value: unknown): value is KnowledgeSummary {
  const summary = object(value);
  if (!summary || typeof summary.complete !== "boolean" || typeof summary.cancelled !== "boolean"
    || !date(summary.builtAt) || !nonempty(summary.snapshotHash)) return false;
  if (!["pageCount", "loadedPageCount", "nodeCount", "componentCount", "instanceCount", "responsiveFamilyCount", "repeatedStructureGroupCount", "sourceFrameCount"]
    .every((key) => typeof summary[key] === "number" && Number.isFinite(summary[key]) && (summary[key] as number) >= 0)) return false;
  const rows = (key: string, valid: (row: Record<string, unknown>) => boolean) => Array.isArray(summary[key])
    && (summary[key] as unknown[]).every((item) => { const row = object(item); return row !== undefined && valid(row); });
  return rows("pages", (row) => nonempty(row.id) && typeof row.name === "string" && typeof row.role === "string" && typeof row.nodeCount === "number")
    && rows("patternInventory", (row) => typeof row.label === "string" && typeof row.kind === "string" && typeof row.definitions === "number" && typeof row.instances === "number")
    && rows("responsiveFamilies", (row) => typeof row.artifact === "string" && Array.isArray(row.breakpointNames) && row.breakpointNames.every((item) => typeof item === "string")
      && Array.isArray(row.widths) && row.widths.every((item) => typeof item === "number") && typeof row.hasCollision === "boolean")
    && rows("repeatedStructures", (row) => typeof row.signature === "string" && typeof row.occurrenceCount === "number")
    && rows("tokenCollections", (row) => typeof row.name === "string" && typeof row.remote === "boolean" && typeof row.variableCount === "number");
}

function savedAudit(value: unknown): value is SavedAuditV1 {
  const audit = object(value);
  if (!audit || audit.schemaVersion !== 1 || !nonempty(audit.id) || !nonempty(audit.fileKey)
    || !target(audit.target) || audit.targetKey !== canonicalAuditTargetKey(audit.target) || !date(audit.savedAt)
    || !validateContract("readiness-report", audit.report).valid || !validateContract("readiness-profile", audit.profile).valid
    || !Array.isArray(audit.plans) || !audit.plans.every((plan) => validateContract("change-plan", plan).valid)
    || !knowledge(audit.knowledge) || !Array.isArray(audit.insights)
    || !audit.insights.every((value) => {
      const insight = object(value);
      return insight && ["id", "origin", "sourceId", "domain", "title", "message", "factId"].every((key) => typeof insight[key] === "string")
        && (insight.targetNodeId === undefined || typeof insight.targetNodeId === "string");
    })) return false;
  const provenance = object(audit.provenance);
  const report = audit.report as SavedAuditV1["report"];
  return Boolean(provenance && nonempty(provenance.pluginVersion) && nonempty(provenance.knowledgeVersion))
    && report.target.scope === audit.target.scope && report.target.knowledgeSnapshotHash === audit.knowledge.snapshotHash
    && (audit.viewState === undefined || isAuditViewState(audit.viewState));
}

function viewRecord(value: unknown): value is ViewRecord {
  const view = object(value);
  return Boolean(view && view.schemaVersion === 1 && date(view.lastViewedAt)
    && (view.viewState === undefined || isAuditViewState(view.viewState)));
}

function recordCodec(onCodec: AuditStorageOptions["onCodec"], measurement: AuditCodecMeasurement): void {
  try { onCodec?.(measurement); } catch { /* Diagnostics must not affect saved results. */ }
}

/** Figma has no TextEncoder; fflate's fallback mishandles UTF-16 surrogate pairs. */
function encodeUtf8(value: string): Uint8Array {
  const bytes = new Uint8Array(utf8ByteLength(value));
  let offset = 0;
  for (let index = 0; index < value.length; index += 1) {
    let code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + next - 0xdc00;
        index += 1;
      } else code = 0xfffd;
    } else if (code >= 0xdc00 && code <= 0xdfff) code = 0xfffd;
    if (code < 0x80) bytes[offset++] = code;
    else if (code < 0x800) {
      bytes[offset++] = 0xc0 | (code >> 6);
      bytes[offset++] = 0x80 | (code & 0x3f);
    } else if (code < 0x10000) {
      bytes[offset++] = 0xe0 | (code >> 12);
      bytes[offset++] = 0x80 | ((code >> 6) & 0x3f);
      bytes[offset++] = 0x80 | (code & 0x3f);
    } else {
      bytes[offset++] = 0xf0 | (code >> 18);
      bytes[offset++] = 0x80 | ((code >> 12) & 0x3f);
      bytes[offset++] = 0x80 | ((code >> 6) & 0x3f);
      bytes[offset++] = 0x80 | (code & 0x3f);
    }
  }
  return bytes;
}

/** Invalid UTF-8 is cache corruption, rather than replacement text in a report. */
function decodeUtf8(bytes: Uint8Array): string {
  const chunks: string[] = [];
  let codes: number[] = [];
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index++]!;
    let code = first;
    let trailing = 0;
    let minimum = 0;
    if (first >= 0xc2 && first <= 0xdf) { code = first & 0x1f; trailing = 1; minimum = 0x80; }
    else if (first >= 0xe0 && first <= 0xef) { code = first & 0x0f; trailing = 2; minimum = 0x800; }
    else if (first >= 0xf0 && first <= 0xf4) { code = first & 0x07; trailing = 3; minimum = 0x10000; }
    else if (first >= 0x80) throw new Error("Invalid UTF-8 in the local cache");
    if (index + trailing > bytes.length) throw new Error("Truncated UTF-8 in the local cache");
    for (let count = 0; count < trailing; count += 1) {
      const next = bytes[index++]!;
      if ((next & 0xc0) !== 0x80) throw new Error("Invalid UTF-8 in the local cache");
      code = (code << 6) | (next & 0x3f);
    }
    if (code < minimum || code > 0x10ffff || code >= 0xd800 && code <= 0xdfff) throw new Error("Invalid UTF-8 in the local cache");
    if (code < 0x10000) codes.push(code);
    else {
      const pair = code - 0x10000;
      codes.push(0xd800 | (pair >> 10), 0xdc00 | (pair & 0x3ff));
    }
    if (codes.length >= 8_192) { chunks.push(String.fromCharCode(...codes)); codes = []; }
  }
  if (codes.length) chunks.push(String.fromCharCode(...codes));
  return chunks.join("");
}

function compress(value: unknown, onCodec?: AuditStorageOptions["onCodec"]): Uint8Array {
  const started = Date.now();
  const raw = encodeUtf8(JSON.stringify(value));
  if (raw.byteLength > MAXIMUM_RAW_BYTES) throw new Error("This audit is too large for the local cache");
  const output = gzipSync(raw, { level: 6, mtime: 0 });
  recordCodec(onCodec, { operation: "compress", durationMs: Date.now() - started, compressedBytes: output.byteLength, rawBytes: raw.byteLength });
  return output;
}

function decompress(value: unknown, onCodec?: AuditStorageOptions["onCodec"]): unknown {
  if (!(value instanceof Uint8Array) || value.byteLength < 18 || value[0] !== 31 || value[1] !== 139) return undefined;
  const end = value.byteLength;
  const rawBytes = ((value[end - 4] ?? 0) | ((value[end - 3] ?? 0) << 8) | ((value[end - 2] ?? 0) << 16) | ((value[end - 1] ?? 0) << 24)) >>> 0;
  if (rawBytes > MAXIMUM_RAW_BYTES) return undefined;
  try {
    const started = Date.now();
    const raw = gunzipSync(value);
    const parsed = raw.byteLength === rawBytes ? JSON.parse(decodeUtf8(raw)) : undefined;
    recordCodec(onCodec, { operation: "decompress", durationMs: Date.now() - started, compressedBytes: value.byteLength, rawBytes });
    return parsed;
  } catch {
    return undefined;
  }
}

function checksum(bytes: Uint8Array): number {
  let result = 0x811c9dc5;
  for (const byte of bytes) result = Math.imul(result ^ byte, 0x01000193);
  return result >>> 0;
}

/** A small uncompressed header keeps the history chooser independent of report size. */
function auditPacket(audit: SavedAuditV1, onCodec?: AuditStorageOptions["onCodec"]): Uint8Array {
  const body = compress(audit, onCodec);
  const metadata: AuditMetadata = {
    id: audit.id, fileKey: audit.fileKey, targetKey: audit.targetKey, target: audit.target, savedAt: audit.savedAt,
    label: label(audit), report: { generatedAt: audit.report.generatedAt, grade: audit.report.grade }, checksum: checksum(body),
  };
  const header = encodeUtf8(JSON.stringify(metadata));
  const packet = new Uint8Array(12 + header.byteLength + body.byteLength);
  packet.set([68, 80, 65, 49]);
  new DataView(packet.buffer).setUint32(4, header.byteLength, true);
  new DataView(packet.buffer).setUint32(8, checksum(header), true);
  packet.set(header, 12);
  packet.set(body, 12 + header.byteLength);
  return packet;
}

function packetParts(value: unknown): { metadata: AuditMetadata; body: Uint8Array } | undefined {
  if (!(value instanceof Uint8Array) || value.byteLength < 12 || value[0] !== 68 || value[1] !== 80 || value[2] !== 65 || value[3] !== 49) return undefined;
  const headerSize = new DataView(value.buffer, value.byteOffset, value.byteLength).getUint32(4, true);
  if (headerSize > 1_000_000 || headerSize + 12 >= value.byteLength) return undefined;
  try {
    const header = value.subarray(12, 12 + headerSize);
    if (checksum(header) !== new DataView(value.buffer, value.byteOffset, value.byteLength).getUint32(8, true)) return undefined;
    const metadata = object(JSON.parse(decodeUtf8(header)));
    const report = object(metadata?.report);
    const grade = object(report?.grade);
    if (!metadata || !nonempty(metadata.id) || !nonempty(metadata.fileKey) || !target(metadata.target)
      || metadata.targetKey !== canonicalAuditTargetKey(metadata.target) || !date(metadata.savedAt) || typeof metadata.label !== "string"
      || !date(report?.generatedAt) || !grade || !["A", "B", "C", "D", "F"].includes(String(grade.letter))
      || typeof grade.score !== "number" || !Number.isFinite(grade.score) || grade.score < 0 || grade.score > 100) return undefined;
    const body = value.subarray(12 + headerSize);
    if (metadata.checksum !== checksum(body)) return undefined;
    return { metadata: metadata as unknown as AuditMetadata, body };
  } catch {
    return undefined;
  }
}

function readAudit(value: unknown, onCodec?: AuditStorageOptions["onCodec"]): SavedAuditV1 | undefined {
  const parts = packetParts(value);
  if (!parts) return undefined;
  const audit = decompress(parts.body, onCodec);
  return savedAudit(audit) && audit.id === parts.metadata.id && audit.fileKey === parts.metadata.fileKey
    && audit.targetKey === parts.metadata.targetKey && audit.savedAt === parts.metadata.savedAt
    && audit.report.generatedAt === parts.metadata.report.generatedAt ? audit : undefined;
}

function storageBytes(key: string, value: unknown): number {
  if (value instanceof Uint8Array) return utf8ByteLength(key) + value.byteLength;
  try {
    return utf8ByteLength(key) + utf8ByteLength(JSON.stringify(value) ?? "null");
  } catch {
    // Unknown preexisting values must not make quota accounting optimistic.
    return 5_000_000;
  }
}

function filePrefix(prefix: string, fileKey: string): string {
  return `${prefix}${hashValue(fileKey)}:`;
}

function reportKey(fileKey: string, id: string): string {
  return `${filePrefix(AUDIT_PREFIX, fileKey)}${id}`;
}

function viewKey(fileKey: string, id: string): string {
  return `${filePrefix(VIEW_PREFIX, fileKey)}${id}`;
}

/** Newer completed audits win, including when an older asynchronous save arrives late. */
function compareAudits(left: Pick<AuditMetadata, "report" | "savedAt" | "id">, right: Pick<AuditMetadata, "report" | "savedAt" | "id">): number {
  return left.report.generatedAt.localeCompare(right.report.generatedAt)
    || left.savedAt.localeCompare(right.savedAt) || left.id.localeCompare(right.id);
}

function label(audit: SavedAuditV1): string {
  if (audit.target.scope === "file") return "Whole file";
  if (audit.target.scope === "page") {
    const pageId = audit.target.pageId;
    return audit.knowledge.pages.find((page) => page.id === pageId)?.name ?? audit.report.frames[0]?.pageName ?? "Saved page";
  }
  return audit.target.nodeIds.length === 1
    ? audit.report.frames[0]?.rootName ?? "Saved selection"
    : `${audit.target.nodeIds.length} selected frames or components`;
}

/**
 * Each report is an independent immutable record. A successful replacement is
 * discoverable before its predecessor is removed; there is no shared manifest
 * whose read/modify/write could lose another open plugin instance's results.
 */
export class AuditStorage {
  private readonly maximumBytes: number;
  private readonly maximumAudits: number;
  private readonly now: () => number;
  private readonly nonce: () => string;
  private readonly onCodec: AuditStorageOptions["onCodec"];
  private pending: Promise<unknown> = Promise.resolve();
  private sequence = 0;

  constructor(private readonly storage: ClientStoragePort, options: AuditStorageOptions = {}) {
    this.maximumBytes = options.maximumBytes ?? 4_000_000;
    this.maximumAudits = options.maximumAudits ?? 100;
    this.now = options.now ?? Date.now;
    this.nonce = options.nonce ?? (() => Math.random().toString(36).slice(2));
    this.onCodec = options.onCodec;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pending.then(operation, operation);
    this.pending = result.catch(() => undefined);
    return result;
  }

  private async entries(): Promise<StoredEntry[]> {
    const keys = await this.storage.keysAsync();
    const entries = await Promise.all(keys.map(async (key): Promise<StoredEntry | undefined> => {
      const value = await this.storage.getAsync(key);
      if (value === undefined) return undefined;
      const entry: StoredEntry = { key, bytes: storageBytes(key, value) };
      if (key.startsWith(AUDIT_PREFIX)) {
        const parsed = packetParts(value)?.metadata;
        if (parsed && reportKey(parsed.fileKey, parsed.id) === key) {
          entry.audit = parsed;
          const view = await this.storage.getAsync(viewKey(parsed.fileKey, parsed.id));
          entry.lastViewedAt = viewRecord(view) ? view.lastViewedAt : parsed.savedAt;
        }
      }
      return entry;
    }));
    return entries.filter((entry): entry is StoredEntry => entry !== undefined);
  }

  private async writeView(fileKey: string, id: string, value: ViewRecord): Promise<void> {
    const key = viewKey(fileKey, id);
    const entries = await this.entries();
    const previous = entries.find((entry) => entry.key === key);
    const used = entries.reduce((sum, entry) => sum + entry.bytes, 0);
    // Presentation preferences must never push the cache over budget or evict saved work.
    if (used - (previous?.bytes ?? 0) + storageBytes(key, value) > this.maximumBytes) return;
    await this.storage.setAsync(key, value);
  }

  private async deleteEntry(entry: StoredEntry): Promise<void> {
    await this.storage.deleteAsync(entry.key);
    if (entry.audit) await this.storage.deleteAsync(viewKey(entry.audit.fileKey, entry.audit.id));
  }

  private async makeRoom(entries: StoredEntry[], requiredBytes: number, protectedKeys: Set<string>, allowReportEviction: boolean): Promise<boolean> {
    let used = entries.reduce((sum, entry) => sum + entry.bytes, 0);
    if (used + requiredBytes <= this.maximumBytes) return true;
    const removable = entries.filter((entry) => !protectedKeys.has(entry.key)
      && (entry.key.startsWith(CONTEXT_PREFIX) || entry.key.startsWith(AUDIT_PREFIX) && (allowReportEviction || !entry.audit)))
      .sort((left, right) => Number(!left.key.startsWith(CONTEXT_PREFIX)) - Number(!right.key.startsWith(CONTEXT_PREFIX))
        || (left.lastViewedAt ?? "").localeCompare(right.lastViewedAt ?? "") || left.key.localeCompare(right.key));
    // Do not erase other history when even evicting everything eligible cannot fit the replacement.
    if (used - removable.reduce((sum, entry) => sum + entry.bytes, 0) + requiredBytes > this.maximumBytes) return false;
    for (const entry of removable) {
      await this.deleteEntry(entry);
      used -= entry.bytes;
      if (used + requiredBytes <= this.maximumBytes) return true;
    }
    return false;
  }

  async listAudits(fileKey: string): Promise<SavedAuditSummary[]> {
    await this.pending;
    const latest = new Map<string, StoredEntry>();
    for (const entry of await this.entries()) {
      const audit = entry.audit;
      if (!audit || audit.fileKey !== fileKey) continue;
      const previous = latest.get(audit.targetKey)?.audit;
      if (!previous || compareAudits(audit, previous) > 0) latest.set(audit.targetKey, entry);
    }
    return [...latest.values()].map(({ audit: value, lastViewedAt }) => {
      const audit = value as AuditMetadata;
      return { id: audit.id, target: audit.target, label: audit.label, generatedAt: audit.report.generatedAt, grade: audit.report.grade, lastViewedAt: lastViewedAt ?? audit.savedAt };
    }).sort((left, right) => right.lastViewedAt.localeCompare(left.lastViewedAt) || right.generatedAt.localeCompare(left.generatedAt) || right.id.localeCompare(left.id));
  }

  loadAudit(fileKey: string, id: string): Promise<SavedAuditV1 | undefined> {
    return this.enqueue(async () => {
      const audit = readAudit(await this.storage.getAsync(reportKey(fileKey, id)), this.onCodec);
      if (!audit || audit.fileKey !== fileKey || audit.id !== id) return undefined;
      const view = await this.storage.getAsync(viewKey(fileKey, id));
      if (viewRecord(view) && view.viewState) audit.viewState = view.viewState;
      // Reading a report must still succeed if storage is full or temporarily unavailable.
      await this.writeView(fileKey, id, {
        schemaVersion: 1, lastViewedAt: new Date(this.now()).toISOString(),
        ...(audit.viewState ? { viewState: audit.viewState } : {}),
      } satisfies ViewRecord).catch(() => undefined);
      return audit;
    });
  }

  saveAudit(input: SaveAuditInput): Promise<{ audit: SavedAuditV1; status: AuditSaveStatus }> {
    // Capture caller-owned values before queueing behind any asynchronous work.
    const captured = JSON.parse(JSON.stringify(input)) as SaveAuditInput;
    const now = this.now();
    const audit: SavedAuditV1 = {
      ...captured, schemaVersion: 1, id: `${now.toString(36)}-${(++this.sequence).toString(36)}-${this.nonce()}`,
      savedAt: new Date(now).toISOString(), targetKey: canonicalAuditTargetKey(captured.target),
    };
    return this.enqueue(async () => {
      try {
        if (!savedAudit(audit)) throw new Error("The completed audit could not be validated for local storage");
        const value = auditPacket(audit, this.onCodec);
        const key = reportKey(audit.fileKey, audit.id);
        const entries = await this.entries();
        const previous = entries.filter((entry) => entry.audit?.fileKey === audit.fileKey && entry.audit.targetKey === audit.targetKey);
        const newer = previous.find((entry) => entry.audit && compareAudits(entry.audit, audit) > 0)?.audit;
        if (newer) return { audit, status: { state: "not-saved", message: "A newer result for this target is already saved. This older result remains available for export." } };
        const protectedKeys = new Set(previous.map((entry) => entry.key));
        if (!await this.makeRoom(entries, storageBytes(key, value), protectedKeys, true)) {
          throw new Error("Local audit storage is full. The previous saved result has been kept; export this result to keep a copy.");
        }
        await this.storage.setAsync(key, value);
        // Cleanup cannot turn a successfully persisted report into an apparent failure.
        const retained = await this.prune(audit).catch(() => true);
        if (!retained) return { audit, status: { state: "not-saved", message: "A newer result for this target finished saving first. This older result remains available for export." } };
        return { audit, status: { state: "saved" } };
      } catch (error) {
        return { audit, status: { state: "not-saved", message: error instanceof Error ? error.message : "This result could not be saved locally. The previous saved result has been kept." } };
      }
    });
  }

  private async prune(saved: SavedAuditV1): Promise<boolean> {
    let entries = (await this.entries()).filter((entry) => entry.audit);
    if (entries.some((entry) => entry.audit?.fileKey === saved.fileKey && entry.audit.targetKey === saved.targetKey && compareAudits(entry.audit, saved) > 0)) {
      await this.storage.deleteAsync(reportKey(saved.fileKey, saved.id));
      return false;
    }
    for (const entry of entries) {
      if (entry.audit?.fileKey === saved.fileKey && entry.audit.targetKey === saved.targetKey && compareAudits(entry.audit, saved) < 0) await this.deleteEntry(entry);
    }
    entries = (await this.entries()).filter((entry) => entry.audit)
      .sort((left, right) => (left.lastViewedAt ?? "").localeCompare(right.lastViewedAt ?? "") || left.key.localeCompare(right.key));
    let excess = entries.length - this.maximumAudits;
    for (const entry of entries) {
      if (excess <= 0) break;
      if (entry.audit?.id === saved.id && entry.audit.fileKey === saved.fileKey) continue;
      await this.deleteEntry(entry);
      excess -= 1;
    }
    return true;
  }

  updateView(fileKey: string, id: string, viewState: AuditViewState): Promise<void> {
    const captured = { ...viewState };
    return this.enqueue(async () => {
      if (!isAuditViewState(captured)) throw new Error("Saved audit view preferences are invalid");
      const audit = packetParts(await this.storage.getAsync(reportKey(fileKey, id)))?.metadata;
      if (!audit || audit.fileKey !== fileKey || audit.id !== id) return;
      await this.writeView(fileKey, id, {
        schemaVersion: 1, lastViewedAt: new Date(this.now()).toISOString(), viewState: captured,
      } satisfies ViewRecord);
    });
  }

  forgetAudit(fileKey: string, id: string): Promise<void> {
    return this.enqueue(async () => {
      await this.storage.deleteAsync(reportKey(fileKey, id));
      await this.storage.deleteAsync(viewKey(fileKey, id));
    });
  }

  clearFile(fileKey: string): Promise<void> {
    return this.enqueue(async () => {
      const prefixes = [AUDIT_PREFIX, CONTEXT_PREFIX, VIEW_PREFIX].map((prefix) => filePrefix(prefix, fileKey));
      for (const key of await this.storage.keysAsync()) if (prefixes.some((prefix) => key.startsWith(prefix))) await this.storage.deleteAsync(key);
    });
  }

  async loadContext(fileKey: string, key: string): Promise<unknown | undefined> {
    await this.pending;
    const parsed = object(decompress(await this.storage.getAsync(`${filePrefix(CONTEXT_PREFIX, fileKey)}${hashValue(key)}`), this.onCodec));
    return parsed?.schemaVersion === 1 && parsed.fileKey === fileKey && parsed.key === key ? parsed.value : undefined;
  }

  saveContext(fileKey: string, key: string, value: unknown): Promise<void> {
    return this.saveContexts(fileKey, [{ key, value }]);
  }

  async saveContexts(fileKey: string, values: readonly { key: string; value: unknown }[]): Promise<void> {
    // Encode caller-owned snapshots before asynchronous work can change them.
    // Optional acceleration data may never displace saved reports.
    const candidates = new Map<string, Uint8Array>();
    for (const { key, value } of values) {
      try {
        candidates.set(`${filePrefix(CONTEXT_PREFIX, fileKey)}${hashValue(key)}`, compress({ schemaVersion: 1, fileKey, key, value }, this.onCodec));
      } catch {
        // A malformed or oversized fragment does not block other useful fragments.
      }
    }
    if (candidates.size === 0) return;
    try {
      await this.enqueue(async () => {
        // One clientStorage inventory for the entire flush avoids quadratic
        // bridge traffic when a large file contains hundreds of source roots.
        const ledger = new Map((await this.entries()).map((entry) => [entry.key, entry]));
        let used = [...ledger.values()].reduce((sum, entry) => sum + entry.bytes, 0);
        for (const [storageKey, compressed] of candidates) {
          const candidateBytes = storageBytes(storageKey, compressed);
          const previous = ledger.get(storageKey);
          const contexts = [...ledger.values()].filter((entry) => entry.key.startsWith(CONTEXT_PREFIX));
          const protectedBytes = used - contexts.reduce((sum, entry) => sum + entry.bytes, 0);
          if (protectedBytes + candidateBytes > this.maximumBytes) continue;
          for (const context of contexts) {
            if (used - (previous?.bytes ?? 0) + candidateBytes <= this.maximumBytes) break;
            if (context.key === storageKey) continue;
            await this.storage.deleteAsync(context.key);
            ledger.delete(context.key);
            used -= context.bytes;
          }
          if (used - (previous?.bytes ?? 0) + candidateBytes > this.maximumBytes) continue;
          try {
            await this.storage.setAsync(storageKey, compressed);
            used = used - (previous?.bytes ?? 0) + candidateBytes;
            ledger.set(storageKey, { key: storageKey, bytes: candidateBytes });
          } catch {
            // A concurrent writer can consume space after the inventory; leave
            // persisted reports untouched and continue on a best-effort basis.
          }
        }
      });
    } catch {
      // Failure to retain optional acceleration data must not fail a completed audit.
    }
  }
}
