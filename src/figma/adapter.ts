import type {
  BindableField,
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
import { AI_SOURCE_FRAME_ANNOTATION, CERTIFICATION_ANNOTATION_PREFIX, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, SHARED_PLUGIN_DATA_NAMESPACE } from "../core/constants";
import { PRODUCER_IDENTITY } from "../core/build-info";
import { finalizeKnowledgeGraph } from "../core/knowledge";
import { isAuditTargetNodeType, populateGraphMetrics, sourceFrameIds, targetRootIds } from "../core/operations/graph";
import { assertProfileSemantics, profileSemanticErrors, reconcileProfilePages } from "../core/profile";
import { inferProfileFromPages } from "../core/profile-inference";
import { hashValue } from "../core/stable";
import { assessTokenProperty, eligibleTokenFields, propertyBindingEvidence } from "../core/operations/node-fields";
import { isSemanticVariableName } from "../core/operations/semantic-variable";
import {
  buildProjectStyleGuideBinding,
  combineProjectStyleGuidePacks,
  parseProjectStyleGuideBinding,
  parseReferencePack,
} from "../core/knowledge-loop";
import { canReadComponentPropertyDefinitions } from "./operations/component";
import { annotationText } from "./operations/annotations";
import { listVariableCollectionOptions, type VariableCollectionOption } from "./operations/collections";
import { parseCertificationSummary, parseDetachmentIntent, parsePatternConfirmation, parseStoredProfile } from "./operations/shared-data";
import { resolveTextBackground } from "./operations/background";
import { interactionPropertiesSnapshot } from "./operations/interaction-state";
import { mixedTypographyFields, TextStyleEvidenceReader } from "./operations/text-style";
export { resolveTextBackground } from "./operations/background";
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
  producer: typeof PRODUCER_IDENTITY;
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

/** Signals that a tracked edit touched evidence that cannot be refreshed from
 * the current in-memory graph. The caller retries as a verified full rebuild. */
export class FullKnowledgeRebuildRequired extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FullKnowledgeRebuildRequired";
  }
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

function layoutItemSnapshot(node: SceneNode): NodeSnapshot["layoutItem"] {
  const item = node as unknown as Partial<LayoutMixin & AutoLayoutChildrenMixin>;
  if (!("layoutSizingHorizontal" in item) && !("layoutSizingVertical" in item) && !("layoutGrow" in item) && !("layoutPositioning" in item)) return undefined;
  return {
    ...(typeof item.layoutSizingHorizontal === "string" ? { horizontalSizing: item.layoutSizingHorizontal } : {}),
    ...(typeof item.layoutSizingVertical === "string" ? { verticalSizing: item.layoutSizingVertical } : {}),
    ...(typeof item.layoutGrow === "number" && Number.isFinite(item.layoutGrow) ? { grow: item.layoutGrow } : {}),
    ...(typeof item.layoutPositioning === "string" ? { positioning: item.layoutPositioning } : {}),
  };
}

export function textSnapshot(node: SceneNode): NodeSnapshot["text"] {
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
    ...(node.letterSpacing && node.letterSpacing !== figma.mixed ? { letterSpacing: { ...node.letterSpacing } } : {}),
    ...(node.lineHeight && node.lineHeight !== figma.mixed ? { lineHeight: { ...node.lineHeight } } : {}),
    mixedFields: mixedTypographyFields(node),
    charactersLength: node.characters.length,
    contentHash: hashValue(node.characters),
    ...(background.foregroundColor ? { textColor: background.foregroundColor } : solid ? { textColor: { r: solid.color.r, g: solid.color.g, b: solid.color.b, a: (solid.opacity ?? 1) * node.opacity } } : {}),
    ...(background.color ? { backgroundColor: background.color } : {}),
    backgroundResolvable: Boolean(background.foregroundColor) && background.resolvable,
    backgroundSourceNodeIds: background.sourceNodeIds,
    ...(background.reason ? { backgroundReason: background.reason } : {}),
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

function intentionalDetachment(node: SceneNode): NodeSnapshot["intentionalDetachment"] {
  return parseDetachmentIntent(node.getSharedPluginData(SHARED_PLUGIN_DATA_NAMESPACE, DETACHMENT_INTENT_DATA_KEY), node.id);
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

function renderVisible(node: SceneNode): boolean {
  let current: BaseNode | null = node;
  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if ("visible" in current && current.visible === false || "opacity" in current && current.opacity === 0) return false;
    current = current.parent;
  }
  return true;
}

function geometryEvidence(node: SceneNode): Pick<NodeSnapshot, "cornerRadii" | "strokeWeights" | "clipsContent" | "isMask" | "absoluteBounds" | "boundGeometryFields"> {
  const corners = "topLeftRadius" in node ? { topLeft: node.topLeftRadius, topRight: node.topRightRadius, bottomLeft: node.bottomLeftRadius, bottomRight: node.bottomRightRadius } : undefined;
  const weights = "strokeTopWeight" in node ? { top: node.strokeTopWeight, right: node.strokeRightWeight, bottom: node.strokeBottomWeight, left: node.strokeLeftWeight } : undefined;
  const bounds = node.absoluteBoundingBox;
  return {
    ...(corners && Object.values(corners).every((value) => typeof value === "number" && Number.isFinite(value)) ? { cornerRadii: corners } : {}),
    ...(weights && Object.values(weights).every((value) => typeof value === "number" && Number.isFinite(value)) ? { strokeWeights: weights } : {}),
    ...("clipsContent" in node ? { clipsContent: node.clipsContent } : {}),
    ...("isMask" in node ? { isMask: node.isMask } : {}),
    ...(bounds ? { absoluteBounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } } : {}),
    boundGeometryFields: Object.entries(node.boundVariables ?? {}).filter(([, value]) => Boolean(value)).map(([field]) => field),
  };
}

/** Live repair validation feeds the exact same property policy as audit rules. */
export async function tokenPropertySnapshot(node: SceneNode): Promise<NodeSnapshot> {
  const fillData = paintSnapshots(node, "fills");
  const strokeData = paintSnapshots(node, "strokes");
  const text = textSnapshot(node);
  if (node.type === "TEXT" && text) {
    const style = await new TextStyleEvidenceReader().evidence(node, text);
    if (style) text.style = style;
  }
  const layout = layoutSnapshot(node);
  let ancestor = node.parent;
  let instanceAncestor: string | undefined;
  while (ancestor && ancestor.type !== "PAGE" && ancestor.type !== "DOCUMENT") {
    if (ancestor.type === "INSTANCE") { instanceAncestor = ancestor.id; break; }
    ancestor = ancestor.parent;
  }
  const radius = "cornerRadius" in node ? numberOrUndefined(node.cornerRadius) : undefined;
  const weight = "strokeWeight" in node ? numberOrUndefined(node.strokeWeight) : undefined;
  return { id: node.id, rootId: node.id, pageId: "", path: node.name, name: node.name, type: node.type,
    visible: node.visible, renderVisible: renderVisible(node), width: node.width, height: node.height, x: node.x, y: node.y,
    opacity: "opacity" in node ? node.opacity : 1, rotation: 0, childIds: [], descendantCount: 0,
    fills: fillData, strokes: strokeData, effects: [], boundFields: boundFields(node, fillData, strokeData),
    boundVariableIds: boundVariableIds(node, fillData, strokeData), inferredBindings: {}, hasAnnotations: false, devResourceCount: 0, exportSettings: [],
    ...geometryEvidence(node), ...(text ? { text } : {}), ...(layout ? { layout } : {}),
    ...(radius !== undefined ? { cornerRadius: radius } : {}), ...(weight !== undefined ? { strokeWeight: weight } : {}),
    ...(instanceAncestor ? { evidenceRole: "instance-descendant", owningInstanceId: instanceAncestor } : {}),
  };
}

type InstanceProvenance = Pick<NonNullable<NodeSnapshot["instance"]>, "overridesKnown" | "directOverrideFields" | "scaleFactor">;

interface CapturedInstanceEvidence {
  provenance: InstanceProvenance;
  fieldsByNodeId: ReadonlyMap<string, readonly string[]>;
}

function captureInstanceEvidence(node: InstanceNode): CapturedInstanceEvidence {
  try {
    const overridesKnown = Array.isArray(node.overrides);
    const fieldsByNodeId = new Map<string, string[]>();
    if (overridesKnown) {
      for (const entry of node.overrides) {
        const fields = fieldsByNodeId.get(entry.id) ?? [];
        fields.push(...entry.overriddenFields);
        fieldsByNodeId.set(entry.id, [...new Set(fields)].sort());
      }
    }
    return {
      provenance: {
        overridesKnown,
        ...(overridesKnown ? { directOverrideFields: [...(fieldsByNodeId.get(node.id) ?? [])] } : {}),
        ...(Number.isFinite(node.scaleFactor) ? { scaleFactor: node.scaleFactor } : {}),
      },
      fieldsByNodeId,
    };
  } catch { return { provenance: { overridesKnown: false }, fieldsByNodeId: new Map() }; }
}

function instanceProvenance(node: InstanceNode): InstanceProvenance {
  return captureInstanceEvidence(node).provenance;
}

function annotateInstanceDescendants(
  snapshots: Iterable<NodeSnapshot>,
  ownerId: string,
  evidence: CapturedInstanceEvidence,
): void {
  for (const snapshot of snapshots) {
    if (snapshot.owningInstanceId !== ownerId) continue;
    const directOverrideFields = evidence.fieldsByNodeId.get(snapshot.id);
    snapshot.instanceEvidence = {
      overridesKnown: evidence.provenance.overridesKnown ?? false,
      ...(directOverrideFields ? { directOverrideFields: [...directOverrideFields] } : {}),
      ...(evidence.provenance.scaleFactor !== undefined ? { scaleFactor: evidence.provenance.scaleFactor } : {}),
    };
  }
}

function pointerInteraction(node: SceneNode): boolean | undefined {
  try { return "reactions" in node ? node.reactions.some((reaction) => reaction.trigger?.type === "ON_CLICK") : false; }
  catch { return undefined; }
}

function snapshotBase(node: SceneNode, rootId: string, pageId: string, path: string): NodeSnapshot {
  const fillData = paintSnapshots(node, "fills");
  const strokeData = paintSnapshots(node, "strokes");
  const effectData = effectSnapshots(node);
  const radius = "cornerRadius" in node ? numberOrUndefined(node.cornerRadius) : undefined;
  const strokeWeight = "strokeWeight" in node ? numberOrUndefined(node.strokeWeight) : undefined;
  // Instance descendants are captured selectively as rendering occurrences.
  // Their graph links are assigned after traversal so decorative internals do
  // not become source structure or keep a large library graph alive twice.
  const children = node.type !== "INSTANCE" && hasChildren(node) ? node.children.map((child) => child.id) : [];
  const detached = "detachedInfo" in node && node.detachedInfo !== null;
  const layout = layoutSnapshot(node);
  const text = textSnapshot(node);
  const variantProperties = variantPropertiesSnapshot(node);
  const component = componentSnapshot(node);
  const signature = structuralSignature(node);
  const certification = certificationSummary(node);
  const patternConfirmation = confirmedPattern(node);
  const detachmentIntent = intentionalDetachment(node);
  const annotationTexts = "annotations" in node ? node.annotations.map(annotationText) : [];
  const devStatus = devStatusSnapshot(node);
  return {
    ...geometryEvidence(node),
    renderVisible: renderVisible(node),
    ...((value) => value === undefined ? {} : { hasPointerInteraction: value })(pointerInteraction(node)),
    ...((value) => value ? { interactionProperties: value } : {})(interactionPropertiesSnapshot(node)),
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
    ...((value) => value ? { layoutItem: value } : {})(layoutItemSnapshot(node)),
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
    ...(detachmentIntent ? { intentionalDetachment: detachmentIntent } : {}),
  };
}


interface CaptureEntry {
  node: SceneNode;
  rootId: string;
  path: string;
  owningInstanceId?: string;
}

function captureEntries(root: SceneNode, pageName: string, identity?: { rootId: string; path: string }): CaptureEntry[] {
  const entries: CaptureEntry[] = [];
  const stack: Array<CaptureEntry & { include: boolean }> = [{ node: root, rootId: identity?.rootId ?? root.id, path: identity?.path ?? `${pageName} / ${root.name}`, include: true }];
  while (stack.length > 0) {
    const entry = stack.pop()!;
    if (entry.include) entries.push(entry);
    if (hasChildren(entry.node)) {
      const occurrenceOwner = entry.node.type === "INSTANCE" ? entry.node.id : entry.owningInstanceId;
      for (let index = entry.node.children.length - 1; index >= 0; index -= 1) {
        const child = entry.node.children[index];
        if (!child || occurrenceOwner && !child.visible) continue;
        // Contrast needs visible text occurrences. Target-size/state evidence
        // additionally needs explicit prototype targets and nested instances,
        // but decorative vectors and layout wrappers are already represented
        // by their source component and must not multiply the source graph.
        const include = !occurrenceOwner || child.type === "TEXT" || child.type === "INSTANCE" || pointerInteraction(child) === true;
        stack.push({ node: child, rootId: root.id, path: `${entry.path} / ${child.name}`, include,
          ...(occurrenceOwner ? { owningInstanceId: occurrenceOwner } : {}) });
      }
    }
  }
  return entries;
}

interface CaptureFragmentEntries {
  root: SceneNode;
  entries: CaptureEntry[];
}

/** Sections organize independent sources. Their own metadata stays in a small
 * header fragment while each child source retains the original graph ownership. */
function captureFragments(root: SceneNode, pageName: string): CaptureFragmentEntries[] {
  const fragments = new Map<string, CaptureFragmentEntries>();
  const ownerByNodeId = new Map<string, string>();
  const sourceTypes = new Set(["FRAME", "GROUP", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION"]);
  for (const entry of captureEntries(root, pageName)) {
    const startsFragment = entry.node.id === root.id || entry.node.parent?.type === "SECTION" && sourceTypes.has(entry.node.type);
    const fragmentId = startsFragment ? entry.node.id : ownerByNodeId.get(entry.node.parent?.id ?? "") ?? entry.owningInstanceId ?? root.id;
    ownerByNodeId.set(entry.node.id, fragmentId);
    let fragment = fragments.get(fragmentId);
    if (!fragment) { fragment = { root: entry.node, entries: [] }; fragments.set(fragmentId, fragment); }
    fragment.entries.push(entry);
  }
  return [...fragments.values()];
}

const FRAGMENT_SOURCE_TYPES = new Set(["FRAME", "GROUP", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION"]);

/** Finds the independently cached source that owns a changed scene node. */
function liveFragmentRoot(node: SceneNode): SceneNode {
  let current = node;
  while (current.parent && current.parent.type !== "PAGE" && current.parent.type !== "DOCUMENT") {
    if (current.parent.type === "SECTION" && FRAGMENT_SOURCE_TYPES.has(current.type)) return current;
    current = current.parent as SceneNode;
  }
  return current;
}

function graphDescendantIds(nodes: Record<string, NodeSnapshot>, rootId: string): string[] {
  const output: string[] = [];
  const pending = [rootId];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const id = pending.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = nodes[id];
    if (!node) continue;
    output.push(id);
    pending.push(...node.childIds);
  }
  return output;
}

function* capturePageFragments(roots: readonly SceneNode[], pageName: string): Generator<CaptureFragmentEntries> {
  for (const root of roots) yield* captureFragments(root, pageName);
}

/** Parent child IDs are validated live, without hashing every child source twice. */
function restFragmentRoot(root: Record<string, unknown>, entries: readonly CaptureEntry[]): Record<string, unknown> {
  if (root.type !== "SECTION") return root;
  const included = new Set(entries.map((entry) => entry.node.id));
  const project = (value: Record<string, unknown>): Record<string, unknown> => ({ ...value,
    ...(Array.isArray(value.children) ? { children: value.children.filter((child: unknown) => child && typeof child === "object" && "id" in child && typeof child.id === "string" && included.has(child.id))
      .map((child: Record<string, unknown>) => project(child)) } : {}) });
  return project(root);
}

/** Inputs whose Plugin API representation is richer than the bulk REST export. */
function captureSupplement(node: SceneNode, raw: Record<string, unknown> | undefined): unknown {
  return {
    id: node.id,
    name: node.name,
    parentId: node.parent?.id,
    childIds: hasChildren(node) ? node.children.filter((child) => node.type !== "INSTANCE" || child.visible).map((child) => child.id) : [],
    geometry: geometryEvidence(node),
    renderVisible: renderVisible(node),
    pointerInteraction: pointerInteraction(node),
    interactionProperties: interactionPropertiesSnapshot(node),
    instanceProvenance: node.type === "INSTANCE" ? instanceProvenance(node) : undefined,
    visible: node.visible,
    width: node.width,
    height: node.height,
    x: node.x,
    y: node.y,
    rotation: "rotation" in node ? node.rotation : 0,
    opacity: "opacity" in node ? node.opacity : 1,
    layout: layoutSnapshot(node),
    layoutItem: layoutItemSnapshot(node),
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
      textStyleId: node.textStyleId === figma.mixed ? "mixed" : node.textStyleId,
      mixedFields: mixedTypographyFields(node),
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
    detachmentIntent: node.getSharedPluginData(SHARED_PLUGIN_DATA_NAMESPACE, DETACHMENT_INTENT_DATA_KEY),
  };
}

function enrichLiveEvidence(node: SceneNode, snapshot: NodeSnapshot): void {
  for (const field of ["cornerRadii", "strokeWeights", "clipsContent", "isMask", "absoluteBounds", "boundGeometryFields"] as const) delete snapshot[field];
  snapshot.renderVisible = renderVisible(node);
  Object.assign(snapshot, geometryEvidence(node));
  const item = layoutItemSnapshot(node);
  if (item) snapshot.layoutItem = item;
  else delete snapshot.layoutItem;
  const detachmentIntent = intentionalDetachment(node);
  if (detachmentIntent) snapshot.intentionalDetachment = detachmentIntent;
  else delete snapshot.intentionalDetachment;
  const pointer = pointerInteraction(node);
  if (pointer === undefined) delete snapshot.hasPointerInteraction;
  else snapshot.hasPointerInteraction = pointer;
  if (node.type === "TEXT" && snapshot.text && snapshot.text.mixedFields === undefined) {
    // Cached fragments deliberately omit evidence that must be read from the
    // live Plugin API. Replace the complete text snapshot so colors and the
    // resolvability decision cannot survive from a stale rendering context.
    const liveText = textSnapshot(node);
    if (liveText) snapshot.text = liveText;
  }
  const interaction = interactionPropertiesSnapshot(node);
  if (interaction) snapshot.interactionProperties = interaction;
  else delete snapshot.interactionProperties;
}

/** Only query Figma's expensive inference bridge when a rule can use its result.
 * Keep layout inference independent: a fully token-bound source may still need
 * a guarded layout repair. Rendering-only instance descendants own neither. */
function tokenInferenceFields(snapshot: NodeSnapshot): BindableField[] {
  return eligibleTokenFields(snapshot).filter((field) => assessTokenProperty(snapshot, field).repairable && !propertyBindingEvidence(snapshot, field));
}

function enrichInferences(node: SceneNode, snapshot: NodeSnapshot, tokenFields: readonly BindableField[]): boolean {
  const inferred = tokenFields.length > 0 ? node.inferredVariables : undefined;
  snapshot.inferredBindings = inferredBindings(inferred);
  if (node.type !== "TEXT") for (const field of ["fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent"] as BindableField[]) delete snapshot.inferredBindings[field];
  snapshot.fills.forEach((paint, index) => { paint.inferredVariableIds = (inferred?.fills?.[index] ?? []).map((alias) => alias.id); });
  snapshot.strokes.forEach((paint, index) => { paint.inferredVariableIds = (inferred?.strokes?.[index] ?? []).map((alias) => alias.id); });
  const needsLayoutInference = snapshot.evidenceRole !== "instance-descendant" && snapshot.layout?.mode === "NONE"
    && (node.type === "FRAME" || node.type === "COMPONENT") && snapshot.childIds.length >= 2 && "inferredAutoLayout" in node;
  if (snapshot.layout) snapshot.layout.inferredAvailable = Boolean(needsLayoutInference && node.inferredAutoLayout !== null);
  return tokenFields.length > 0 || needsLayoutInference;
}

function bindingSignature(node: SceneNode): string {
  const instanceCapture = node.type === "INSTANCE" ? captureInstanceEvidence(node) : undefined;
  return hashValue({ boundVariables: node.boundVariables, explicitModes: node.explicitVariableModes,
    resolvedModes: node.resolvedVariableModes,
    paintBindings: { fills: "fills" in node ? paints(node.fills).map((paint) => paint.type === "SOLID" ? paint.boundVariables : undefined) : [],
      strokes: "strokes" in node ? paints(node.strokes).map((paint) => paint.type === "SOLID" ? paint.boundVariables : undefined) : [] },
    textStyleId: node.type === "TEXT" ? node.textStyleId === figma.mixed ? "mixed" : node.textStyleId : undefined,
    effectStyleId: "effectStyleId" in node ? node.effectStyleId : undefined,
    instanceOverrides: instanceCapture?.provenance.overridesKnown
      ? [...instanceCapture.fieldsByNodeId.entries()].map(([id, fields]) => ({ id, fields: [...fields] })).sort((left, right) => left.id.localeCompare(right.id))
      : instanceCapture ? "unavailable" : undefined,
    instanceScaleFactor: node.type === "INSTANCE" && Number.isFinite(node.scaleFactor) ? node.scaleFactor : undefined,
    patternResolution: node.getSharedPluginData(SHARED_PLUGIN_DATA_NAMESPACE, "pattern-resolution-v1"),
    detachmentIntent: node.getSharedPluginData(SHARED_PLUGIN_DATA_NAMESPACE, DETACHMENT_INTENT_DATA_KEY) });
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
  localCollectionKeys: ReadonlySet<string>;
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
    interface Dependencies { variables: Map<string, VariableDescription>; collections: Map<string, Description>; missingVariables: Set<string>; missingCollections: Set<string> }
    const descriptions = new Map<string, Promise<VariableDescription | undefined>>();
    const collectionDescriptions = new Map<string, Promise<Description | undefined>>();
    const describeVariable = (id: string): Promise<VariableDescription | undefined> => {
      let request = descriptions.get(id);
      if (!request) {
        request = (async () => {
          const variable = localById.get(id) ?? await figma.variables.getVariableByIdAsync(id);
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
          const collection = collectionsById.get(id) ?? await figma.variables.getVariableCollectionByIdAsync(id);
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
      const result: Dependencies = { variables: new Map(), collections: new Map(), missingVariables: new Set(), missingCollections: new Set() };
      while (pending.length > 0) {
        if (cancelled()) return undefined;
        const batch = [...new Set(pending.splice(0, 16))].filter((id) => !seen.has(id));
        batch.forEach((id) => { seen.add(id); });
        const resolved = await Promise.all(batch.map(describeVariable));
        for (const [index, variable] of resolved.entries()) {
          if (!variable) { result.missingVariables.add(batch[index]!); continue; }
          const collection = await describeCollection(variable.collectionId);
          result.variables.set(batch[index]!, variable);
          if (collection) result.collections.set(variable.collectionId, collection);
          else result.missingCollections.add(variable.collectionId);
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
    // Empty collections still affect configured token sources and mode names.
    for (const collection of localCollections) {
      const description = await describeCollection(collection.id);
      if (description) base.collections.set(collection.id, description);
    }
    const baseDigest = hashValue(materialFor(base));
    const baseIds = new Set(base.variables.keys());
    const extras = new Map<string, Promise<{ digest: string; dependencies: Dependencies } | undefined>>();
    const used: Dependencies = { variables: new Map(), collections: new Map(), missingVariables: new Set(), missingCollections: new Set() };
    const recordUsed = (dependencies: Dependencies) => {
      dependencies.variables.forEach((value, id) => { used.variables.set(id, value); });
      dependencies.collections.forEach((value, id) => { used.collections.set(id, value); });
      dependencies.missingVariables.forEach((id) => { used.missingVariables.add(id); });
      dependencies.missingCollections.forEach((id) => { used.missingCollections.add(id); });
    };
    let baseRecorded = false;
    const recordedExtras = new Set<string>();
    const recordBase = () => { if (!baseRecorded) { recordUsed(base); baseRecorded = true; } };
    recordBase();
    const complete = (dependencies: Dependencies) => dependencies.missingVariables.size === 0 && dependencies.missingCollections.size === 0;
    return {
      localCollectionKeys: new Set(localCollections.map((collection) => collection.key)),
      fingerprint: async (supplements) => {
        const ids = [...variableAliases(supplements)].filter((id) => !baseIds.has(id)).sort();
        if (ids.length === 0) return complete(base) ? baseDigest : undefined;
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
        return complete(base) && complete(extra.dependencies) ? extra.digest : undefined;
      },
      verify: async () => {
        // Variable edits are not covered by documentchange. Recheck the frozen
        // dependency epoch at audit boundaries without recapturing scene nodes.
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
          const missingVariables = await mapConcurrent([...used.missingVariables], 16, async (id) => !await figma.variables.getVariableByIdAsync(id), cancelled);
          const missingCollections = await mapConcurrent([...used.missingCollections], 8, async (id) => !await figma.variables.getVariableCollectionByIdAsync(id), cancelled);
          return !cancelled() && variableMatches.every(Boolean) && collectionMatches.every(Boolean)
            && missingVariables.every(Boolean) && missingCollections.every(Boolean);
        } catch { return false; }
      },
    };
  } catch {
    // Cache provenance is unavailable; live capture remains the authority.
    return undefined;
  }
}

function referencedVariableIds(nodes: Record<string, NodeSnapshot>): string[] {
  const ids = new Set<string>();
  for (const node of Object.values(nodes)) {
    for (const values of [...Object.values(node.boundVariableIds), ...Object.values(node.inferredBindings)]) {
      for (const id of values ?? []) ids.add(id);
    }
    for (const paint of [...node.fills, ...node.strokes]) {
      if (paint.boundVariableId) ids.add(paint.boundVariableId);
      for (const id of paint.inferredVariableIds) ids.add(id);
    }
    for (const effect of node.effects) for (const id of effect.boundVariableIds) ids.add(id);
  }
  return [...ids];
}

async function variableCandidates(
  options: VariableCollectionOption[],
  nodes: Record<string, NodeSnapshot>,
  cancelled: () => boolean,
  approvedCollectionKeys: ReadonlySet<string>,
  recordLibrary?: (key: string, variables: LibraryVariable[] | undefined) => void,
): Promise<VariableCandidate[]> {
  const isSemanticVariable = (name: string, collectionName: string): boolean => (
    /^semantic(?:\s|$)/i.test(collectionName.trim()) || isSemanticVariableName(name)
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

  const referencedIds = referencedVariableIds(nodes);
  const knownIds = new Set(output.map((variable) => variable.id));
  const collectionRequests = new Map<string, Promise<VariableCollection | null>>();
  const getCollection = (id: string): Promise<VariableCollection | null> => {
    const local = localCollections.get(id);
    if (local) return Promise.resolve(local);
    let request = collectionRequests.get(id);
    if (!request) {
      request = figma.variables.getVariableCollectionByIdAsync(id);
      collectionRequests.set(id, request);
    }
    return request;
  };
  const referenced = await mapConcurrent([...referencedIds].filter((id) => !knownIds.has(id)), 8, async (id): Promise<VariableCandidate | undefined> => {
    // A rejected grading read must abort the build even if epoch reads before
    // and after it succeed. Only an actual null establishes missing evidence.
    const variable = await figma.variables.getVariableByIdAsync(id);
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
    recordLibrary?.(remote[index]!.key, variables);
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
  private verifyResourceEnvironment: (() => Promise<boolean>) | undefined;
  private sceneSignatures = new Map<string, string>();
  private sessionInferences = new Map<string, { fingerprint: string; nodes: NodeSnapshot[] }>();

  async matchesVariableEnvironment(): Promise<boolean> {
    try { return Boolean(await this.verifyResourceEnvironment?.()) && await this.matchesSceneSignatures(); }
    catch { return false; }
  }

  private async matchesSceneSignatures(ignored = new Set<string>()): Promise<boolean> {
    const entries = [...this.sceneSignatures].filter(([id]) => !ignored.has(id));
    const matches = await mapConcurrent(entries, 32, async ([id, digest]) => {
      const node = await figma.getNodeByIdAsync(id).catch(() => null);
      try { return Boolean(node && isSceneNode(node) && !node.removed && bindingSignature(node) === digest); }
      catch { return false; }
    }, () => this.cancelled);
    return !this.cancelled && matches.every(Boolean);
  }

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
    const stored = figma.root.getSharedPluginData("verndaleAiReady", "profile-v2")
      || figma.root.getSharedPluginData("verndaleAiReady", "profile-v1");
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
      producer: { ...PRODUCER_IDENTITY },
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
    const incoming = parseReferencePack(raw, "style-guide");
    const pack = combineProjectStyleGuidePacks(this.getProjectStyleGuideBinding()?.pack, incoming);
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
    figma.root.setSharedPluginData("verndaleAiReady", "profile-v2", JSON.stringify(profile));
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

  /**
   * Refresh a tracked property edit from the current graph. This path avoids
   * materializing a second whole-file graph: it stages changed fragments,
   * verifies the resource epoch, and only then replaces those fragments in the
   * previous graph. Structural and resource-sensitive edits are routed to the
   * full builder by the caller.
   */
  private async refreshTrackedFragments(
    previous: DesignKnowledgeGraph,
    profile: ReadinessProfile,
    onProgress: (progress: ScanProgress) => void,
    options: { contextCache?: ContextCachePort; dirtyNodeIds: readonly string[]; previousCollections?: readonly VariableCollectionOption[] },
  ): Promise<KnowledgeBuildResult> {
    const started = Date.now();
    const diagnostics = newBuildDiagnostics();
    const priorResourceVerifier = this.verifyResourceEnvironment;
    if (!priorResourceVerifier) throw new FullKnowledgeRebuildRequired("The previous resource epoch is unavailable");
    const resourceFingerprint = previous.resourceFingerprint;
    if (!resourceFingerprint) throw new FullKnowledgeRebuildRequired("The previous resource fingerprint is unavailable");
    let stageStarted = Date.now();
    if (!await priorResourceVerifier()) throw new FullKnowledgeRebuildRequired("Variables, styles, or libraries changed outside the tracked scene edit");
    diagnostics.validationMs += Date.now() - stageStarted;
    if (this.cancelled) throw new FullKnowledgeRebuildRequired("The incremental refresh was cancelled");

    stageStarted = Date.now();
    const variableEnvironment = await variableEnvironmentReader(() => this.cancelled);
    diagnostics.variablesMs += Date.now() - stageStarted;
    if (!variableEnvironment) throw new FullKnowledgeRebuildRequired("Variable provenance could not be verified incrementally");

    const dirtyScenes: SceneNode[] = [];
    for (const id of [...new Set(options.dirtyNodeIds)]) {
      const node = await figma.getNodeByIdAsync(id);
      if (!node || !isSceneNode(node) || node.removed) throw new FullKnowledgeRebuildRequired("A tracked node was deleted or is no longer a scene node");
      dirtyScenes.push(node);
    }
    if (dirtyScenes.length === 0) throw new FullKnowledgeRebuildRequired("No tracked scene edits were available");

    const affectedRoots = new Map<string, SceneNode>();
    const sourceComponentIds = new Set<string>();
    const addAffectedRoot = (node: SceneNode): void => {
      const root = liveFragmentRoot(node);
      // A section owns independently cached child sources. Changes to the
      // section itself can affect every child and therefore require a full pass.
      if (root.type === "SECTION") throw new FullKnowledgeRebuildRequired("A section-level change affects multiple source fragments");
      affectedRoots.set(root.id, root);
    };
    for (const scene of dirtyScenes) {
      addAffectedRoot(scene);
      let current: BaseNode | null = scene;
      while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
        if (current.type === "COMPONENT" || current.type === "COMPONENT_SET") sourceComponentIds.add(current.id);
        current = current.parent;
      }
      if (scene.type === "COMPONENT_SET") {
        for (const id of graphDescendantIds(previous.nodes, scene.id)) {
          if (previous.nodes[id]?.type === "COMPONENT") sourceComponentIds.add(id);
        }
      }
    }
    if (sourceComponentIds.size > 0) {
      for (const instanceId of previous.instanceIds) {
        const mainId = previous.nodes[instanceId]?.instance?.mainComponentId;
        if (!mainId || !sourceComponentIds.has(mainId)) continue;
        const instance = await figma.getNodeByIdAsync(instanceId);
        if (!instance || instance.type !== "INSTANCE" || instance.removed) throw new FullKnowledgeRebuildRequired("A component consumer changed structurally");
        addAffectedRoot(instance);
      }
    }

    // Retain only outermost roots when a source and one of its descendants are
    // both present in the dependency closure.
    for (const [id, root] of [...affectedRoots]) {
      let parent = root.parent;
      while (parent && parent.type !== "PAGE" && parent.type !== "DOCUMENT") {
        if (affectedRoots.has(parent.id)) { affectedRoots.delete(id); break; }
        parent = parent.parent;
      }
    }
    const affectedPreviousIds = new Set<string>();
    for (const root of affectedRoots.values()) for (const id of graphDescendantIds(previous.nodes, root.id)) affectedPreviousIds.add(id);
    if (!await this.matchesSceneSignatures(affectedPreviousIds)) {
      throw new FullKnowledgeRebuildRequired("An untracked scene binding or confirmation changed");
    }

    const styles = new TextStyleEvidenceReader();
    const staged: Array<{ root: SceneNode; page: PageNode; key: string; fingerprint: string; snapshots: NodeSnapshot[]; signatures: Array<[string, string]> }> = [];
    const rootsByPage = new Map<string, { page: PageNode; roots: SceneNode[] }>();
    for (const root of affectedRoots.values()) {
      const page = findPage(root);
      if (!page) throw new FullKnowledgeRebuildRequired("An affected source is detached from its page");
      const group = rootsByPage.get(page.id) ?? { page, roots: [] };
      group.roots.push(root);
      rootsByPage.set(page.id, group);
    }
    const pageGroups = [...rootsByPage.values()];
    let completedPages = 0;
    for (const { page, roots } of pageGroups) {
      onProgress({ phase: "loading-pages", completed: completedPages, total: pageGroups.length, pageName: page.name,
        message: `Refreshing ${roots.length} affected source${roots.length === 1 ? "" : "s"} on ${page.name}` });
      stageStarted = Date.now();
      await page.loadAsync();
      diagnostics.pageLoadingMs += Date.now() - stageStarted;
      let exported: ReturnType<typeof restPageFingerprint>;
      if (options.contextCache && "exportAsync" in page) {
        try { exported = restPageFingerprint(await page.exportAsync({ format: "JSON_REST_V1" }), page.id); }
        catch { /* A missing validation export requires the conservative path. */ }
      }
      if (!exported) throw new FullKnowledgeRebuildRequired("The affected page could not be fingerprinted");
      const restNodes = new Map([...exported.roots.values()].flatMap((root) => [...restSubtreeNodes(root)]));
      for (const root of roots) {
        if (this.cancelled) throw new FullKnowledgeRebuildRequired("The incremental refresh was cancelled");
        const previousRoot = previous.nodes[root.id];
        if (!previousRoot) throw new FullKnowledgeRebuildRequired("An affected source is absent from the current graph");
        const entries = captureEntries(root, page.name, { rootId: previousRoot.rootId, path: (() => {
          const names: string[] = [];
          let current: BaseNode | null = root;
          while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") { names.push(current.name); current = current.parent; }
          return `${page.name} / ${names.reverse().join(" / ")}`;
        })() });
        const exportedRoot = restNodes.get(root.id);
        const supplements = entries.map(({ node, rootId, path }) => ({ rootId, path, node: captureSupplement(node, restNodes.get(node.id)) }));
        stageStarted = Date.now();
        const environment = exportedRoot && restSubtreeCovers(exportedRoot, entries) ? await variableEnvironment.fingerprint(supplements) : undefined;
        const fingerprint = environment ? hashValue({ captureVersion: 2, fileKey: figma.fileKey, pageId: page.id, pageName: page.name,
          profile, restRoot: exportedRoot, metadata: exported.metadata, supplements, environment }) : undefined;
        diagnostics.validationMs += Date.now() - stageStarted;
        if (!fingerprint) throw new FullKnowledgeRebuildRequired("An affected source has incomplete dependency evidence");

        stageStarted = Date.now();
        const snapshots = entries.map((entry) => snapshotBase(entry.node, entry.rootId, page.id, entry.path));
        const signatures: Array<[string, string]> = [];
        diagnostics.captureMs += Date.now() - stageStarted;
        diagnostics.capturedFragments += 1;
        diagnostics.capturedNodes += snapshots.length;
        const occurrenceChildren = new Map<string, string[]>();
        for (const entry of entries) {
          if (!entry.owningInstanceId) continue;
          occurrenceChildren.set(entry.owningInstanceId, [...(occurrenceChildren.get(entry.owningInstanceId) ?? []), entry.node.id]);
        }
        const instances: Array<{ scene: InstanceNode; snapshot: NodeSnapshot }> = [];
        stageStarted = Date.now();
        for (const [index, entry] of entries.entries()) {
          const snapshot = snapshots[index]!;
          if (entry.owningInstanceId) {
            snapshot.evidenceRole = "instance-descendant";
            snapshot.owningInstanceId = entry.owningInstanceId;
            snapshot.parentId = entry.owningInstanceId;
            snapshot.childIds = entry.node.type === "INSTANCE" ? occurrenceChildren.get(entry.node.id) ?? [] : [];
          } else if (entry.node.type === "INSTANCE") snapshot.childIds = occurrenceChildren.get(entry.node.id) ?? [];
          enrichLiveEvidence(entry.node, snapshot);
          if (entry.node.type === "TEXT" && snapshot.text) {
            const style = await styles.evidence(entry.node, snapshot.text);
            if (style) snapshot.text.style = style;
          }
          if (enrichInferences(entry.node, snapshot, tokenInferenceFields(snapshot))) diagnostics.inferenceNodes += 1;
          signatures.push([entry.node.id, bindingSignature(entry.node)]);
          if (entry.node.type === "INSTANCE") instances.push({ scene: entry.node, snapshot });
        }
        diagnostics.inferenceMs += Date.now() - stageStarted;
        stageStarted = Date.now();
        const snapshotsById = new Map(snapshots.map((candidate) => [candidate.id, candidate]));
        await mapConcurrent(instances, 16, async ({ scene, snapshot }) => {
          const main = await scene.getMainComponentAsync().catch(() => null);
          const evidence = captureInstanceEvidence(scene);
          snapshot.instance = { detached: false, ...evidence.provenance,
            ...(main ? { mainComponentId: main.id, mainComponentName: main.name, ...(main.key ? { mainComponentKey: main.key } : {}) } : {}) };
          annotateInstanceDescendants(snapshot.childIds.map((id) => snapshotsById.get(id)).filter((candidate): candidate is NodeSnapshot => Boolean(candidate)), scene.id, evidence);
        }, () => this.cancelled);
        diagnostics.componentsMs += Date.now() - stageStarted;
        stageStarted = Date.now();
        let resources: DevResourceWithNodeId[] = [];
        try { resources = await root.getDevResourcesAsync({ includeChildren: true }); } catch { /* Missing resources remain zero. */ }
        for (const resource of resources) {
          const index = entries.findIndex((entry) => entry.node.id === resource.nodeId);
          if (index >= 0) snapshots[index]!.devResourceCount += 1;
        }
        diagnostics.devResourcesMs += Date.now() - stageStarted;
        staged.push({ root, page, key: `capture-v1:${page.id}:${root.id}`, fingerprint, snapshots, signatures });
      }
      completedPages += 1;
    }

    stageStarted = Date.now();
    if (!await variableEnvironment.verify() || !await styles.verify() || !await priorResourceVerifier()
      || !await this.matchesSceneSignatures(affectedPreviousIds)) {
      throw new FullKnowledgeRebuildRequired("Resources changed while affected sources were refreshed");
    }
    diagnostics.validationMs += Date.now() - stageStarted;

    for (const { key, fingerprint, snapshots } of staged) {
      if (options.contextCache) {
        try { await options.contextCache.set(key, contextFragment(fingerprint, snapshots)); }
        catch { diagnostics.cacheWriteFailures += 1; }
      }
    }

    // No asynchronous work occurs after this point. The caller's build token
    // rejects a concurrent document event before publishing the returned graph.
    stageStarted = Date.now();
    for (const id of affectedPreviousIds) delete previous.nodes[id];
    for (const { snapshots } of staged) for (const snapshot of snapshots) previous.nodes[snapshot.id] = snapshot;
    populateGraphMetrics(previous.nodes);
    const counts = new Map<string, number>();
    for (const node of Object.values(previous.nodes)) counts.set(node.pageId, (counts.get(node.pageId) ?? 0) + 1);
    const pages = previous.pages.map((page) => ({ ...page, role: roleForPage(page.id, profile), nodeCount: counts.get(page.id) ?? 0 }));
    const componentIds = Object.values(previous.nodes).filter((node) => node.type === "COMPONENT" || node.type === "COMPONENT_SET").map((node) => node.id);
    const instanceIds = Object.values(previous.nodes).filter((node) => node.type === "INSTANCE").map((node) => node.id);
    const partial = {
      schemaVersion: 1 as const,
      resourceFingerprint,
      fileName: figma.root.name,
      ...(figma.fileKey ? { fileKey: figma.fileKey } : {}),
      builtAt: new Date().toISOString(), complete: true, cancelled: false,
      pageCount: pages.length, loadedPageCount: pages.length, pages, nodes: previous.nodes,
      variables: previous.variables, componentIds, instanceIds, sourceFrameIds: [] as string[],
    };
    partial.sourceFrameIds = sourceFrameIds(partial, profile);
    const graph = finalizeKnowledgeGraph(partial, profile);
    diagnostics.derivedMs += Date.now() - stageStarted;
    diagnostics.reusedNodes = Math.max(0, Object.keys(graph.nodes).length - diagnostics.capturedNodes);
    diagnostics.reusedFragments = Math.max(0, this.sessionInferences.size - diagnostics.capturedFragments);
    for (const { key, fingerprint, snapshots } of staged) {
      this.sessionInferences.set(key, { fingerprint, nodes: snapshots });
    }
    for (const id of affectedPreviousIds) this.sceneSignatures.delete(id);
    for (const { signatures } of staged) for (const [id, digest] of signatures) this.sceneSignatures.set(id, digest);
    this.verifyResourceEnvironment = async () => await priorResourceVerifier() && await variableEnvironment.verify() && await styles.verify();
    diagnostics.totalMs = Date.now() - started;
    onProgress({ phase: "complete", completed: pageGroups.length, total: pageGroups.length,
      message: `Refreshed ${staged.length} affected source${staged.length === 1 ? "" : "s"}` });
    return { graph, collections: [...(options.previousCollections ?? [])], diagnostics };
  }

  async buildKnowledge(
    profile: ReadinessProfile,
    onProgress: (progress: ScanProgress) => void,
    options: { contextCache?: ContextCachePort; forceFullCapture?: boolean; dirtyNodeIds?: readonly string[];
      previousGraph?: DesignKnowledgeGraph; previousCollections?: readonly VariableCollectionOption[] } = {},
  ): Promise<KnowledgeBuildResult> {
    if (options.previousGraph && options.dirtyNodeIds?.length && !options.forceFullCapture) {
      return this.refreshTrackedFragments(options.previousGraph, profile, onProgress, {
        ...(options.contextCache ? { contextCache: options.contextCache } : {}),
        dirtyNodeIds: options.dirtyNodeIds,
        ...(options.previousCollections ? { previousCollections: options.previousCollections } : {}),
      });
    }
    this.verifyResourceEnvironment = undefined;
    if (options.forceFullCapture) {
      this.sessionInferences.clear();
      this.sceneSignatures.clear();
    }
    const started = Date.now();
    const diagnostics = newBuildDiagnostics();
    const pages = figma.root.children;
    const nodes: Record<string, NodeSnapshot> = {};
    const pageSnapshots: PageSnapshot[] = [];
    const componentIds: string[] = [];
    const instanceIds: string[] = [];
    const instances: Array<{ scene: InstanceNode; snapshot: NodeSnapshot }> = [];
    const pendingCache: Array<{ key: string; value: unknown }> = [];
    const styles = new TextStyleEvidenceReader();
    const nextSessionInferences = new Map<string, { fingerprint: string; nodes: NodeSnapshot[] }>();
    const nextSceneSignatures = new Map<string, string>();
    const dirty = new Set(options.dirtyNodeIds ?? []);
    // A root id is not a file identity. Files without a stable key use live capture.
    const cache = figma.fileKey && !options.forceFullCapture ? options.contextCache : undefined;
    let loadedPageCount = 0;
    const environmentStarted = Date.now();
    const variableEnvironment = await variableEnvironmentReader(() => this.cancelled);
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
      const restNodes = exported ? new Map([...exported.roots.values()].flatMap((root) => [...restSubtreeNodes(root)])) : undefined;
      let pageNodeCount = 0;
      for (const { root, entries } of capturePageFragments(page.children, page.name)) {
        if (this.cancelled) break;
        stageStarted = Date.now();
        const exportedRoot = restNodes?.get(root.id);
        const restRoot = exportedRoot ? restFragmentRoot(exportedRoot, entries) : undefined;
        let fingerprint: string | undefined;
        try {
          if (restRoot && variableEnvironment && restSubtreeCovers(restRoot, entries)) {
            const supplements = entries.map(({ node, rootId, path }) => ({ rootId, path, node: captureSupplement(node, restNodes?.get(node.id)) }));
            const environment = await variableEnvironment.fingerprint(supplements);
            if (environment) fingerprint = hashValue({ captureVersion: 2, fileKey: figma.fileKey, pageId: page.id, pageName: page.name, profile, restRoot, metadata: exported?.metadata, supplements, environment });
          } else if (variableEnvironment) {
            // Full capture needs the same dependency epoch as cached capture.
            await variableEnvironment.fingerprint(entries.map(({ node }) => ({ boundVariables: node.boundVariables,
              fills: "fills" in node ? node.fills : [], strokes: "strokes" in node ? node.strokes : [], effects: "effects" in node ? node.effects : [] })));
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
        const occurrenceChildren = new Map<string, string[]>();
        for (const entry of entries) {
          if (!entry.owningInstanceId) continue;
          const children = occurrenceChildren.get(entry.owningInstanceId) ?? [];
          children.push(entry.node.id);
          occurrenceChildren.set(entry.owningInstanceId, children);
        }
        const previousInference = this.sessionInferences.get(key);
        // Reuse only within an explicitly tracked session edit and a complete
        // local-variable epoch. Remote inference has no dependable revision token.
        const reuseInference = options.dirtyNodeIds !== undefined && !options.forceFullCapture
          && fingerprint !== undefined && previousInference?.fingerprint === fingerprint
          && profile.tokenSourceCollectionKeys.every((collectionKey) => variableEnvironment?.localCollectionKeys.has(collectionKey))
          && !entries.some(({ node }) => dirty.has(node.id));
        for (const [index, entry] of entries.entries()) {
          if (this.cancelled) break;
          const snapshot = snapshots[index]!;
          if (entry.owningInstanceId) {
            snapshot.evidenceRole = "instance-descendant";
            snapshot.owningInstanceId = entry.owningInstanceId;
            snapshot.parentId = entry.owningInstanceId;
            snapshot.childIds = entry.node.type === "INSTANCE" ? occurrenceChildren.get(entry.node.id) ?? [] : [];
          } else {
            delete snapshot.evidenceRole;
            delete snapshot.owningInstanceId;
            if (entry.node.type === "INSTANCE") snapshot.childIds = occurrenceChildren.get(entry.node.id) ?? [];
          }
          enrichLiveEvidence(entry.node, snapshot);
          if (entry.node.type === "TEXT" && snapshot.text) {
            const style = await styles.evidence(entry.node, snapshot.text);
            if (style) snapshot.text.style = style;
            else delete snapshot.text.style;
          }
          const tokenFields = tokenInferenceFields(snapshot);
          const previous = reuseInference ? previousInference?.nodes[index] : undefined;
          // A text style can change without a document event or scene fingerprint
          // change. Newly uncovered fields need fresh Figma candidate evidence.
          if (previous?.id === entry.node.id && JSON.stringify(tokenInferenceFields(previous)) === JSON.stringify(tokenFields)) {
            snapshot.inferredBindings = JSON.parse(JSON.stringify(previous.inferredBindings)) as NodeSnapshot["inferredBindings"];
            snapshot.fills.forEach((paint, index) => { paint.inferredVariableIds = [...(previous.fills[index]?.inferredVariableIds ?? [])]; });
            snapshot.strokes.forEach((paint, index) => { paint.inferredVariableIds = [...(previous.strokes[index]?.inferredVariableIds ?? [])]; });
            if (snapshot.layout && previous.layout) snapshot.layout.inferredAvailable = previous.layout.inferredAvailable;
          } else if (enrichInferences(entry.node, snapshot, tokenFields)) {
            diagnostics.inferenceNodes += 1;
          }
          nextSceneSignatures.set(entry.node.id, bindingSignature(entry.node));
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
        if (fingerprint) nextSessionInferences.set(key, { fingerprint, nodes: snapshots });
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
      const evidence = captureInstanceEvidence(scene);
      snapshot.instance = {
        detached: false,
        ...evidence.provenance,
        ...(main ? { mainComponentId: main.id, mainComponentName: main.name, ...(main.key ? { mainComponentKey: main.key } : {}) } : {}),
      };
      annotateInstanceDescendants(snapshot.childIds.map((id) => nodes[id]).filter((candidate): candidate is NodeSnapshot => Boolean(candidate)), scene.id, evidence);
    }, () => this.cancelled);
    diagnostics.componentsMs = Date.now() - stageStarted;

    onProgress({ phase: "indexing", completed: loadedPageCount, total: pages.length, message: "Resolving variables and cross-file relationships" });
    stageStarted = Date.now();
    const collections = await this.getCollectionOptions(true, 4_000, true);
    const approvedKeys = new Set(profile.tokenSourceCollectionKeys);
    const remoteKeys = new Set([...approvedKeys].filter((key) => !variableEnvironment?.localCollectionKeys.has(key)
      && !collections.some((collection) => !collection.remote && collection.key === key)));
    const libraryDigest = (variables: LibraryVariable[] | undefined) => variables
      ? hashValue(variables.map(({ key, name, resolvedType }) => ({ key, name, resolvedType })).sort((a, b) => a.key.localeCompare(b.key))) : undefined;
    const librarySummaries = new Map<string, string | undefined>();
    // Enroll even inaccessible inferred IDs before reading grading candidates.
    // Their later appearance or metadata changes must invalidate this epoch.
    const variableResourceFingerprint = await variableEnvironment?.fingerprint(referencedVariableIds(nodes).map((id) => ({ type: "VARIABLE_ALIAS", id })));
    const variables = this.cancelled ? [] : await variableCandidates(collections, nodes, () => this.cancelled, approvedKeys,
      (key, values) => { librarySummaries.set(key, libraryDigest(values)); });
    const libraryCollections = (values: VariableCollectionOption[]) => hashValue(values.filter((value) => value.remote && approvedKeys.has(value.key))
      .map(({ key, name, libraryName }) => ({ key, name, libraryName })).sort((a, b) => a.key.localeCompare(b.key)));
    const expectedLibraries = libraryCollections(collections);
    const verifyLibraries = async (): Promise<boolean> => {
      // Local collection keys are covered by the local epoch; they need no
      // remote inventory calls at each report or mutation boundary.
      if (remoteKeys.size === 0) return true;
      // The discovery UI can fall back to an empty list on failure. Verification
      // needs a successful bridge response to distinguish absence from failure.
      const available = await new Promise<LibraryVariableCollection[] | undefined>((resolve) => {
        const timer = setTimeout(() => resolve(undefined), 4_000);
        Promise.resolve().then(() => figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()).then(
          (value) => { clearTimeout(timer); resolve(value); },
          () => { clearTimeout(timer); resolve(undefined); },
        );
      });
      if (!available || libraryCollections(available.map((collection) => ({ ...collection, id: `library:${collection.key}`, remote: true, modeNames: [], variableCount: 0 }))) !== expectedLibraries) return false;
      const matches = await mapConcurrent([...librarySummaries], 4, async ([key, expected]) => {
        const current = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(key).catch(() => undefined);
        return expected !== undefined && current !== undefined && libraryDigest(current) === expected;
      }, () => this.cancelled);
      return !this.cancelled && matches.every(Boolean);
    };
    diagnostics.variablesMs = Date.now() - stageStarted;
    if (variableEnvironment && !this.cancelled) {
      stageStarted = Date.now();
      const verified = await variableEnvironment.verify();
      diagnostics.validationMs += Date.now() - stageStarted;
      if (!verified && !this.cancelled) throw new Error("Variable values or collections changed while file context was being verified. Run the audit again.");
    }
    if (!this.cancelled && !await styles.verify()) throw new Error("Text styles changed while file context was being verified. Run the audit again.");
    if (!this.cancelled && !await verifyLibraries()) throw new Error("Available library variables changed while file context was being verified. Run the audit again.");
    stageStarted = Date.now();
    populateGraphMetrics(nodes);
    const partial = {
      schemaVersion: 1 as const,
      resourceFingerprint: hashValue({ variables: variableResourceFingerprint ?? "unavailable", styles: await styles.fingerprint(),
        libraries: expectedLibraries, librarySummaries: [...librarySummaries].sort(([left], [right]) => left.localeCompare(right)) }),
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
    if (graph.complete && variableEnvironment) {
      // Scene bindings are covered by the document-change journal. Retaining a
      // live handle and signature for every node doubles peak memory in large
      // libraries and repeats tens of thousands of bridge reads at each save.
      this.verifyResourceEnvironment = async () => await variableEnvironment.verify() && await verifyLibraries() && await styles.verify();
      this.sceneSignatures = nextSceneSignatures;
      this.sessionInferences = nextSessionInferences;
    }
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
      const roots = targetRootIds(target.scope, graph, "", target.nodeIds);
      if (roots.length === 0) {
        throw new Error(`The selected Components-page wrapper contains no component set or standalone component. Add the “${AI_SOURCE_FRAME_ANNOTATION}” annotation to audit the wrapper itself.`);
      }
      return roots;
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
