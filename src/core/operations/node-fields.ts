import type {
  BindableField,
  DesignKnowledgeGraph,
  JsonValue,
  NodeSnapshot,
  ReadinessProfile,
  TokenCoverageDisposition,
  TokenCoverageField,
  TokenCoverageGroup,
  TokenCoverageReason,
  TokenCoverageSummary,
  VariableCandidate,
} from "../contracts";
import { collectDescendants } from "./graph";
import { isSemanticVariableName } from "./semantic-variable";

export { isSemanticVariableName } from "./semantic-variable";

export const CODE_RELEVANT_FIELDS: readonly BindableField[] = [
  "fills",
  "strokes",
  "cornerRadius",
  "itemSpacing",
  "counterAxisSpacing",
  "gridRowGap",
  "gridColumnGap",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "opacity",
  "strokeWeight",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "paragraphSpacing",
  "paragraphIndent",
];

export interface BindingCoverage {
  eligible: number;
  bound: number;
  coverage: number;
}

export const TYPOGRAPHY_FIELDS: readonly BindableField[] = [
  "fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent",
];

export interface PropertyAssessment {
  eligible: boolean;
  repairable: boolean;
  reason?: "not-owner" | "not-rendered" | "inert-default" | "unresolved-style" | "mixed" | "unsupported-unit";
}

function renderedPaint(paint: NodeSnapshot["fills"][number]): boolean {
  return paint.visible && paint.opacity > 0;
}

function numericValues(node: NodeSnapshot, field: BindableField): number[] {
  if (field === "cornerRadius" && node.cornerRadii) return Object.values(node.cornerRadii);
  if (field === "strokeWeight" && node.strokeWeights) return Object.values(node.strokeWeights);
  const value = rawFieldValue(node, field);
  return typeof value === "number" ? [value] : [];
}

export function hasRenderedStroke(node: NodeSnapshot): boolean {
  return node.visible && node.opacity > 0 && numericValues(node, "strokeWeight").some((value) => value > 0)
    && node.strokes.some(renderedPaint);
}

/** One ownership and rendering policy for grading, recommendations and live repairs. */
export function assessTokenProperty(node: NodeSnapshot, field: BindableField): PropertyAssessment {
  const exclude = (reason: PropertyAssessment["reason"]): PropertyAssessment => ({ eligible: false, repairable: false, ...(reason ? { reason } : {}) });
  if (!CODE_RELEVANT_FIELDS.includes(field) || (TYPOGRAPHY_FIELDS.includes(field) && (node.type !== "TEXT" || !node.text))) return exclude("not-owner");
  if (!node.visible || node.renderVisible === false || node.opacity <= 0 || node.evidenceRole === "instance-descendant") return exclude("not-rendered");
  if (TYPOGRAPHY_FIELDS.includes(field)) {
    if (node.text?.mixedFields?.includes(field) || node.text?.style?.status === "mixed") return exclude("mixed");
    if (node.text?.style?.status === "unavailable" && !node.boundFields.includes(field)) return exclude("unresolved-style");
  }
  if (field === "fills" || field === "strokes") {
    const visible = node[field].filter(renderedPaint);
    if (field === "strokes" && !hasRenderedStroke(node)) return exclude("not-rendered");
    if (!visible.some((paint) => paint.type === "SOLID")) return exclude("not-rendered");
    return { eligible: true, repairable: visible.length === 1 && visible[0]?.type === "SOLID" };
  }
  if (field === "cornerRadius" && !node.fills.some(renderedPaint) && !hasRenderedStroke(node) && !node.clipsContent && !node.layout?.clipsContent && !node.isMask) return exclude("not-rendered");
  if (field === "strokeWeight" && !hasRenderedStroke(node)) return exclude("not-rendered");
  if (["itemSpacing", "counterAxisSpacing", "gridRowGap", "gridColumnGap", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].includes(field)
    && (!node.layout || node.layout.mode === "NONE")) return exclude("not-owner");
  if ((field === "gridRowGap" || field === "gridColumnGap") && node.layout?.mode !== "GRID") return exclude("not-owner");
  if ((field === "itemSpacing" || field === "counterAxisSpacing") && node.layout?.mode === "GRID") return exclude("not-owner");
  if (field === "opacity" && node.opacity === 1) return exclude("inert-default");
  if (field === "lineHeight" && node.text?.lineHeight?.unit === "AUTO") return exclude("unsupported-unit");
  const value = rawFieldValue(node, field);
  const numbers = numericValues(node, field);
  if (numbers.length > 0 && numbers.every((item) => item === 0)) return exclude("inert-default");
  if (value === undefined && numbers.length === 0) return exclude("not-owner");
  if (numbers.length > 1 && new Set(numbers).size > 1) return { eligible: true, repairable: false, reason: "mixed" };
  // A variable binding would normalize percentage/auto typography to a different
  // unit. Retain its evidence, but never silently propose that semantic change.
  if ((field === "letterSpacing" && node.text?.letterSpacing?.unit !== undefined && node.text.letterSpacing.unit !== "PIXELS")
    || (field === "lineHeight" && node.text?.lineHeight?.unit !== undefined && node.text.lineHeight.unit !== "PIXELS")) {
    return exclude("unsupported-unit");
  }
  return { eligible: true, repairable: true };
}

export function eligibleTokenFields(node: NodeSnapshot): BindableField[] {
  return CODE_RELEVANT_FIELDS.filter((field) => assessTokenProperty(node, field).eligible);
}

export function propertyBindingEvidence(node: NodeSnapshot, field: BindableField): "variable" | "text-style" | undefined {
  if (!assessTokenProperty(node, field).eligible) return undefined;
  if (node.boundFields.includes(field)) {
    if (field === "fills" || field === "strokes") {
      if (node[field].filter((paint) => renderedPaint(paint) && paint.type === "SOLID").every((paint) => Boolean(paint.boundVariableId))) return "variable";
    } else if (field === "cornerRadius" && node.cornerRadii && node.boundGeometryFields) {
      const keys = { topLeft: "topLeftRadius", topRight: "topRightRadius", bottomLeft: "bottomLeftRadius", bottomRight: "bottomRightRadius" };
      if (node.boundGeometryFields.includes("cornerRadius") || Object.entries(node.cornerRadii).every(([side, value]) => value === 0 || node.boundGeometryFields?.includes(keys[side as keyof typeof keys]))) return "variable";
    } else if (field === "strokeWeight" && node.strokeWeights && node.boundGeometryFields) {
      const keys = { top: "strokeTopWeight", right: "strokeRightWeight", bottom: "strokeBottomWeight", left: "strokeLeftWeight" };
      if (node.boundGeometryFields.includes("strokeWeight") || Object.entries(node.strokeWeights).every(([side, value]) => value === 0 || node.boundGeometryFields?.includes(keys[side as keyof typeof keys]))) return "variable";
    } else return "variable";
  }
  if (node.type === "TEXT" && node.text?.style?.status === "resolved" && node.text.style.controlledFields.includes(field)) return "text-style";
  return undefined;
}

export function bindingCoverage(nodes: readonly NodeSnapshot[]): BindingCoverage {
  const summary = tokenCoverageSummary(nodes);
  const eligible = summary.applicable;
  const bound = summary.counts.bound + summary.counts.inherited;
  return { eligible, bound, coverage: summary.coverage ?? 100 };
}

function normalizedField(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLocaleLowerCase("en-US");
}

const SCALE_SENSITIVE_FIELDS = new Set<TokenCoverageField>([
  "cornerRadius", "itemSpacing", "counterAxisSpacing", "gridRowGap", "gridColumnGap",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "strokeWeight",
  "fontSize", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent", "effects",
]);

function overrideAffectsField(overrides: readonly string[], field: TokenCoverageField): boolean {
  const normalized = new Set(overrides.map(normalizedField));
  if (normalized.has("boundvariables")) return true;
  const related = field === "fills" ? ["fills", "fillstyleid"]
    : field === "strokes" ? ["strokes", "strokestyleid"]
      : field === "effects" ? ["effects", "effectstyleid"]
        : field === "cornerRadius" ? ["cornerradius", "topleftradius", "toprightradius", "bottomleftradius", "bottomrightradius"]
          : field === "strokeWeight" ? ["strokeweight", "stroketopweight", "strokerightweight", "strokebottomweight", "strokeleftweight"]
            : field === "fontFamily" || field === "fontStyle" || field === "fontWeight"
              ? [normalizedField(field), "fontname", "textstyleid"]
              : TYPOGRAPHY_FIELDS.includes(field as BindableField) ? [normalizedField(field), "textstyleid"]
              : [normalizedField(field)];
  return related.some((candidate) => normalized.has(candidate));
}

function isInheritedInstanceField(node: NodeSnapshot, field: TokenCoverageField): boolean {
  const evidence = node.evidenceRole === "instance-descendant" ? node.instanceEvidence : node.instance;
  if (!evidence || evidence.overridesKnown !== true || ("detached" in evidence && evidence.detached)) return false;
  if (evidence.scaleFactor !== undefined && evidence.scaleFactor !== 1 && SCALE_SENSITIVE_FIELDS.has(field)) return false;
  return !overrideAffectsField(evidence.directOverrideFields ?? [], field);
}

function fieldIsPresent(node: NodeSnapshot, field: BindableField): boolean {
  if (node.boundFields.includes(field) || (node.boundVariableIds[field]?.length ?? 0) > 0) return true;
  if (field === "letterSpacing") return Boolean(node.text?.letterSpacing);
  if (field === "lineHeight") return Boolean(node.text?.lineHeight);
  return rawFieldValue(node, field) !== undefined;
}

function assessIgnoringInstanceOwnership(node: NodeSnapshot, field: BindableField): PropertyAssessment {
  if (node.evidenceRole !== "instance-descendant") return assessTokenProperty(node, field);
  const { evidenceRole: _evidenceRole, ...owned } = node;
  return assessTokenProperty(owned, field);
}

export interface TokenCoverageOptions {
  documentationScaffoldNodeIds?: ReadonlySet<string>;
  sampleLimit?: number;
}

export function documentationScaffoldNodeIds(
  graph: Pick<DesignKnowledgeGraph, "pages">,
  root: NodeSnapshot,
  nodes: readonly NodeSnapshot[],
): ReadonlySet<string> {
  const page = graph.pages.find((candidate) => candidate.id === root.pageId);
  if (page?.role !== "components" || root.type !== "FRAME") return new Set<string>();
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const output = new Set<string>();
  for (const node of nodes) {
    let current: NodeSnapshot | undefined = node;
    let componentOwned = false;
    while (current) {
      if (current.component) { componentOwned = true; break; }
      current = current.parentId ? nodesById.get(current.parentId) : undefined;
    }
    if (!componentOwned) output.add(node.id);
  }
  return output;
}

/** Build a reconcilable ledger. Only `missing` evidence can reduce coverage. */
export function tokenCoverageSummary(
  nodes: readonly NodeSnapshot[],
  options: TokenCoverageOptions = {},
): TokenCoverageSummary {
  const sampleLimit = options.sampleLimit ?? 50;
  const entries = new Map<string, TokenCoverageGroup>();
  const counts: Record<TokenCoverageDisposition, number> = { bound: 0, inherited: 0, ignored: 0, missing: 0 };
  const add = (
    disposition: TokenCoverageDisposition,
    field: TokenCoverageField,
    reason: TokenCoverageReason,
    node: NodeSnapshot,
    count = 1,
  ) => {
    if (count <= 0) return;
    counts[disposition] += count;
    const key = `${disposition}:${field}:${reason}`;
    const group = entries.get(key) ?? { disposition, field, reason, count: 0, samples: [], truncated: false };
    group.count += count;
    if (!group.samples.some((sample) => sample.nodeId === node.id)) {
      if (group.samples.length < sampleLimit) group.samples.push({ nodeId: node.id, nodePath: node.path });
      else group.truncated = true;
    }
    entries.set(key, group);
  };

  for (const node of nodes) {
    const scaffold = options.documentationScaffoldNodeIds?.has(node.id) ?? false;
    for (const field of CODE_RELEVANT_FIELDS) {
      const assessment = assessIgnoringInstanceOwnership(node, field);
      if (!assessment.eligible) {
        if (fieldIsPresent(node, field)) add("ignored", field, scaffold ? "documentation-scaffold" : assessment.reason ?? "not-owner", node);
        continue;
      }
      if (scaffold) {
        add("ignored", field, "documentation-scaffold", node);
        continue;
      }
      const evidence = propertyBindingEvidence(node.evidenceRole === "instance-descendant"
        ? (() => { const { evidenceRole: _role, ...owned } = node; return owned; })()
        : node, field);
      if (evidence === "variable") {
        const inherited = node.evidenceRole === "instance-descendant" && isInheritedInstanceField(node, field);
        add(inherited ? "inherited" : "bound", field, inherited ? "component-instance" : "variable", node);
      }
      else if (evidence === "text-style") add("inherited", field, "text-style", node);
      else if (isInheritedInstanceField(node, field)) add("inherited", field, "component-instance", node);
      else add("missing", field, "unbound", node);
    }

    for (const effect of node.effects) {
      const effectCount = Math.max(0, effect.eligibleFieldCount);
      if (effectCount === 0) continue;
      if (scaffold) add("ignored", "effects", "documentation-scaffold", node, effectCount);
      else if (!node.visible || node.renderVisible === false || node.opacity <= 0 || !effect.visible) add("ignored", "effects", "not-rendered", node, effectCount);
      else {
        const direct = Math.min(effectCount, Math.max(0, effect.boundFieldCount));
        add("bound", "effects", "variable", node, direct);
        const unresolved = effectCount - direct;
        if (unresolved > 0) add(isInheritedInstanceField(node, "effects") ? "inherited" : "missing", "effects", isInheritedInstanceField(node, "effects") ? "component-instance" : "unbound", node, unresolved);
      }
    }
  }
  const applicable = counts.bound + counts.inherited + counts.missing;
  return {
    counts,
    applicable,
    coverage: applicable === 0 ? null : ((counts.bound + counts.inherited) / applicable) * 100,
    groups: [...entries.values()].sort((left, right) => left.disposition.localeCompare(right.disposition)
      || left.field.localeCompare(right.field) || left.reason.localeCompare(right.reason)),
  };
}

export interface TokenCoveragePageQuery {
  rootIds: readonly string[];
  disposition: TokenCoverageDisposition;
  field: TokenCoverageField;
  reason: TokenCoverageReason;
  offset: number;
  limit: number;
}

/** Page all navigable live evidence without expanding the persisted report contract. */
export function tokenCoverageGroupPage(
  graph: DesignKnowledgeGraph,
  query: TokenCoveragePageQuery,
): { totalSamples: number; samples: Array<{ nodeId: string; nodePath: string }> } {
  const samples: Array<{ nodeId: string; nodePath: string }> = [];
  const seen = new Set<string>();
  for (const rootId of [...new Set(query.rootIds)]) {
    const root = graph.nodes[rootId];
    if (!root) continue;
    const nodes = collectDescendants(graph, rootId);
    const summary = tokenCoverageSummary(nodes, {
      documentationScaffoldNodeIds: documentationScaffoldNodeIds(graph, root, nodes),
      sampleLimit: Number.POSITIVE_INFINITY,
    });
    const group = summary.groups.find((candidate) => candidate.disposition === query.disposition
      && candidate.field === query.field && candidate.reason === query.reason);
    for (const sample of group?.samples ?? []) {
      if (seen.has(sample.nodeId)) continue;
      seen.add(sample.nodeId);
      samples.push(sample);
    }
  }
  samples.sort((left, right) => left.nodePath.localeCompare(right.nodePath) || left.nodeId.localeCompare(right.nodeId));
  return { totalSamples: samples.length, samples: samples.slice(query.offset, query.offset + query.limit) };
}

export function rawFieldValue(node: NodeSnapshot, field: BindableField): JsonValue | undefined {
  if (field === "fills" || field === "strokes") {
    const paint = (field === "fills" ? node.fills : node.strokes).find((item) => item.visible && item.opacity > 0 && item.type === "SOLID" && item.color);
    return paint?.color ? { r: paint.color.r, g: paint.color.g, b: paint.color.b, a: paint.opacity } : undefined;
  }
  if (field === "cornerRadius") return node.cornerRadius ?? (node.cornerRadii && new Set(Object.values(node.cornerRadii)).size === 1 ? node.cornerRadii.topLeft : undefined);
  if (field === "opacity") return node.opacity;
  if (field === "strokeWeight") return node.strokeWeight ?? (node.strokeWeights && new Set(Object.values(node.strokeWeights)).size === 1 ? node.strokeWeights.top : undefined);
  if (field === "fontFamily") return node.text?.fontFamily;
  if (field === "fontSize") return node.text?.fontSize;
  if (field === "fontStyle") return node.text?.fontStyle;
  if (field === "fontWeight") return node.text?.fontWeight;
  if (field === "letterSpacing") return node.text?.letterSpacingPx;
  if (field === "lineHeight") return node.text?.lineHeightPx;
  if (field === "paragraphSpacing") return node.text?.paragraphSpacing;
  if (field === "paragraphIndent") return node.text?.paragraphIndent;
  if (field === "width") return node.width;
  if (field === "height") return node.height;
  if (node.layout && field in node.layout) {
    const value = node.layout[field as keyof typeof node.layout];
    return typeof value === "number" ? value : undefined;
  }
  return undefined;
}

export function selectedVariables(graph: DesignKnowledgeGraph, profile: ReadinessProfile): VariableCandidate[] {
  const selected = new Set(profile.tokenSourceCollectionKeys);
  return selected.size > 0 ? graph.variables.filter((variable) => selected.has(variable.collectionKey)) : [];
}

export function collectBoundVariableIds(nodes: readonly NodeSnapshot[]): Set<string> {
  const output = new Set<string>();
  for (const node of nodes) {
    for (const ids of Object.values(node.boundVariableIds)) for (const id of ids ?? []) output.add(id);
    for (const paint of [...node.fills, ...node.strokes]) if (paint.boundVariableId) output.add(paint.boundVariableId);
    for (const effect of node.effects) for (const id of effect.boundVariableIds) output.add(id);
  }
  return output;
}

export function hasResponsiveVariableSignal(
  graph: DesignKnowledgeGraph,
  profile: ReadinessProfile,
  nodes: readonly NodeSnapshot[],
): boolean {
  const configuredModes = new Set(profile.breakpoints.flatMap((breakpoint) => [breakpoint.name, breakpoint.variableModeName])
    .filter((name): name is string => Boolean(name))
    .map((name) => name.toLocaleLowerCase("en-US")));
  const usedVariableIds = collectBoundVariableIds(nodes);
  return selectedVariables(graph, profile).some((variable) => usedVariableIds.has(variable.id)
    && new Set(variable.modeNames.map((mode) => mode.toLocaleLowerCase("en-US")).filter((mode) => configuredModes.has(mode))).size >= 2);
}
