import type { NodeSnapshot } from "../core/contracts";
import { hashValue } from "../core/stable";

/** The storage implementation supplies file isolation, byte limits and eviction. */
export interface ContextCachePort {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export interface KnowledgeBuildDiagnostics {
  totalMs: number;
  pageLoadingMs: number;
  validationMs: number;
  captureMs: number;
  inferenceMs: number;
  devResourcesMs: number;
  componentsMs: number;
  variablesMs: number;
  derivedMs: number;
  reusedFragments: number;
  capturedFragments: number;
  reusedNodes: number;
  capturedNodes: number;
  cacheReadFailures: number;
  cacheWriteFailures: number;
  inferenceNodes: number;
}

export function newBuildDiagnostics(): KnowledgeBuildDiagnostics {
  return { totalMs: 0, pageLoadingMs: 0, validationMs: 0, captureMs: 0, inferenceMs: 0, devResourcesMs: 0, componentsMs: 0, variablesMs: 0, derivedMs: 0, reusedFragments: 0, capturedFragments: 0, reusedNodes: 0, capturedNodes: 0, cacheReadFailures: 0, cacheWriteFailures: 0, inferenceNodes: 0 };
}

interface ContextFragment {
  schemaVersion: 1;
  fingerprint: string;
  nodes: NodeSnapshot[];
  digest: string;
}

/** Never persist the opaque Figma inference or external enrichment as reusable evidence. */
export function baseSnapshot(snapshot: NodeSnapshot): NodeSnapshot {
  const clone = JSON.parse(JSON.stringify(snapshot)) as NodeSnapshot;
  clone.inferredBindings = {};
  clone.fills.forEach((paint) => { paint.inferredVariableIds = []; });
  clone.strokes.forEach((paint) => { paint.inferredVariableIds = []; });
  if (clone.layout) clone.layout.inferredAvailable = false;
  if (clone.type === "INSTANCE") clone.instance = { detached: false };
  clone.devResourceCount = 0;
  clone.descendantCount = 0;
  delete clone.contentSignature;
  return clone;
}

export function contextFragment(fingerprint: string, nodes: readonly NodeSnapshot[]): ContextFragment {
  const base = { schemaVersion: 1 as const, fingerprint, nodes: nodes.map(baseSnapshot) };
  return { ...base, digest: hashValue(base) };
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Cache contents are optional and untrusted; corruption is a miss, not an audit failure. */
export function readContextFragment(value: unknown, fingerprint: string, ids: readonly string[]): NodeSnapshot[] | undefined {
  try {
    if (!record(value) || value.schemaVersion !== 1 || value.fingerprint !== fingerprint || typeof value.digest !== "string" || !Array.isArray(value.nodes) || value.nodes.length !== ids.length) return undefined;
    const base = { schemaVersion: 1, fingerprint: value.fingerprint, nodes: value.nodes };
    if (hashValue(base) !== value.digest) return undefined;
    for (const [index, candidate] of value.nodes.entries()) {
      if (!record(candidate) || candidate.id !== ids[index] || typeof candidate.type !== "string" || typeof candidate.name !== "string" || typeof candidate.pageId !== "string" || typeof candidate.rootId !== "string" || typeof candidate.path !== "string" || typeof candidate.visible !== "boolean") return undefined;
      if (!["width", "height", "x", "y", "opacity", "rotation"].every((field) => typeof candidate[field] === "number" && Number.isFinite(candidate[field]))) return undefined;
      if (!["childIds", "fills", "strokes", "effects", "boundFields", "exportSettings"].every((field) => Array.isArray(candidate[field])) || !record(candidate.boundVariableIds) || !record(candidate.inferredBindings)) return undefined;
    }
    // Clone before enrichment so a port returning shared object references cannot
    // accidentally mutate the saved baseline during a cancelled attempt.
    return (JSON.parse(JSON.stringify(value.nodes)) as NodeSnapshot[]).map(baseSnapshot);
  } catch {
    return undefined;
  }
}

/** Bounded asynchronous reads preserve input ordering and stop scheduling on cancellation. */
export async function mapConcurrent<T, R>(values: readonly T[], concurrency: number, run: (value: T) => Promise<R>, cancelled: () => boolean = () => false): Promise<Array<R | undefined>> {
  const output = new Array<R | undefined>(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), values.length) }, async () => {
    while (!cancelled()) {
      const index = next++;
      if (index >= values.length) return;
      output[index] = await run(values[index]!);
    }
  }));
  return output;
}

export interface RestPageFingerprint {
  roots: Map<string, Record<string, unknown>>;
  metadata: unknown;
}

/** Accept the documented node-export shape and the equivalent REST nodes envelope. */
export function restPageFingerprint(value: unknown, pageId: string): RestPageFingerprint | undefined {
  if (!record(value)) return undefined;
  let exported = value;
  if (!record(exported.document) && record(exported.nodes) && record(exported.nodes[pageId])) exported = exported.nodes[pageId];
  if (!record(exported.document) || exported.document.id !== pageId || !Array.isArray(exported.document.children)) return undefined;
  const roots = new Map<string, Record<string, unknown>>();
  for (const root of exported.document.children) {
    if (!record(root) || typeof root.id !== "string" || roots.has(root.id)) return undefined;
    roots.set(root.id, root);
  }
  const { document: _document, ...metadata } = exported;
  return { roots, metadata };
}

export function restSubtreeNodes(root: Record<string, unknown>): Map<string, Record<string, unknown>> {
  const output = new Map<string, Record<string, unknown>>();
  const pending: unknown[] = [root];
  while (pending.length > 0) {
    const item = pending.pop();
    if (!record(item) || typeof item.id !== "string" || output.has(item.id)) continue;
    output.set(item.id, item);
    if (Array.isArray(item.children)) pending.push(...item.children);
  }
  return output;
}

/** Missing optional arrays are checked through the live supplement instead. */
export function restSubtreeCovers(root: Record<string, unknown>, entries: readonly { node: SceneNode }[]): boolean {
  const exported = new Map<string, Record<string, unknown>>();
  const stack: unknown[] = [root];
  while (stack.length) {
    const item = stack.pop();
    if (!record(item) || typeof item.id !== "string" || exported.has(item.id)) return false;
    exported.set(item.id, item);
    if (Array.isArray(item.children)) stack.push(...item.children);
  }
  return entries.every(({ node }) => {
    const raw = exported.get(node.id);
    if (!raw || raw.type !== node.type || raw.name !== node.name) return false;
    for (const field of ["fills", "strokes", "effects", "exportSettings"] as const) {
      if (raw[field] !== undefined && !Array.isArray(raw[field])) return false;
    }
    return node.type !== "TEXT" || typeof raw.characters === "string";
  });
}
