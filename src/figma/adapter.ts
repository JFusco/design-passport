import type {
  CertificationSummary,
  DesignKnowledgeGraph,
  EffectSnapshot,
  NodeSnapshot,
  PageSnapshot,
  PaintSnapshot,
  ProjectStyleGuideBindingV1,
  ReadinessProfile,
  ScanProgress,
  ScanScope,
  VariableCandidate,
} from "../core/contracts";
import { AI_SOURCE_FRAME_ANNOTATION, CERTIFICATION_ANNOTATION_PREFIX, LEGACY_CERTIFICATION_ANNOTATION_PREFIX } from "../core/constants";
import { finalizeKnowledgeGraph } from "../core/knowledge";
import { isAuditTargetNodeType, populateGraphMetrics, sourceFrameIds, targetRootIds } from "../core/operations/graph";
import { assertProfileSemantics, profileSemanticErrors, reconcileProfilePages } from "../core/profile";
import { inferProfileFromPages } from "../core/profile-inference";
import { hashValue } from "../core/stable";
import {
  buildProjectStyleGuideBinding,
  parseProjectStyleGuideBinding,
  parseReferencePack,
} from "../core/knowledge-loop";
import { canReadComponentPropertyDefinitions } from "./operations/component";
import { annotationText } from "./operations/annotations";
import { listVariableCollectionOptions, type VariableCollectionOption } from "./operations/collections";
import { parseCertificationSummary, parsePatternConfirmation, parseStoredProfile } from "./operations/shared-data";
import { contextFragment, mapConcurrent, newBuildDiagnostics, readContextFragment, restPageFingerprint, restSubtreeCovers, restSubtreeNodes, type ContextCachePort, type KnowledgeBuildDiagnostics } from "./context-cache";

export type { ContextCachePort, KnowledgeBuildDiagnostics } from "./context-cache";

export type { VariableCollectionOption } from "./operations/collections";

export interface PageOption {
  id: string;
  name: string;
}

export interface SelectionSummary {
  eligibleCount: number;
  unsupportedCount: number;
}

export type CapturedAuditTarget =
  | { scope: "selection"; nodeIds: readonly string[] }
  | { scope: "page"; pageId: string }
  | { scope: "file" };

export function summarizeSelection(selection: readonly Pick<BaseNode, "type">[]): SelectionSummary {
  let eligibleCount = 0;
  let unsupportedCount = 0;
  for (const node of selection) {
    if (isAuditTargetNodeType(node.type)) eligibleCount += 1;
    else unsupportedCount += 1;
  }
  return { eligibleCount, unsupportedCount };
}

export interface BootstrapData {
  fileName: string;
  fileKeyAvailable: boolean;
  editorType: "figma" | "dev";
  canMutateDocument: boolean;
  pages: PageOption[];
  collections: VariableCollectionOption[];
  profile: ReadinessProfile;
  profileSuggestion: ReadinessProfile;
  profileConfigured: boolean;
  profileIssues: string[];
  selectionSummary: SelectionSummary;
  projectStyleGuide: ProjectStyleGuideStatus;
}

export type ProjectStyleGuideStatus =
  | { state: "none"; persistent: boolean }
  | {
    state: "active";
    persistent: boolean;
    packVersion: string;
    digest: string;
    projectScope: string;
    sourceId: string;
  }
  | { state: "invalid"; persistent: boolean; error: string };

const PROJECT_STYLE_GUIDE_KEY = "project-style-guide-binding-v1";

export interface KnowledgeBuildResult {
  graph: DesignKnowledgeGraph;
  collections: VariableCollectionOption[];
  diagnostics: KnowledgeBuildDiagnostics;
}

function roleForPage(pageId: string, profile: ReadinessProfile): PageSnapshot["role"] {
  if (profile.pageRoles.foundations.pageIds.includes(pageId)) return "foundations";
  if (profile.pageRoles.components.pageIds.includes(pageId)) return "components";
  if (profile.pageRoles.screens.pageIds.includes(pageId)) return "screens";
  return "unmapped";
}

function hasChildren(node: BaseNode): node is BaseNode & ChildrenMixin {
  return "children" in node;
}

function isSceneNode(node: BaseNode): node is SceneNode {
  return node.type !== "DOCUMENT" && node.type !== "PAGE";
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function paints(value: unknown): ReadonlyArray<Paint> {
  return Array.isArray(value) ? value as ReadonlyArray<Paint> : [];
}

function canonicalBindableField(field: string): string {
  if (["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"].includes(field)) return "cornerRadius";
  if (["strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"].includes(field)) return "strokeWeight";
  return field;
}

function paintSnapshots(node: SceneNode, field: "fills" | "strokes"): PaintSnapshot[] {
  if (!(field in node)) return [];
  const values = paints((node as unknown as Record<string, unknown>)[field]);
  const bound = node.boundVariables?.[field] ?? [];
  const inferred: VariableAlias[][] = [];
  return values.map((paint, index) => {
    const solid = paint.type === "SOLID" ? paint : undefined;
    const boundFromPaint = solid?.boundVariables?.color?.id;
    const boundVariableId = boundFromPaint ?? bound[index]?.id;
    return {
      type: paint.type,
      visible: paint.visible !== false,
      opacity: paint.opacity ?? 1,
      ...(solid ? { color: { r: solid.color.r, g: solid.color.g, b: solid.color.b } } : {}),
      ...(boundVariableId ? { boundVariableId } : {}),
      inferredVariableIds: (inferred[index] ?? []).map((alias) => alias.id),
    };
  });
}

export function effectSnapshots(node: SceneNode): EffectSnapshot[] {
  if (!("effects" in node) || !Array.isArray(node.effects)) return [];
  const styleBacked = "effectStyleId" in node && node.effectStyleId.length > 0;
  return node.effects.map((effect) => {
    const fields: string[] = [];
    if ("color" in effect) fields.push("color");
    if ("radius" in effect) fields.push("radius");
    if ("spread" in effect && effect.spread !== undefined) fields.push("spread");
    if ("offset" in effect) fields.push("offsetX", "offsetY");
    const bindings = effect.boundVariables as Record<string, VariableAlias | undefined> | undefined;
    // A published effect style is machine-readable token evidence for every
    // subfield it controls, even when those values are not variable-bound.
    const boundFields = styleBacked ? fields : fields.filter((field) => Boolean(bindings?.[field]?.id));
    const boundVariableIds = [...new Set(boundFields.flatMap((field) => {
      const id = bindings?.[field]?.id;
      return id ? [id] : [];
    }))];
    return {
      type: effect.type,
      visible: effect.visible,
      eligibleFieldCount: effect.visible ? fields.length : 0,
      boundFieldCount: effect.visible ? boundFields.length : 0,
      boundVariableIds,
      valueHash: hashValue({
        type: effect.type,
        visible: effect.visible,
        ...( "color" in effect ? { color: effect.color } : {}),
        ...( "radius" in effect ? { radius: effect.radius } : {}),
        ...( "spread" in effect ? { spread: effect.spread } : {}),
        ...( "offset" in effect ? { offset: effect.offset } : {}),
      }),
    };
  });
}

function boundFields(node: SceneNode, fills: readonly PaintSnapshot[], strokes: readonly PaintSnapshot[]): string[] {
  const fields = new Set<string>();
  const bindings = node.boundVariables;
  if (bindings) {
    for (const [field, value] of Object.entries(bindings)) {
      if (!value || (Array.isArray(value) && value.length === 0)) continue;
      fields.add(canonicalBindableField(field));
    }
  }
  if (fills.some((paint) => Boolean(paint.boundVariableId))) fields.add("fills");
  if (strokes.some((paint) => Boolean(paint.boundVariableId))) fields.add("strokes");
  return [...fields].sort();
}

const BINDABLE_FIELDS = new Set([
  "fills", "strokes", "cornerRadius", "itemSpacing", "counterAxisSpacing", "gridRowGap", "gridColumnGap",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "width", "height", "opacity", "strokeWeight",
  "fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent",
]);

function boundVariableIds(
  node: SceneNode,
  fills: readonly PaintSnapshot[],
  strokes: readonly PaintSnapshot[],
): NodeSnapshot["boundVariableIds"] {
  const output: NodeSnapshot["boundVariableIds"] = {};
  const bindings = node.boundVariables;
  if (bindings) {
    for (const [sourceField, value] of Object.entries(bindings)) {
      const field = canonicalBindableField(sourceField);
      if (!BINDABLE_FIELDS.has(field)) continue;
      const aliases = Array.isArray(value) ? value : [value];
      const ids = aliases.flatMap((alias) => alias && typeof alias === "object" && "id" in alias && typeof alias.id === "string" ? [alias.id] : []);
      if (ids.length === 0) continue;
      const key = field as keyof NodeSnapshot["boundVariableIds"];
      output[key] = [...new Set([...(output[key] ?? []), ...ids])];
    }
  }
  const paintBindings = (values: readonly PaintSnapshot[]): string[] => [...new Set(values.flatMap((paint) => paint.boundVariableId ? [paint.boundVariableId] : []))];
  const fillIds = paintBindings(fills);
  const strokeIds = paintBindings(strokes);
  if (fillIds.length > 0) output.fills = [...new Set([...(output.fills ?? []), ...fillIds])];
  if (strokeIds.length > 0) output.strokes = [...new Set([...(output.strokes ?? []), ...strokeIds])];
  return output;
}

function inferredBindings(inferred: SceneNode["inferredVariables"]): NodeSnapshot["inferredBindings"] {
  const output: NodeSnapshot["inferredBindings"] = {};
  if (!inferred) return output;
  for (const [field, value] of Object.entries(inferred)) {
    if (!value) continue;
    const aliases = (field === "fills" || field === "strokes")
      ? (value as VariableAlias[][]).flat()
      : value as VariableAlias[];
    const ids = [...new Set(aliases.map((alias) => alias.id))];
    if (ids.length > 0) output[field as keyof NodeSnapshot["inferredBindings"]] = ids;
  }
  return output;
}

function layoutSnapshot(node: SceneNode): NodeSnapshot["layout"] {
  if (!("layoutMode" in node)) return undefined;
  const frame = node as SceneNode & AutoLayoutMixin & Partial<BaseFrameMixin>;
  const counterAxisSpacing = frame.layoutWrap === "WRAP" ? numberOrUndefined(frame.counterAxisSpacing) : undefined;
  const gridRowGap = frame.layoutMode === "GRID" ? numberOrUndefined(frame.gridRowGap) : undefined;
  const gridColumnGap = frame.layoutMode === "GRID" ? numberOrUndefined(frame.gridColumnGap) : undefined;
  return {
    mode: frame.layoutMode,
    ...(frame.layoutMode === "NONE" ? {} : {
      primarySizing: frame.primaryAxisSizingMode,
      counterSizing: frame.counterAxisSizingMode,
      itemSpacing: frame.itemSpacing,
      ...(counterAxisSpacing !== undefined ? { counterAxisSpacing } : {}),
      ...(gridRowGap !== undefined ? { gridRowGap } : {}),
      ...(gridColumnGap !== undefined ? { gridColumnGap } : {}),
      paddingTop: frame.paddingTop,
      paddingRight: frame.paddingRight,
      paddingBottom: frame.paddingBottom,
      paddingLeft: frame.paddingLeft,
    }),
    ...("clipsContent" in frame && typeof frame.clipsContent === "boolean" ? { clipsContent: frame.clipsContent } : {}),
    inferredAvailable: false,
  };
}

export function resolveTextBackground(node: TextNode): { color?: { r: number; g: number; b: number; a: number }; resolvable: boolean } {
  let parent = node.parent;
  while (parent && parent.type !== "PAGE" && parent.type !== "DOCUMENT") {
    if (isSceneNode(parent) && "fills" in parent) {
      const visible = paints(parent.fills).filter((paint) => paint.visible !== false && (paint.opacity ?? 1) > 0);
      if (visible.length > 0) {
        if (visible.length !== 1 || visible[0]?.type !== "SOLID") return { resolvable: false };
        const paint = visible[0];
        return { color: { r: paint.color.r, g: paint.color.g, b: paint.color.b, a: (paint.opacity ?? 1) * ("opacity" in parent ? parent.opacity : 1) }, resolvable: true };
      }
    }
    // A component-set canvas is an authoring surface, not a guaranteed runtime
    // backdrop. Once a text node reaches a transparent component/instance
    // boundary, anything outside that boundary belongs to the consumer.
    if (parent.type === "COMPONENT" || parent.type === "COMPONENT_SET" || parent.type === "INSTANCE") {
      return { resolvable: false };
    }
    parent = parent.parent;
  }
  // A transparent component may be placed on any consumer surface. Treat that
  // background as unresolved instead of inventing a white canvas and reporting
  // a false contrast failure for dark-surface variants.
  return { resolvable: false };
}

function textSnapshot(node: SceneNode): NodeSnapshot["text"] {
  if (node.type !== "TEXT") return undefined;
  const fillsValue = paints(node.fills);
  const visible = fillsValue.filter((paint) => paint.visible !== false && (paint.opacity ?? 1) > 0);
  const solid = visible.length === 1 && visible[0]?.type === "SOLID" ? visible[0] : undefined;
  const background = resolveTextBackground(node);
  const fontSize = numberOrUndefined(node.fontSize);
  const fontWeight = numberOrUndefined(node.fontWeight);
  const fontName = node.fontName === figma.mixed ? undefined : node.fontName;
  const paragraphSpacing = numberOrUndefined(node.paragraphSpacing);
  const paragraphIndent = numberOrUndefined(node.paragraphIndent);
  let letterSpacingPx: number | undefined;
  if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === "PIXELS") letterSpacingPx = node.letterSpacing.value;
  else if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === "PERCENT" && fontSize !== undefined) letterSpacingPx = fontSize * node.letterSpacing.value / 100;
  let lineHeightPx: number | undefined;
  if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS") lineHeightPx = node.lineHeight.value;
  else if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PERCENT" && fontSize !== undefined) lineHeightPx = fontSize * node.lineHeight.value / 100;
  return {
    ...(fontSize !== undefined ? { fontSize } : {}),
    ...(fontWeight !== undefined ? { fontWeight } : {}),
    ...(fontName ? { fontFamily: fontName.family, fontStyle: fontName.style } : {}),
    ...(letterSpacingPx !== undefined ? { letterSpacingPx } : {}),
    ...(lineHeightPx !== undefined ? { lineHeightPx } : {}),
    ...(paragraphSpacing !== undefined ? { paragraphSpacing } : {}),
    ...(paragraphIndent !== undefined ? { paragraphIndent } : {}),
    charactersLength: node.characters.length,
    contentHash: hashValue(node.characters),
    ...(solid ? { textColor: { r: solid.color.r, g: solid.color.g, b: solid.color.b, a: (solid.opacity ?? 1) * node.opacity } } : {}),
    ...(background.color ? { backgroundColor: background.color } : {}),
    backgroundResolvable: Boolean(solid) && background.resolvable,
  };
}

function componentSnapshot(node: SceneNode): NodeSnapshot["component"] {
  if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") return undefined;
  const propertyDefinitions = canReadComponentPropertyDefinitions(node.type, node.parent?.type)
    ? Object.entries(node.componentPropertyDefinitions).map(([name, definition]) => ({
      name,
      type: definition.type,
      values: (definition.variantOptions ?? [definition.defaultValue]).map(String),
    }))
    : [];
  return {
    kind: node.type === "COMPONENT" ? "component" : "component-set",
    ...(node.key ? { key: node.key } : {}),
    descriptionLength: node.description.length,
    documentationLinkCount: node.documentationLinks.length,
    propertyDefinitions,
  };
}

function variantPropertiesSnapshot(node: SceneNode): NodeSnapshot["variantProperties"] {
  if (node.type === "INSTANCE") {
    const properties = Object.entries(node.componentProperties)
      .filter(([, property]) => property.type === "VARIANT")
      .map(([name, property]) => [name, String(property.value)] as const);
    return properties.length > 0 ? Object.fromEntries(properties) : undefined;
  }
  if (node.type === "COMPONENT" && node.variantProperties) return { ...node.variantProperties };
  return undefined;
}

function structuralSignature(node: SceneNode): string | undefined {
  if (!hasChildren(node)) return undefined;
  return hashValue({
    type: node.type,
    layoutMode: "layoutMode" in node ? node.layoutMode : undefined,
    childTypes: node.children.map((child) => child.type),
    childCount: node.children.length,
    widthBucket: Math.round(node.width / 4) * 4,
    heightBucket: Math.round(node.height / 4) * 4,
  });
}

function certificationSummary(node: SceneNode): CertificationSummary | undefined {
  return parseCertificationSummary(node.getSharedPluginData("verndaleAiReady", "certification-v1"));
}

function confirmedPattern(node: SceneNode): NodeSnapshot["confirmedPattern"] {
  return parsePatternConfirmation(node.getSharedPluginData("verndaleAiReady", "pattern-resolution-v1"));
}

function devStatusSnapshot(node: SceneNode): NodeSnapshot["devStatus"] {
  try {
    if (!("devStatus" in node)) return undefined;
    return node.devStatus?.type;
  } catch {
    // Some Figma runtimes expose the field in typings but not through the active API bridge.
    return undefined;
  }
}

function snapshotBase(node: SceneNode, rootId: string, pageId: string, path: string): NodeSnapshot {
  const fillData = paintSnapshots(node, "fills");
  const strokeData = paintSnapshots(node, "strokes");
  const effectData = effectSnapshots(node);
  const radius = "cornerRadius" in node ? numberOrUndefined(node.cornerRadius) : undefined;
  const strokeWeight = "strokeWeight" in node ? numberOrUndefined(node.strokeWeight) : undefined;
  const children = node.type !== "INSTANCE" && hasChildren(node) ? node.children.map((child) => child.id) : [];
  const detached = "detachedInfo" in node && node.detachedInfo !== null;
  const layout = layoutSnapshot(node);
  const text = textSnapshot(node);
  const variantProperties = variantPropertiesSnapshot(node);
  const component = componentSnapshot(node);
  const signature = structuralSignature(node);
  const certification = certificationSummary(node);
  const patternConfirmation = confirmedPattern(node);
  const annotationTexts = "annotations" in node ? node.annotations.map(annotationText) : [];
  const devStatus = devStatusSnapshot(node);
  return {
    id: node.id,
    rootId,
    pageId,
    ...(node.parent && node.parent.type !== "DOCUMENT" ? { parentId: node.parent.id } : {}),
    path,
    name: node.name,
    type: node.type,
    visible: node.visible,
    width: node.width,
    height: node.height,
    x: node.x,
    y: node.y,
    opacity: "opacity" in node ? node.opacity : 1,
    rotation: "rotation" in node ? node.rotation : 0,
    childIds: children,
    descendantCount: 0,
    ...(layout ? { layout } : {}),
    fills: fillData,
    strokes: strokeData,
    effects: effectData,
    ...(radius !== undefined ? { cornerRadius: radius } : {}),
    ...(strokeWeight !== undefined ? { strokeWeight } : {}),
    boundFields: boundFields(node, fillData, strokeData),
    boundVariableIds: boundVariableIds(node, fillData, strokeData),
    inferredBindings: {},
    ...(text ? { text } : {}),
    ...(variantProperties ? { variantProperties } : {}),
    ...(component ? { component } : {}),
    ...(detached ? { instance: { detached: true } } : {}),
    hasAnnotations: annotationTexts.some((annotation) => ![
      CERTIFICATION_ANNOTATION_PREFIX,
      LEGACY_CERTIFICATION_ANNOTATION_PREFIX,
    ].some((prefix) => annotation.startsWith(prefix))),
    ...(annotationTexts.includes(AI_SOURCE_FRAME_ANNOTATION) ? { sourceMarked: true } : {}),
    ...(devStatus ? { devStatus } : {}),
    devResourceCount: 0,
    exportSettings: "exportSettings" in node ? node.exportSettings.map((setting) => ({ format: setting.format, suffix: "suffix" in setting ? setting.suffix : "" })) : [],
    ...(signature ? { structuralSignature: signature } : {}),
    ...(certification ? { certification } : {}),
    ...(patternConfirmation ? { confirmedPattern: patternConfirmation } : {}),
  };
}


interface CaptureEntry {
  node: SceneNode;
  rootId: string;
  path: string;
}

function captureEntries(root: SceneNode, pageName: string): CaptureEntry[] {
  const entries: CaptureEntry[] = [];
  const stack: CaptureEntry[] = [{ node: root, rootId: root.id, path: `${pageName} / ${root.name}` }];
  while (stack.length > 0) {
    const entry = stack.pop()!;
    entries.push(entry);
    if (entry.node.type !== "INSTANCE" && hasChildren(entry.node)) {
      for (let index = entry.node.children.length - 1; index >= 0; index -= 1) {
        const child = entry.node.children[index];
        if (child) stack.push({ node: child, rootId: root.id, path: `${entry.path} / ${child.name}` });
      }
    }
  }
  return entries;
}

/** Inputs whose Plugin API representation is richer than the bulk REST export. */
function captureSupplement(node: SceneNode, raw: Record<string, unknown> | undefined): unknown {
  return {
    id: node.id,
    name: node.name,
    parentId: node.parent?.id,
    childIds: node.type !== "INSTANCE" && hasChildren(node) ? node.children.map((child) => child.id) : [],
    visible: node.visible,
    width: node.width,
    height: node.height,
    x: node.x,
    y: node.y,
    rotation: "rotation" in node ? node.rotation : 0,
    opacity: "opacity" in node ? node.opacity : 1,
    layout: layoutSnapshot(node),
    boundVariables: node.boundVariables,
    explicitVariableModes: node.explicitVariableModes,
    resolvedVariableModes: node.resolvedVariableModes,
    // REST may omit default-valued arrays. Read those fields directly rather
    // than treating absence as evidence that the live value is unchanged.
    fillsFallback: raw?.fills === undefined && "fills" in node ? paints(node.fills) : undefined,
    strokesFallback: raw?.strokes === undefined && "strokes" in node ? paints(node.strokes) : undefined,
    effectsFallback: raw?.effects === undefined && "effects" in node ? node.effects : undefined,
    exportsFallback: raw?.exportSettings === undefined && "exportSettings" in node ? node.exportSettings : undefined,
    paintBindings: {
      fills: "fills" in node ? paints(node.fills).map((paint) => paint.type === "SOLID" ? paint.boundVariables : undefined) : [],
      strokes: "strokes" in node ? paints(node.strokes).map((paint) => paint.type === "SOLID" ? paint.boundVariables : undefined) : [],
    },
    effectBindings: "effects" in node ? node.effects.map((effect) => "boundVariables" in effect ? effect.boundVariables : undefined) : [],
    effectStyleId: "effectStyleId" in node ? node.effectStyleId : undefined,
    cornerRadius: "cornerRadius" in node ? numberOrUndefined(node.cornerRadius) : undefined,
    strokeWeight: "strokeWeight" in node ? numberOrUndefined(node.strokeWeight) : undefined,
    text: node.type === "TEXT" ? {
      fontSize: numberOrUndefined(node.fontSize),
      fontWeight: numberOrUndefined(node.fontWeight),
      fontName: node.fontName === figma.mixed ? undefined : node.fontName,
      letterSpacing: node.letterSpacing === figma.mixed ? undefined : node.letterSpacing,
      lineHeight: node.lineHeight === figma.mixed ? undefined : node.lineHeight,
      paragraphSpacing: numberOrUndefined(node.paragraphSpacing),
      paragraphIndent: numberOrUndefined(node.paragraphIndent),
      background: resolveTextBackground(node),
    } : undefined,
    component: componentSnapshot(node),
    variantProperties: variantPropertiesSnapshot(node),
    detached: "detachedInfo" in node && node.detachedInfo !== null,
    structuralSignature: structuralSignature(node),
    annotations: "annotations" in node ? node.annotations.map(annotationText) : [],
    devStatus: devStatusSnapshot(node),
    certification: node.getSharedPluginData("verndaleAiReady", "certification-v1"),
    confirmation: node.getSharedPluginData("verndaleAiReady", "pattern-resolution-v1"),
  };
}

function enrichInferences(node: SceneNode, snapshot: NodeSnapshot): void {
  // Figma inference has no revision token. Always refresh it, including on a
  // cache hit, and preserve the whole-file inferred-variable inventory.
  const inferred = node.inferredVariables;
  snapshot.inferredBindings = inferredBindings(inferred);
  snapshot.fills.forEach((paint, index) => { paint.inferredVariableIds = (inferred?.fills?.[index] ?? []).map((alias) => alias.id); });
  snapshot.strokes.forEach((paint, index) => { paint.inferredVariableIds = (inferred?.strokes?.[index] ?? []).map((alias) => alias.id); });
  if (snapshot.layout) {
    snapshot.layout.inferredAvailable = snapshot.layout.mode === "NONE"
      && (node.type === "FRAME" || node.type === "COMPONENT")
      && snapshot.childIds.length >= 2
      && "inferredAutoLayout" in node
      && node.inferredAutoLayout !== null;
  }
}

function variableAliases(value: unknown, output = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) { value.forEach((item) => variableAliases(item, output)); return output; }
  const object = value as Record<string, unknown>;
  if (object.type === "VARIABLE_ALIAS" && typeof object.id === "string") output.add(object.id);
  else Object.values(object).forEach((item) => variableAliases(item, output));
  return output;
}

interface VariableProvenance {
  fingerprint(supplements: unknown[]): Promise<string | undefined>;
  verify(): Promise<boolean>;
}

function variableMaterial(variable: Variable): unknown {
  return { id: variable.id, key: variable.key, name: variable.name, collectionId: variable.variableCollectionId, remote: variable.remote, resolvedType: variable.resolvedType, valuesByMode: variable.valuesByMode, scopes: variable.scopes, codeSyntax: variable.codeSyntax };
}

function collectionMaterial(collection: VariableCollection): unknown {
  return { id: collection.id, key: collection.key, name: collection.name, remote: collection.remote, modes: collection.modes, defaultModeId: collection.defaultModeId, variableIds: collection.variableIds };
}

/** Actual values/modes, not collection labels, establish bound-value provenance. */
async function variableEnvironmentReader(cancelled: () => boolean): Promise<VariableProvenance | undefined> {
  try {
    const [locals, localCollections] = await Promise.all([
      figma.variables.getLocalVariablesAsync(),
      figma.variables.getLocalVariableCollectionsAsync(),
    ]);
    const localIds = locals.map((variable) => variable.id).sort();
    const localCollectionIds = localCollections.map((collection) => collection.id).sort();
    const localById = new Map(locals.map((variable) => [variable.id, variable]));
    const collectionsById = new Map(localCollections.map((collection) => [collection.id, collection]));
    interface Description { material: unknown; digest: string }
    interface VariableDescription extends Description { collectionId: string; aliases: string[] }
    interface Dependencies { variables: Map<string, VariableDescription>; collections: Map<string, Description> }
    const descriptions = new Map<string, Promise<VariableDescription | undefined>>();
    const collectionDescriptions = new Map<string, Promise<Description | undefined>>();
    const describeVariable = (id: string): Promise<VariableDescription | undefined> => {
      let request = descriptions.get(id);
      if (!request) {
        request = (async () => {
          const variable = localById.get(id) ?? await figma.variables.getVariableByIdAsync(id).catch(() => null);
          if (!variable) return undefined;
          // Material must not retain live nested values that could change during
          // capture. Each variable/collection is serialized once per build.
          const material: unknown = JSON.parse(JSON.stringify(variableMaterial(variable)));
          return { material, digest: hashValue(material), collectionId: variable.variableCollectionId, aliases: [...variableAliases(material)] };
        })();
        descriptions.set(id, request);
      }
      return request;
    };
    const describeCollection = (id: string): Promise<Description | undefined> => {
      let request = collectionDescriptions.get(id);
      if (!request) {
        request = (async () => {
          const collection = collectionsById.get(id) ?? await figma.variables.getVariableCollectionByIdAsync(id).catch(() => null);
          if (!collection) return undefined;
          const material: unknown = JSON.parse(JSON.stringify(collectionMaterial(collection)));
          return { material, digest: hashValue(material) };
        })();
        collectionDescriptions.set(id, request);
      }
      return request;
    };
    const gather = async (ids: readonly string[], skipped = new Set<string>()): Promise<Dependencies | undefined> => {
      const pending = [...new Set(ids)].sort();
      const seen = new Set(skipped);
      const result: Dependencies = { variables: new Map(), collections: new Map() };
      while (pending.length > 0) {
        if (cancelled()) return undefined;
        const batch = [...new Set(pending.splice(0, 16))].filter((id) => !seen.has(id));
        batch.forEach((id) => { seen.add(id); });
        const resolved = await Promise.all(batch.map(describeVariable));
        for (const [index, variable] of resolved.entries()) {
          if (!variable) return undefined;
          const collection = await describeCollection(variable.collectionId);
          if (!collection) return undefined;
          result.variables.set(batch[index]!, variable);
          result.collections.set(variable.collectionId, collection);
          pending.push(...variable.aliases.filter((id) => !seen.has(id)));
        }
      }
      return result;
    };
    const materialFor = (dependencies: Dependencies) => ({
      variables: [...dependencies.variables].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value.material),
      collections: [...dependencies.collections].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value.material),
    });
    const base = await gather(localIds);
    if (!base) return undefined;
    const baseDigest = hashValue(materialFor(base));
    const baseIds = new Set(base.variables.keys());
    const extras = new Map<string, Promise<{ digest: string; dependencies: Dependencies } | undefined>>();
    const used: Dependencies = { variables: new Map(), collections: new Map() };
    const recordUsed = (dependencies: Dependencies) => {
      dependencies.variables.forEach((value, id) => { used.variables.set(id, value); });
      dependencies.collections.forEach((value, id) => { used.collections.set(id, value); });
    };
    let baseRecorded = false;
    const recordedExtras = new Set<string>();
    const recordBase = () => { if (!baseRecorded) { recordUsed(base); baseRecorded = true; } };
    return {
      fingerprint: async (supplements) => {
        const ids = [...variableAliases(supplements)].filter((id) => !baseIds.has(id)).sort();
        if (ids.length === 0) { recordBase(); return baseDigest; }
        const key = JSON.stringify(ids);
        let request = extras.get(key);
        if (!request) {
          request = gather(ids, baseIds).then((dependencies) => dependencies
            ? { digest: hashValue({ base: baseDigest, ...materialFor(dependencies) }), dependencies }
            : undefined);
          extras.set(key, request);
        }
        const extra = await request;
        if (!extra) return undefined;
        recordBase();
        if (!recordedExtras.has(key)) { recordUsed(extra.dependencies); recordedExtras.add(key); }
        return extra.digest;
      },
      verify: async () => {
        // Variable edits are not covered by documentchange. Recheck the frozen
        // dependency epoch once, rather than serializing it for every root.
        try {
          const [freshLocals, freshCollections] = await Promise.all([
            figma.variables.getLocalVariablesAsync(), figma.variables.getLocalVariableCollectionsAsync(),
          ]);
          if (JSON.stringify(freshLocals.map((variable) => variable.id).sort()) !== JSON.stringify(localIds)
            || JSON.stringify(freshCollections.map((collection) => collection.id).sort()) !== JSON.stringify(localCollectionIds)) return false;
          const freshById = new Map(freshLocals.map((variable) => [variable.id, variable]));
          const freshCollectionsById = new Map(freshCollections.map((collection) => [collection.id, collection]));
          const variableMatches = await mapConcurrent([...used.variables], 16, async ([id, expected]) => {
            const variable = freshById.get(id) ?? await figma.variables.getVariableByIdAsync(id).catch(() => null);
            return Boolean(variable && hashValue(variableMaterial(variable)) === expected.digest);
          }, cancelled);
          const collectionMatches = await mapConcurrent([...used.collections], 8, async ([id, expected]) => {
            const collection = freshCollectionsById.get(id) ?? await figma.variables.getVariableCollectionByIdAsync(id).catch(() => null);
            return Boolean(collection && hashValue(collectionMaterial(collection)) === expected.digest);
          }, cancelled);
          return !cancelled() && variableMatches.every(Boolean) && collectionMatches.every(Boolean);
        } catch { return false; }
      },
    };
  } catch {
    // Cache provenance is unavailable; live capture remains the authority.
    return undefined;
  }
}

async function variableCandidates(
  options: VariableCollectionOption[],
  nodes: Record<string, NodeSnapshot>,
  cancelled: () => boolean,
  approvedCollectionKeys: ReadonlySet<string>,
): Promise<VariableCandidate[]> {
  const isSemanticVariable = (name: string, collectionName: string): boolean => (
    /^semantic(?:\s|$)/i.test(collectionName.trim())
    || /(?:^|\/)(?:semantic|text|surface|background|border|action|button|input|content|space|radius|type)(?:\/|$)/i.test(name)
  );
  const localCollections = new Map((await figma.variables.getLocalVariableCollectionsAsync()).map((collection) => [collection.id, collection]));
  const localVariables = await figma.variables.getLocalVariablesAsync();
  const output: VariableCandidate[] = localVariables.map((variable) => {
    const collection = localCollections.get(variable.variableCollectionId);
    return {
      id: variable.id,
      key: variable.key,
      name: variable.name,
      collectionId: variable.variableCollectionId,
      collectionKey: collection?.key ?? variable.variableCollectionId,
      collectionName: collection?.name ?? "Unknown local collection",
      type: variable.resolvedType,
      remote: variable.remote,
      evidenceLevel: "full",
      semantic: isSemanticVariable(variable.name, collection?.name ?? "Unknown local collection"),
      aliased: Object.values(variable.valuesByMode).some((value) => typeof value === "object" && value !== null && "type" in value && value.type === "VARIABLE_ALIAS"),
      scopes: [...variable.scopes],
      modeNames: collection?.modes.map((mode) => mode.name) ?? [],
      ...(variable.codeSyntax.WEB ? { webSyntax: variable.codeSyntax.WEB } : {}),
    };
  });

  const referencedIds = new Set<string>();
  for (const node of Object.values(nodes)) {
    for (const values of Object.values(node.inferredBindings)) for (const id of values ?? []) referencedIds.add(id);
    for (const paint of [...node.fills, ...node.strokes]) if (paint.boundVariableId) referencedIds.add(paint.boundVariableId);
    for (const effect of node.effects) for (const id of effect.boundVariableIds) referencedIds.add(id);
  }
  const knownIds = new Set(output.map((variable) => variable.id));
  const collectionRequests = new Map<string, Promise<VariableCollection | null>>();
  const getCollection = (id: string): Promise<VariableCollection | null> => {
    const local = localCollections.get(id);
    if (local) return Promise.resolve(local);
    let request = collectionRequests.get(id);
    if (!request) {
      request = figma.variables.getVariableCollectionByIdAsync(id).catch(() => null);
      collectionRequests.set(id, request);
    }
    return request;
  };
  const referenced = await mapConcurrent([...referencedIds].filter((id) => !knownIds.has(id)), 8, async (id): Promise<VariableCandidate | undefined> => {
    const variable = await figma.variables.getVariableByIdAsync(id).catch(() => null);
    if (!variable) return undefined;
    const collection = await getCollection(variable.variableCollectionId);
    return {
      id: variable.id,
      key: variable.key,
      name: variable.name,
      collectionId: variable.variableCollectionId,
      collectionKey: collection?.key ?? variable.variableCollectionId,
      collectionName: collection?.name ?? "Enabled library collection",
      type: variable.resolvedType,
      remote: variable.remote,
      evidenceLevel: "full",
      semantic: isSemanticVariable(variable.name, collection?.name ?? "Enabled library collection"),
      aliased: Object.values(variable.valuesByMode).some((value) => typeof value === "object" && value !== null && "type" in value && value.type === "VARIABLE_ALIAS"),
      scopes: [...variable.scopes],
      modeNames: collection?.modes.map((mode) => mode.name) ?? [],
      ...(variable.codeSyntax.WEB ? { webSyntax: variable.codeSyntax.WEB } : {}),
    };
  }, cancelled);
  output.push(...referenced.filter((value): value is VariableCandidate => Boolean(value)));
  const remote = options.filter((candidate) => candidate.remote && approvedCollectionKeys.has(candidate.key));
  const summaries = await mapConcurrent(remote, 4, async (option) => {
    try { return await figma.teamLibrary.getVariablesInLibraryCollectionAsync(option.key); }
    catch { return undefined; }
  }, cancelled);
  const knownKeys = new Set(output.map((candidate) => candidate.key));
  for (const [index, variables] of summaries.entries()) {
    if (!variables) continue;
    const option = remote[index]!;
    option.variableCount = variables.length;
    for (const variable of variables) {
      if (knownKeys.has(variable.key)) continue;
      output.push({
        id: `library:${variable.key}`,
        key: variable.key,
        name: variable.name,
        collectionId: option.id,
        collectionKey: option.key,
        collectionName: option.name,
        type: variable.resolvedType,
        remote: true,
        evidenceLevel: "summary",
        semantic: isSemanticVariable(variable.name, option.name),
        scopes: [],
        modeNames: option.modeNames,
      });
      knownKeys.add(variable.key);
    }
  }
  return output;
}

export class FigmaAdapter {
  private cancelled = false;

  beginScan(): void {
    this.cancelled = false;
  }

  cancel(): void {
    this.cancelled = true;
  }

  isScanCancelled(): boolean {
    return this.cancelled;
  }

  getCollectionOptions(includeRemote = true, remoteTimeoutMs = 4_000, refreshRemote = false): Promise<VariableCollectionOption[]> {
    return listVariableCollectionOptions({ includeRemote, remoteTimeoutMs, refreshRemote });
  }

  async getBootstrap(): Promise<BootstrapData> {
    const pages = figma.root.children;
    const collections = await this.getCollectionOptions(false);
    const stored = figma.root.getSharedPluginData("verndaleAiReady", "profile-v1");
    const profileSuggestion = inferProfileFromPages(pages, collections);
    let profile = profileSuggestion;
    let profileConfigured = profileSemanticErrors(profileSuggestion, new Set(pages.map((page) => page.id))).length === 0;
    let profileIssues: string[] = [];
    if (stored) {
      const candidate = parseStoredProfile(stored);
      if (candidate) {
        const state = this.reconcileProfile(candidate, true, profileSuggestion);
        profile = state.profile;
        profileConfigured = state.profileConfigured;
        profileIssues = state.profileIssues;
      } else {
        profileIssues = ["The stored profile could not be read. Review the suggested profile and save it to continue."];
        profileConfigured = false;
      }
    }
    const selectionSummary = this.getSelectionSummary();
    return {
      fileName: figma.root.name,
      fileKeyAvailable: Boolean(figma.fileKey),
      editorType: figma.editorType === "dev" ? "dev" : "figma",
      canMutateDocument: figma.editorType === "figma",
      pages: pages.map((page) => ({ id: page.id, name: page.name })),
      collections,
      profile,
      profileSuggestion,
      profileConfigured,
      profileIssues,
      selectionSummary,
      projectStyleGuide: this.getProjectStyleGuideStatus(),
    };
  }

  getSelectionSummary(): SelectionSummary {
    return summarizeSelection(figma.currentPage.selection);
  }

  captureAuditTarget(scope: ScanScope): CapturedAuditTarget {
    if (scope === "file") return { scope };
    if (scope === "page") return { scope, pageId: figma.currentPage.id };

    const selection = figma.currentPage.selection;
    const summary = summarizeSelection(selection);
    if (summary.unsupportedCount > 0) {
      const noun = summary.unsupportedCount === 1 ? "layer" : "layers";
      throw new Error(`Audit selection supports only frames, components, and component sets. Remove ${summary.unsupportedCount} unsupported ${noun} and try again`);
    }
    if (summary.eligibleCount === 0) {
      throw new Error("Select at least one frame, component, or component set to audit");
    }
    return { scope, nodeIds: [...new Set(selection.map((node) => node.id))] };
  }

  getProjectStyleGuideBinding(): ProjectStyleGuideBindingV1 | undefined {
    const stored = figma.root.getPluginData(PROJECT_STYLE_GUIDE_KEY);
    if (!stored) return undefined;
    if (!figma.fileKey) throw new Error("A stable Figma file key is unavailable; the stored project style guide cannot be applied");
    return parseProjectStyleGuideBinding(stored, figma.fileKey);
  }

  getProjectStyleGuideStatus(): ProjectStyleGuideStatus {
    const stored = figma.root.getPluginData(PROJECT_STYLE_GUIDE_KEY);
    if (!stored) return { state: "none", persistent: Boolean(figma.fileKey) };
    try {
      const binding = this.getProjectStyleGuideBinding();
      if (!binding) return { state: "none", persistent: Boolean(figma.fileKey) };
      return {
        state: "active",
        persistent: true,
        packVersion: binding.pack.packVersion,
        digest: binding.pack.digest,
        projectScope: binding.projectScope,
        sourceId: binding.pack.source.sourceId,
      };
    } catch (error) {
      return {
        state: "invalid",
        persistent: Boolean(figma.fileKey),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  importProjectStyleGuide(raw: string): ProjectStyleGuideBindingV1 {
    if (figma.editorType !== "figma") throw new Error("Switch to Design mode to import or replace a project style guide");
    if (!figma.fileKey) throw new Error("A stable Figma file key is required to bind project guidance. This pack can only be used as a session reference");
    const pack = parseReferencePack(raw, "style-guide");
    const binding = buildProjectStyleGuideBinding(pack, figma.fileKey);
    // Validate the complete replacement before touching the existing valid value.
    const serialized = JSON.stringify(binding);
    parseProjectStyleGuideBinding(serialized, figma.fileKey);
    figma.root.setPluginData(PROJECT_STYLE_GUIDE_KEY, serialized);
    return binding;
  }

  removeProjectStyleGuide(): void {
    if (figma.editorType !== "figma") throw new Error("Switch to Design mode to remove a project style guide");
    figma.root.setPluginData(PROJECT_STYLE_GUIDE_KEY, "");
  }

  async saveProfile(profile: ReadinessProfile): Promise<void> {
    assertProfileSemantics(profile, new Set(figma.root.children.map((page) => page.id)));
    figma.root.setSharedPluginData("verndaleAiReady", "profile-v1", JSON.stringify(profile));
  }

  reconcileProfile(
    profile: ReadinessProfile,
    previouslyConfigured: boolean,
    suggestion?: ReadinessProfile,
  ): Pick<BootstrapData, "pages" | "profile" | "profileSuggestion" | "profileConfigured" | "profileIssues"> {
    const pages = figma.root.children;
    const availablePageIds = new Set(pages.map((page) => page.id));
    const reconciled = reconcileProfilePages(profile, availablePageIds);
    const removedIssue = reconciled.removedPageIds.length > 0
      ? [`Mapped pages were removed because they no longer exist: ${reconciled.removedPageIds.join(", ")}. Review and save the profile to confirm the new mapping.`]
      : [];
    const profileIssues = [...removedIssue, ...profileSemanticErrors(reconciled.profile, availablePageIds)];
    return {
      pages: pages.map((page) => ({ id: page.id, name: page.name })),
      profile: reconciled.profile,
      profileSuggestion: suggestion ?? {
        ...inferProfileFromPages(pages),
        tokenSourceCollectionKeys: [...profile.tokenSourceCollectionKeys],
      },
      profileConfigured: previouslyConfigured && profileIssues.length === 0,
      profileIssues,
    };
  }

  matchesDocumentTopology(graph: Pick<DesignKnowledgeGraph, "pages">): boolean {
    const pages = figma.root.children;
    return pages.length === graph.pages.length
      && pages.every((page, index) => page.id === graph.pages[index]?.id && page.name === graph.pages[index]?.name);
  }

  async buildKnowledge(
    profile: ReadinessProfile,
    onProgress: (progress: ScanProgress) => void,
    options: { contextCache?: ContextCachePort; forceFullCapture?: boolean } = {},
  ): Promise<KnowledgeBuildResult> {
    const started = Date.now();
    const diagnostics = newBuildDiagnostics();
    const pages = figma.root.children;
    const nodes: Record<string, NodeSnapshot> = {};
    const pageSnapshots: PageSnapshot[] = [];
    const componentIds: string[] = [];
    const instanceIds: string[] = [];
    const instances: Array<{ scene: InstanceNode; snapshot: NodeSnapshot }> = [];
    const pendingCache: Array<{ key: string; value: unknown }> = [];
    // A root id is not a file identity. Files without a stable key use live capture.
    const cache = figma.fileKey && !options.forceFullCapture ? options.contextCache : undefined;
    let loadedPageCount = 0;
    const environmentStarted = Date.now();
    const variableEnvironment = cache ? await variableEnvironmentReader(() => this.cancelled) : undefined;
    diagnostics.validationMs += Date.now() - environmentStarted;

    for (const [pageIndex, page] of pages.entries()) {
      if (this.cancelled) break;
      onProgress({ phase: "loading-pages", completed: pageIndex, total: pages.length, pageName: page.name, message: `Loading ${page.name}` });
      let stageStarted = Date.now();
      await page.loadAsync();
      diagnostics.pageLoadingMs += Date.now() - stageStarted;
      if (this.cancelled) break;
      loadedPageCount += 1;
      stageStarted = Date.now();
      let exported: ReturnType<typeof restPageFingerprint>;
      if (cache && "exportAsync" in page) {
        try { exported = restPageFingerprint(await page.exportAsync({ format: "JSON_REST_V1" }), page.id); }
        catch { /* Unsupported bulk serialization is a cache miss. */ }
      }
      diagnostics.validationMs += Date.now() - stageStarted;
      const rootNodeIds = page.children.map((node) => node.id);
      let pageNodeCount = 0;
      for (const root of page.children) {
        if (this.cancelled) break;
        const entries = captureEntries(root, page.name);
        stageStarted = Date.now();
        const restRoot = exported?.roots.get(root.id);
        const restNodes = restRoot ? restSubtreeNodes(restRoot) : undefined;
        let fingerprint: string | undefined;
        try {
          if (restRoot && variableEnvironment && restSubtreeCovers(restRoot, entries)) {
            const supplements = entries.map(({ node }) => captureSupplement(node, restNodes?.get(node.id)));
            const environment = await variableEnvironment.fingerprint(supplements);
            if (environment) fingerprint = hashValue({ captureVersion: 1, fileKey: figma.fileKey, pageId: page.id, pageName: page.name, profile, restRoot, metadata: exported?.metadata, supplements, environment });
          }
        } catch {
          // A richer validation getter may be unavailable on an older runtime.
          // Continue through the established full capture instead of trusting it.
        }
        const key = `capture-v1:${page.id}:${root.id}`;
        let snapshots: NodeSnapshot[] | undefined;
        if (cache && fingerprint) {
          try { snapshots = readContextFragment(await cache.get(key), fingerprint, entries.map(({ node }) => node.id)); }
          catch { diagnostics.cacheReadFailures += 1; }
        }
        diagnostics.validationMs += Date.now() - stageStarted;
        if (this.cancelled) break;
        if (snapshots) {
          diagnostics.reusedFragments += 1;
          diagnostics.reusedNodes += snapshots.length;
        } else {
          stageStarted = Date.now();
          snapshots = [];
          for (const [index, entry] of entries.entries()) {
            if (this.cancelled) break;
            snapshots.push(snapshotBase(entry.node, entry.rootId, page.id, entry.path));
            if ((index + 1) % 500 === 0) {
              onProgress({ phase: "indexing", completed: pageIndex, total: pages.length, pageName: page.name, message: `Capturing ${(pageNodeCount + index + 1).toLocaleString()} nodes on ${page.name}` });
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
          }
          diagnostics.captureMs += Date.now() - stageStarted;
          diagnostics.capturedFragments += 1;
          diagnostics.capturedNodes += snapshots.length;
          if (cache && fingerprint && !this.cancelled) pendingCache.push({ key, value: contextFragment(fingerprint, snapshots) });
        }
        if (this.cancelled) break;
        stageStarted = Date.now();
        for (const [index, entry] of entries.entries()) {
          if (this.cancelled) break;
          const snapshot = snapshots[index]!;
          enrichInferences(entry.node, snapshot);
          diagnostics.inferenceNodes += 1;
          nodes[entry.node.id] = snapshot;
          pageNodeCount += 1;
          if (entry.node.type === "COMPONENT" || entry.node.type === "COMPONENT_SET") componentIds.push(entry.node.id);
          if (entry.node.type === "INSTANCE") {
            instanceIds.push(entry.node.id);
            instances.push({ scene: entry.node, snapshot });
          }
          if (pageNodeCount % 500 === 0) {
            onProgress({ phase: "indexing", completed: pageIndex, total: pages.length, pageName: page.name, message: `Indexed ${pageNodeCount.toLocaleString()} nodes on ${page.name}` });
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
        diagnostics.inferenceMs += Date.now() - stageStarted;
      }
      pageSnapshots.push({ id: page.id, name: page.name, role: roleForPage(page.id, profile), loaded: true, nodeCount: pageNodeCount, rootNodeIds });
      if (this.cancelled) break;
      stageStarted = Date.now();
      let resources: DevResourceWithNodeId[] | undefined;
      if ("getDevResourcesAsync" in page) {
        try { resources = await page.getDevResourcesAsync({ includeChildren: true }); }
        catch { /* Older runtimes can still read resources from each root. */ }
      }
      if (!resources) {
        const batches = await mapConcurrent(page.children, 8, async (root) => {
          try { return await root.getDevResourcesAsync({ includeChildren: true }); }
          catch { return []; }
        }, () => this.cancelled);
        resources = batches.flatMap((batch) => batch ?? []);
      }
      for (const resource of resources) {
        const snapshot = nodes[resource.nodeId];
        if (snapshot) snapshot.devResourceCount += 1;
      }
      diagnostics.devResourcesMs += Date.now() - stageStarted;
    }

    let stageStarted = Date.now();
    await mapConcurrent(instances, 16, async ({ scene, snapshot }) => {
      const main = await scene.getMainComponentAsync().catch(() => null);
      snapshot.instance = {
        detached: false,
        ...(main ? { mainComponentId: main.id, mainComponentName: main.name, ...(main.key ? { mainComponentKey: main.key } : {}) } : {}),
      };
    }, () => this.cancelled);
    diagnostics.componentsMs = Date.now() - stageStarted;

    onProgress({ phase: "indexing", completed: loadedPageCount, total: pages.length, message: "Resolving variables and cross-file relationships" });
    stageStarted = Date.now();
    const collections = await this.getCollectionOptions(true, 4_000, true);
    const variables = this.cancelled ? [] : await variableCandidates(collections, nodes, () => this.cancelled, new Set(profile.tokenSourceCollectionKeys));
    diagnostics.variablesMs = Date.now() - stageStarted;
    if (variableEnvironment && !this.cancelled) {
      stageStarted = Date.now();
      const verified = await variableEnvironment.verify();
      diagnostics.validationMs += Date.now() - stageStarted;
      if (!verified && !this.cancelled) throw new Error("Variable values or collections changed while file context was being verified. Run the audit again.");
    }
    stageStarted = Date.now();
    populateGraphMetrics(nodes);
    const partial = {
      schemaVersion: 1 as const,
      fileName: figma.root.name,
      ...(figma.fileKey ? { fileKey: figma.fileKey } : {}),
      builtAt: new Date().toISOString(),
      complete: !this.cancelled && loadedPageCount === pages.length,
      cancelled: this.cancelled,
      pageCount: pages.length,
      loadedPageCount,
      pages: pageSnapshots,
      nodes,
      variables,
      componentIds,
      instanceIds,
      sourceFrameIds: [] as string[],
    };
    partial.sourceFrameIds = sourceFrameIds(partial, profile);
    let graph = finalizeKnowledgeGraph(partial, profile);
    diagnostics.derivedMs = Date.now() - stageStarted;
    if (graph.complete && cache) {
      // The caller's storage port stages these writes until its document-change
      // revision accepts the build; cancellation never publishes partial capture.
      for (const entry of pendingCache) {
        if (this.cancelled) break;
        try { await cache.set(entry.key, entry.value); }
        catch { diagnostics.cacheWriteFailures += 1; }
      }
    }
    if (this.cancelled && graph.complete) graph = finalizeKnowledgeGraph({ ...graph, complete: false, cancelled: true }, profile);
    diagnostics.totalMs = Date.now() - started;
    onProgress({ phase: "complete", completed: loadedPageCount, total: pages.length, message: graph.complete ? "Whole-file knowledge is complete" : "Whole-file knowledge is incomplete" });
    return { graph, collections, diagnostics };
  }

  targetRootIds(target: CapturedAuditTarget, graph: DesignKnowledgeGraph): string[] {
    if (target.scope === "selection") {
      const missingIds = target.nodeIds.filter((id) => {
        const node = graph.nodes[id];
        return !node || !isAuditTargetNodeType(node.type);
      });
      if (missingIds.length > 0) {
        throw new Error("The captured audit selection changed or no longer exists. Select the intended frames, components, or component sets and run the audit again");
      }
      return targetRootIds(target.scope, graph, "", target.nodeIds);
    }
    if (target.scope === "page") return targetRootIds(target.scope, graph, target.pageId, []);
    return targetRootIds(target.scope, graph, "", []);
  }

  async navigate(nodeId: string): Promise<void> {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || !isSceneNode(node)) throw new Error("The finding node no longer exists or cannot be selected");
    const page = findPage(node);
    if (page && page.id !== figma.currentPage.id) await figma.setCurrentPageAsync(page);
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
  }
}

function findPage(node: BaseNode): PageNode | undefined {
  let current: BaseNode | null = node;
  while (current) {
    if (current.type === "PAGE") return current;
    current = current.parent;
  }
  return undefined;
}
