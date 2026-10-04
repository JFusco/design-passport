import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { ReadinessReport } from "../core/contracts";
import { assertContract } from "../core/schema";
import { stableStringify } from "../core/stable";
import { CompanionError } from "./errors";

export interface HistoricalAuditExportV1 {
  schemaVersion: 1; kind: "historical-audit"; freshness: "historical";
  savedAt?: string;
  target: { scope: "file" } | { scope: "page"; pageId: string } | { scope: "selection"; nodeIds: string[] };
  provenance: { pluginVersion: string; knowledgeVersion: string };
  report: ReadinessReport;
}

export const IMPORT_LIMITS = {
  learning: { files: 10, file: 1_000_000, total: 5_000_000, request: 6_000_000 },
  audit: { files: 10, file: 10_000_000, total: 25_000_000, request: 26_000_000 },
} as const;
export type ImportKind = keyof typeof IMPORT_LIMITS;
export interface ImportInput { name: string; content: string }
export interface ImportFileResult { name: string; status: "imported" | "duplicate" | "invalid" | "retryable"; message: string }
export interface ImportBatchResult { files: ImportFileResult[]; imported: number; duplicates: number; invalid: number; retryable: number }

export function sha256(value: unknown): string { return createHash("sha256").update(stableStringify(value)).digest("hex"); }

export function validateInputSizes(inputs: ImportInput[], kind: ImportKind): void {
  const sizes = inputs.map((input) => Buffer.byteLength(input.content));
  validateSizes(sizes, kind);
}

function validateSizes(sizes: number[], kind: ImportKind): void {
  const cap = IMPORT_LIMITS[kind];
  if (!sizes.length || sizes.length > cap.files) throw new CompanionError("invalid-input", "Choose between 1 and 10 files.", 400);
  if (sizes.some((size) => size > cap.file) || sizes.reduce((sum, size) => sum + size, 0) > cap.total) throw new CompanionError("invalid-input", "The selected files exceed the upload byte limits.", 413);
}

export async function boundedBody(request: Request, limit: number): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length") ?? 0) > limit) throw new CompanionError("invalid-input", "The request exceeds the upload byte limit.", 413);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        void reader.cancel().catch(() => undefined);
        throw new CompanionError("invalid-input", "The request exceeds the upload byte limit.", 413);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof CompanionError) throw error;
    throw new CompanionError("invalid-input", "The upload was interrupted. Select the same files and retry.", 400);
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, total);
}

export async function multipartInputs(request: Request, kind: ImportKind): Promise<{ inputs: ImportInput[]; form: FormData }> {
  const bytes = await boundedBody(request, IMPORT_LIMITS[kind].request);
  let form: FormData;
  try { form = await new Response(bytes as BodyInit, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData(); }
  catch { throw new CompanionError("invalid-input", "The upload is incomplete or malformed. Retry the complete files.", 400); }
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  validateSizes(files.map((file) => file.size), kind);
  const inputs = await Promise.all(files.map(async (file) => ({ name: file.name, content: await file.text() })));
  return { inputs, form };
}

export async function readImportFiles(files: string[], kind: ImportKind): Promise<ImportInput[]> {
  if (!files.length || files.length > IMPORT_LIMITS[kind].files) throw new CompanionError("invalid-input", "Choose between 1 and 10 files.", 400);
  const result: ImportInput[] = [];
  let total = 0;
  for (const file of files) {
    const handle = await open(resolve(file), "r");
    try {
      const chunks: Buffer[] = [];
      let size = 0;
      for (;;) {
        const buffer = Buffer.alloc(64 * 1024);
        const { bytesRead } = await handle.read(buffer);
        if (!bytesRead) break;
        size += bytesRead; total += bytesRead;
        if (size > IMPORT_LIMITS[kind].file || total > IMPORT_LIMITS[kind].total) throw new CompanionError("invalid-input", "The selected files exceed the import byte limits.", 413);
        chunks.push(buffer.subarray(0, bytesRead));
      }
      result.push({ name: basename(file), content: Buffer.concat(chunks).toString("utf8") });
    } finally { await handle.close(); }
  }
  return result;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object");
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key))) throw new Error("Unexpected historical export property");
}
function nonempty(value: unknown): boolean { return typeof value === "string" && value.trim().length > 0; }

export function assertAudit(value: unknown): { report: ReadinessReport; source: ReadinessReport | HistoricalAuditExportV1 } {
  const object = record(value);
  if (object.kind === undefined) {
    assertContract("readiness-report", value);
    return { report: value as ReadinessReport, source: value as ReadinessReport };
  }
  exactKeys(object, ["schemaVersion", "kind", "freshness", "savedAt", "target", "provenance", "report"]);
  if (object.schemaVersion !== 1 || object.kind !== "historical-audit" || object.freshness !== "historical"
    || (object.savedAt !== undefined && (typeof object.savedAt !== "string" || !Number.isFinite(Date.parse(object.savedAt))))) throw new Error("Invalid historical envelope");
  const target = record(object.target);
  const provenance = record(object.provenance);
  exactKeys(provenance, ["pluginVersion", "knowledgeVersion"]);
  if (!nonempty(provenance.pluginVersion) || !nonempty(provenance.knowledgeVersion)) throw new Error("Invalid provenance");
  if (target.scope === "file") exactKeys(target, ["scope"]);
  else if (target.scope === "page") { exactKeys(target, ["scope", "pageId"]); if (!nonempty(target.pageId)) throw new Error("Invalid page target"); }
  else if (target.scope === "selection") {
    exactKeys(target, ["scope", "nodeIds"]);
    if (!Array.isArray(target.nodeIds) || !target.nodeIds.length || !target.nodeIds.every(nonempty) || new Set(target.nodeIds).size !== target.nodeIds.length) throw new Error("Invalid selection target");
  } else throw new Error("Invalid target scope");
  assertContract("readiness-report", object.report);
  const source = value as HistoricalAuditExportV1;
  if (source.report.target.scope !== target.scope) throw new Error("Historical target scope disagrees with report");
  return { report: source.report, source };
}

export function assertProjectScope(value: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,199}$/u.test(value)) throw new CompanionError("invalid-input", "Enter an explicit stable project scope using letters, numbers, colon, dot, underscore or hyphen.", 400);
}
