import type {
  BindableField,
  DesignKnowledgeGraph,
  JsonValue,
  NodeSnapshot,
  ReadinessProfile,
  VariableCandidate,
} from "../contracts";

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
  if (field === "lineHeight" && node.text?.lineHeight?.unit === "AUTO") return { eligible: true, repairable: false, reason: "unsupported-unit" };
  const value = rawFieldValue(node, field);
  const numbers = numericValues(node, field);
  if (numbers.length > 0 && numbers.every((item) => item === 0)) return exclude("inert-default");
  if (value === undefined && numbers.length === 0) return exclude("not-owner");
  if (numbers.length > 1 && new Set(numbers).size > 1) return { eligible: true, repairable: false, reason: "mixed" };
  // A variable binding would normalize percentage/auto typography to a different
  // unit. Retain its evidence, but never silently propose that semantic change.
  if ((field === "letterSpacing" && node.text?.letterSpacing?.unit !== undefined && node.text.letterSpacing.unit !== "PIXELS")
    || (field === "lineHeight" && node.text?.lineHeight?.unit !== undefined && node.text.lineHeight.unit !== "PIXELS")) {
    return { eligible: true, repairable: false, reason: "unsupported-unit" };
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
  let eligible = 0;
  let bound = 0;
  for (const node of nodes) {
    for (const field of eligibleTokenFields(node)) {
      eligible += 1;
      if (propertyBindingEvidence(node, field)) bound += 1;
    }
    if (!node.visible || node.renderVisible === false || node.opacity <= 0 || node.evidenceRole === "instance-descendant") continue;
    for (const effect of node.effects) {
      if (!effect.visible) continue;
      eligible += effect.eligibleFieldCount;
      bound += effect.boundFieldCount;
    }
  }
  return { eligible, bound, coverage: eligible === 0 ? 100 : (bound / eligible) * 100 };
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

export function isSemanticVariableName(name: string): boolean {
  return /(?:^|\/)(?:semantic|text|surface|background|border|action|button|input|content|space|radius|type)(?:\/|$)/i.test(name)
    && !/(?:^|\/)(?:#[0-9a-f]{3,8}|\d+(?:\.\d+)?(?:px|rem)?)(?:\/|$)/i.test(name);
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
