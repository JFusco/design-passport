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

export function eligibleTokenFields(node: NodeSnapshot): BindableField[] {
  const fields: BindableField[] = [];
  const includeNumeric = (field: BindableField, value: number | undefined): void => {
    if ((value !== undefined && value !== 0) || node.boundFields.includes(field)) fields.push(field);
  };
  if (node.fills.some((paint) => paint.visible && paint.type === "SOLID")) fields.push("fills");
  if (node.strokes.some((paint) => paint.visible && paint.type === "SOLID")) fields.push("strokes");
  includeNumeric("cornerRadius", node.cornerRadius);
  if (node.opacity !== 1 || node.boundFields.includes("opacity")) fields.push("opacity");
  if (node.strokeWeight !== undefined && node.strokes.some((paint) => paint.visible)) fields.push("strokeWeight");
  if (node.layout && node.layout.mode !== "NONE") {
    includeNumeric("itemSpacing", node.layout.itemSpacing);
    includeNumeric("counterAxisSpacing", node.layout.counterAxisSpacing);
    includeNumeric("gridRowGap", node.layout.gridRowGap);
    includeNumeric("gridColumnGap", node.layout.gridColumnGap);
    includeNumeric("paddingTop", node.layout.paddingTop);
    includeNumeric("paddingRight", node.layout.paddingRight);
    includeNumeric("paddingBottom", node.layout.paddingBottom);
    includeNumeric("paddingLeft", node.layout.paddingLeft);
  }
  if (node.text?.fontFamily !== undefined) fields.push("fontFamily");
  if (node.text?.fontSize !== undefined) fields.push("fontSize");
  if (node.text?.fontStyle !== undefined) fields.push("fontStyle");
  if (node.text?.fontWeight !== undefined) fields.push("fontWeight");
  includeNumeric("letterSpacing", node.text?.letterSpacingPx);
  if (node.text?.lineHeightPx !== undefined) fields.push("lineHeight");
  includeNumeric("paragraphSpacing", node.text?.paragraphSpacing);
  includeNumeric("paragraphIndent", node.text?.paragraphIndent);
  return [...new Set(fields)];
}

export function bindingCoverage(nodes: readonly NodeSnapshot[]): BindingCoverage {
  let eligible = 0;
  let bound = 0;
  for (const node of nodes) {
    for (const field of eligibleTokenFields(node)) {
      eligible += 1;
      if (node.boundFields.includes(field)) bound += 1;
    }
    for (const effect of node.effects) {
      eligible += effect.eligibleFieldCount;
      bound += effect.boundFieldCount;
    }
  }
  return { eligible, bound, coverage: eligible === 0 ? 100 : (bound / eligible) * 100 };
}

export function rawFieldValue(node: NodeSnapshot, field: BindableField): JsonValue | undefined {
  if (field === "fills" || field === "strokes") {
    const paint = (field === "fills" ? node.fills : node.strokes).find((item) => item.visible && item.type === "SOLID" && item.color);
    return paint?.color ? { r: paint.color.r, g: paint.color.g, b: paint.color.b, a: paint.opacity } : undefined;
  }
  if (field === "cornerRadius") return node.cornerRadius;
  if (field === "opacity") return node.opacity;
  if (field === "strokeWeight") return node.strokeWeight;
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
