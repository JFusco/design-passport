import type { DesignReferencePackV1 } from "../core/contracts";
import { parseFigmaSourceUrl, referencePackFromFigmaRest } from "../core/review-source";
import { CompanionError } from "./errors";

const FIGMA_RESPONSE_LIMIT = 25_000_000;
const FIGMA_TIMEOUT_MS = 30_000;

export interface FigmaSourceResult {
  file: Record<string, unknown>;
  localVariables?: Record<string, unknown>;
  variableWarning?: string;
}

export interface ReferencePackInput {
  url: string;
  sourceId: string;
  projectScope: string;
  role: "style-guide" | "reference";
  packVersion?: string;
}

async function responseTextWithinLimit(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > FIGMA_RESPONSE_LIMIT) throw new CompanionError("upstream", "Figma returned more than the 25 MB limit.", 502);
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > FIGMA_RESPONSE_LIMIT) {
        await reader.cancel();
        throw new CompanionError("upstream", "Figma returned more than the 25 MB limit.", 502);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

export async function figmaFetchJson(
  token: string,
  fileKey: string,
  endpoint = "",
  transport: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  if (!token) throw new CompanionError("not-configured", "Add FIGMA_TOKEN to generate a reference pack.", 503);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FIGMA_TIMEOUT_MS);
  try {
    const response = await transport(`https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}${endpoint}`, {
      headers: { "X-Figma-Token": token, Accept: "application/json" },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new CompanionError("upstream", `Figma returned HTTP ${response.status}.`, 502);
    const text = await responseTextWithinLimit(response);
    try { return JSON.parse(text) as Record<string, unknown>; }
    catch { throw new CompanionError("upstream", "Figma returned an invalid response.", 502); }
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFigmaSource(
  rawUrl: string,
  includeVariables: boolean,
  token: string,
  transport: typeof fetch = fetch,
): Promise<FigmaSourceResult> {
  const { fileKey } = parseFigmaSourceUrl(rawUrl);
  const file = await figmaFetchJson(token, fileKey, "", transport);
  if (!includeVariables) return { file };
  try {
    return { file, localVariables: await figmaFetchJson(token, fileKey, "/variables/local", transport) };
  } catch (error) {
    return { file, variableWarning: error instanceof Error ? error.message : "Local variable details were unavailable." };
  }
}

export async function createReferencePack(
  input: ReferencePackInput,
  token: string,
  transport: typeof fetch = fetch,
): Promise<{ pack: DesignReferencePackV1; warnings: string[] }> {
  if (!/^[A-Za-z0-9._:-]{1,200}$/u.test(input.sourceId)) {
    throw new CompanionError("invalid-input", "Source name must use letters, numbers, dots, underscores, colons, or hyphens.", 400);
  }
  if (!/^[A-Za-z0-9._:-]{1,200}$/u.test(input.projectScope)) {
    throw new CompanionError("invalid-input", "Project must use letters, numbers, dots, underscores, colons, or hyphens.", 400);
  }
  if (input.role !== "style-guide" && input.role !== "reference") throw new CompanionError("invalid-input", "Choose style guide or reference.", 400);
  const fetched = await fetchFigmaSource(input.url, true, token, transport);
  const pack = referencePackFromFigmaRest({
    sourceId: input.sourceId,
    projectScope: input.projectScope,
    role: input.role,
    file: fetched.file,
    localVariables: fetched.localVariables,
    packVersion: input.packVersion ?? "1.0.0",
  });
  const warnings = [...pack.source.completeness.warnings];
  if (fetched.variableWarning && !warnings.some((warning) => /variable/iu.test(warning))) warnings.unshift(fetched.variableWarning);
  return { pack, warnings: [...new Set(warnings)] };
}
