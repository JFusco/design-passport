import type {
  DesignReferencePackV1,
  ReferenceDomainV1,
  ReferenceFactV1,
  ReviewSourceRoleV1,
  ReviewSourceV1,
} from "./contracts";
import { buildReferencePack } from "./knowledge-loop";
import { assertContract } from "./schema";
import { hashValue } from "./stable";

export interface ParsedFigmaSourceUrl {
  fileKey: string;
  nodeId?: string;
}

export interface ReviewSourceInput {
  sourceId: string;
  projectScope: string;
  role: ReviewSourceRoleV1;
  url: string;
  readinessProfile?: unknown;
  readinessProfilePath?: string;
  reportPath?: string;
}

export interface ReviewBatchInputV1 {
  projectScope: string;
  sources: ReviewSourceInput[];
}

export function parseFigmaSourceUrl(raw: string): ParsedFigmaSourceUrl {
  if (raw.length > 2_048) throw new Error("Figma URL exceeds 2,048 characters");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Source is not a valid URL");
  }
  if (url.protocol !== "https:") throw new Error("Figma source URL must use HTTPS");
  if (url.hostname !== "www.figma.com" && url.hostname !== "figma.com") throw new Error("Figma source URL must use the exact figma.com host");
  if (url.username || url.password) throw new Error("Figma source URL cannot contain credentials");
  if (url.port) throw new Error("Figma source URL cannot contain a port");
  if (url.hash) throw new Error("Figma source URL cannot contain a fragment");
  try {
    decodeURIComponent(url.pathname);
    decodeURIComponent(url.search);
  } catch {
    throw new Error("Figma source URL contains malformed encoding");
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if ((segments[0] !== "design" && segments[0] !== "file") || segments.length < 2 || segments.length > 3) {
    throw new Error("Only Figma design or file URLs are supported");
  }
  const fileKey = segments[1] ?? "";
  if (!/^[A-Za-z0-9_-]{8,128}$/u.test(fileKey)) throw new Error("Figma source URL contains an invalid file key");
  const nodeIdRaw = url.searchParams.get("node-id");
  const nodeId = nodeIdRaw?.trim();
  if (nodeId && !/^\d+(?::|-)\d+$/u.test(nodeId)) throw new Error("Figma source URL contains an invalid node id");
  return { fileKey, ...(nodeId ? { nodeId: nodeId.replace("-", ":") } : {}) };
}

export function validateReviewBatch(input: ReviewBatchInputV1): ReviewBatchInputV1 {
  if (!input || typeof input !== "object" || Object.keys(input).some((key) => !["projectScope", "sources"].includes(key))) throw new Error("Review batch contains unsupported fields");
  if (!/^[A-Za-z0-9._:-]{1,200}$/u.test(input.projectScope)) throw new Error("Project scope must be an opaque identifier");
  if (!Array.isArray(input.sources) || input.sources.length === 0 || input.sources.length > 50) throw new Error("A review batch requires between 1 and 50 sources");
  if (input.sources.filter((source) => source.role === "target").length === 0) throw new Error("A review batch requires at least one target source");
  if (input.sources.filter((source) => source.role === "style-guide").length > 1) throw new Error("A review batch permits at most one style-guide source");
  const sourceIds = new Set<string>();
  for (const source of input.sources) {
    if (!source || typeof source !== "object" || Object.keys(source).some((key) => !["sourceId", "projectScope", "role", "url", "readinessProfile", "readinessProfilePath", "reportPath"].includes(key))) {
      throw new Error("Review source contains unsupported fields");
    }
    if (!/^[A-Za-z0-9._:-]{1,200}$/u.test(source.sourceId)) throw new Error("Source IDs must be opaque identifiers");
    if (sourceIds.has(source.sourceId)) throw new Error(`Duplicate source ID: ${source.sourceId}`);
    sourceIds.add(source.sourceId);
    if (source.projectScope !== input.projectScope) throw new Error("Every source must declare the batch project scope");
    if (!(["target", "style-guide", "reference"] as const).includes(source.role)) throw new Error("Unsupported source role");
    parseFigmaSourceUrl(source.url);
    if (source.role === "target" && !source.readinessProfile && !source.readinessProfilePath) throw new Error(`Target ${source.sourceId} requires an explicit readiness profile`);
  }
  return input;
}

type FigmaNode = Record<string, unknown> & { children?: FigmaNode[] };

function walk(node: FigmaNode | undefined): FigmaNode[] {
  if (!node) return [];
  const output: FigmaNode[] = [];
  const stack = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    output.push(current);
    if (Array.isArray(current.children)) stack.push(...[...current.children].reverse());
  }
  return output;
}

function safeLabel(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const label = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim();
  if (!label || label.length > 120 || /https?:\/\//iu.test(label) || /\b\S+@\S+\.\S+\b/u.test(label)) return undefined;
  return label;
}

const GUIDANCE_DOMAINS = new Set<ReferenceDomainV1>(["tokens", "components", "naming", "layout", "breakpoints", "accessibility"]);

function declaredGuidanceFacts(nodes: FigmaNode[]): ReferenceFactV1[] {
  const seen = new Set<string>();
  const facts: ReferenceFactV1[] = [];
  for (const node of nodes) {
    const name = safeLabel(node.name);
    if (!name) continue;
    const match = /^Passport Guidance :: ([a-z-]+) :: ([^:]{1,80}) :: (.{1,240})$/u.exec(name);
    if (!match) continue;
    const domain = match[1] as ReferenceDomainV1;
    const label = match[2]?.trim();
    const guidance = match[3]?.trim();
    if (!GUIDANCE_DOMAINS.has(domain) || !label || !guidance) continue;
    const key = `${domain}\u0000${label}\u0000${guidance}`;
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push({
      factId: `fact:declared:${hashValue(key).slice(4)}`,
      domain,
      label,
      guidance,
      matcher: { kind: "informational" },
      provenance: "figma-derived",
    });
  }
  return facts.sort((left, right) => left.factId.localeCompare(right.factId));
}

function declaredBreakpointWidths(nodes: FigmaNode[]): number[] {
  return [...new Set(nodes.flatMap((node) => {
    const name = safeLabel(node.name);
    const match = name ? /^Passport Breakpoint :: [^:]{1,80} :: (\d{3,4})$/u.exec(name) : undefined;
    const width = match ? Number(match[1]) : Number.NaN;
    return Number.isFinite(width) && width >= 240 && width <= 4_000 ? [width] : [];
  }))].sort((left, right) => left - right);
}

function numericValues(nodes: FigmaNode[], field: string): number[] {
  return [...new Set(nodes.flatMap((node) => {
    const value = node[field];
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10_000 ? [value] : [];
  }))].sort((left, right) => left - right).slice(0, 40);
}

function hasBoundVariableReferences(nodes: FigmaNode[]): boolean {
  const hasReferences = (value: unknown): boolean => Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value as Record<string, unknown>).length > 0,
  );
  return nodes.some((node) => {
    if (hasReferences(node.boundVariables)) return true;
    return [node.fills, node.strokes, node.effects].some((value) => Array.isArray(value)
      && value.some((entry) => entry && typeof entry === "object" && hasReferences((entry as Record<string, unknown>).boundVariables)));
  });
}

export function referencePackFromFigmaRest(input: {
  sourceId: string;
  projectScope: string;
  role: "style-guide" | "reference";
  file: unknown;
  localVariables?: unknown;
  packVersion?: string;
  now?: Date;
}): DesignReferencePackV1 {
  const file = input.file && typeof input.file === "object" ? input.file as Record<string, unknown> : {};
  const document = file.document && typeof file.document === "object" ? file.document as FigmaNode : undefined;
  if (!document) throw new Error("Figma response is missing its document graph");
  const nodes = walk(document);
  const facts: ReferenceFactV1[] = declaredGuidanceFacts(nodes);
  const addNumeric = (domain: ReferenceDomainV1, field: "itemSpacing" | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft" | "cornerRadius" | "frameWidth", sourceField: string, label: string) => {
    const allowedValues = numericValues(nodes, sourceField);
    if (allowedValues.length === 0) return;
    facts.push({
      factId: `fact:${field}`,
      domain,
      label,
      guidance: `Use the documented ${label.toLocaleLowerCase("en-US")} values from this project style guide.`,
      matcher: { kind: "numeric-node-field", field, allowedValues },
      provenance: "figma-derived",
    });
  };
  addNumeric("layout", "itemSpacing", "itemSpacing", "Auto-layout gap");
  addNumeric("layout", "paddingTop", "paddingTop", "Top padding");
  addNumeric("layout", "paddingRight", "paddingRight", "Right padding");
  addNumeric("layout", "paddingBottom", "paddingBottom", "Bottom padding");
  addNumeric("layout", "paddingLeft", "paddingLeft", "Left padding");
  addNumeric("layout", "cornerRadius", "cornerRadius", "Corner radius");
  const inferredFrameWidths = [...new Set(nodes.flatMap((node) => {
    if (node.type !== "FRAME" || !node.absoluteBoundingBox || typeof node.absoluteBoundingBox !== "object") return [];
    const width = (node.absoluteBoundingBox as Record<string, unknown>).width;
    return typeof width === "number" && Number.isFinite(width) && width >= 240 && width <= 4_000 ? [width] : [];
  }))].sort((left, right) => left - right).slice(0, 40);
  const explicitFrameWidths = declaredBreakpointWidths(nodes);
  const frameWidths = explicitFrameWidths.length > 0 ? explicitFrameWidths : inferredFrameWidths;
  if (frameWidths.length > 0) facts.push({
    factId: "fact:frame-width",
    domain: "breakpoints",
    label: "Frame width",
    guidance: "Use a documented project breakpoint width for reviewable responsive specimens.",
    matcher: { kind: "numeric-node-field", field: "frameWidth", allowedValues: frameWidths },
    provenance: "figma-derived",
  });
  const componentIndex = file.components && typeof file.components === "object"
    ? Object.values(file.components as Record<string, unknown>).flatMap((entry) => entry && typeof entry === "object" ? [safeLabel((entry as Record<string, unknown>).name)].filter((value): value is string => Boolean(value)) : [])
    : [];
  const componentNames = [...new Set([
    ...nodes.flatMap((node) => node.type === "COMPONENT" || node.type === "COMPONENT_SET" || node.type === "INSTANCE" ? [safeLabel(node.name)].filter((value): value is string => Boolean(value)) : []),
    ...componentIndex,
  ])]
    .sort((left, right) => left.localeCompare(right)).slice(0, 100);
  if (componentNames.length > 0) facts.push({
    factId: "fact:component-names",
    domain: "components",
    label: "Component vocabulary",
    guidance: "Prefer the established component vocabulary when an equivalent project component exists.",
    matcher: { kind: "node-name", nodeTypes: ["COMPONENT", "COMPONENT_SET", "INSTANCE"], allowedValues: componentNames },
    provenance: "figma-derived",
  });
  const variableMeta = input.localVariables && typeof input.localVariables === "object"
    && (input.localVariables as Record<string, unknown>).meta
    && typeof (input.localVariables as Record<string, unknown>).meta === "object"
    ? (input.localVariables as Record<string, Record<string, unknown>>).meta ?? {}
    : {};
  const hasLocalVariableDetails = Object.values(variableMeta).some((value) => Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value as Record<string, unknown>).length > 0,
  ));
  const hasVariables = hasLocalVariableDetails || hasBoundVariableReferences(nodes);
  if (hasVariables) facts.push({
    factId: "fact:variables-present",
    domain: "tokens",
    label: "Project variables",
    guidance: "Prefer semantic variables defined by this project style guide over repeated literal values.",
    matcher: { kind: "informational" },
    provenance: "figma-derived",
  });
  const availableDomains = [...new Set(facts.map((fact) => fact.domain))].sort() as ReferenceDomainV1[];
  const warnings = [
    ...(!hasVariables ? ["Local variable details were unavailable from the Figma REST API."] : []),
    ...(!availableDomains.includes("accessibility") ? ["Accessibility conventions require documented Figma annotations and were not inferred."] : []),
    ...(!availableDomains.includes("naming") ? ["Layer naming conventions were not inferred from raw design copy."] : []),
  ];
  const sourceMaterial = {
    sourceId: input.sourceId,
    projectScope: input.projectScope,
    role: input.role,
    nodeCount: nodes.length,
    factIds: facts.map((fact) => fact.factId).sort(),
  };
  const source: ReviewSourceV1 = {
    schemaVersion: 1,
    sourceId: input.sourceId,
    projectScope: input.projectScope,
    role: input.role,
    contentDigest: hashValue(sourceMaterial),
    completeness: { complete: warnings.length === 0, availableDomains, warnings },
  };
  assertContract("review-source", source);
  return buildReferencePack({ packVersion: input.packVersion ?? "1.0.0", source, facts }, input.now);
}
