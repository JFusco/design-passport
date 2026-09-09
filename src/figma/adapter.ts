import type {
  CertificationSummary,
  CodeConnectEvidence,
  DesignKnowledgeGraph,
  EffectSnapshot,
  NodeSnapshot,
  PageSnapshot,
  PaintSnapshot,
  ReadinessProfile,
  ScanProgress,
  ScanScope,
  VariableCandidate,
} from "../core/contracts";
import { AI_SOURCE_FRAME_ANNOTATION, CERTIFICATION_ANNOTATION_PREFIX, LEGACY_CERTIFICATION_ANNOTATION_PREFIX } from "../core/constants";
import { finalizeKnowledgeGraph } from "../core/knowledge";
import { populateGraphMetrics, sourceFrameIds, targetRootIds } from "../core/operations/graph";
import { assertProfileSemantics } from "../core/profile";
import { inferProfileFromPages } from "../core/profile-inference";
import { hashValue } from "../core/stable";
import { canReadComponentPropertyDefinitions } from "./operations/component";
import { annotationText } from "./operations/annotations";
import { listVariableCollectionOptions, type VariableCollectionOption } from "./operations/collections";
import { parseCertificationSummary, parsePatternConfirmation, parseStoredProfile } from "./operations/shared-data";

export type { VariableCollectionOption } from "./operations/collections";

export interface PageOption {
  id: string;
  name: string;
}

export interface BootstrapData {
  fileName: string;
  fileKeyAvailable: boolean;
  editorType: "figma" | "dev";
  canMutateDocument: boolean;
  pages: PageOption[];
  collections: VariableCollectionOption[];
  profile: ReadinessProfile;
  profileConfigured: boolean;
  selectionCount: number;
}

export interface KnowledgeBuildResult {
  graph: DesignKnowledgeGraph;
  collections: VariableCollectionOption[];
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
  const inferred = node.inferredVariables?.[field] ?? [];
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

function inferredBindings(node: SceneNode): NodeSnapshot["inferredBindings"] {
  const output: NodeSnapshot["inferredBindings"] = {};
  const inferred = node.inferredVariables;
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
    inferredAvailable: "inferredAutoLayout" in frame && frame.inferredAutoLayout !== null,
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
    inferredBindings: inferredBindings(node),
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
  for (const id of referencedIds) {
    if (cancelled()) break;
    if (knownIds.has(id)) continue;
    const variable = await figma.variables.getVariableByIdAsync(id).catch(() => null);
    if (!variable) continue;
    const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId).catch(() => null);
    output.push({
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
    });
    knownIds.add(id);
  }

  for (const option of options.filter((candidate) => candidate.remote && approvedCollectionKeys.has(candidate.key))) {
    if (cancelled()) break;
    try {
      const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(option.key);
      option.variableCount = variables.length;
      const knownKeys = new Set(output.map((candidate) => candidate.key));
      output.push(...variables.filter((variable) => !knownKeys.has(variable.key)).map((variable) => ({
        id: `library:${variable.key}`,
        key: variable.key,
        name: variable.name,
        collectionId: option.id,
        collectionKey: option.key,
        collectionName: option.name,
        type: variable.resolvedType,
        remote: true,
        evidenceLevel: "summary" as const,
        semantic: isSemanticVariable(variable.name, option.name),
        scopes: [],
        modeNames: option.modeNames,
      })));
    } catch {
      // Keep the collection descriptor while avoiding any claim about inaccessible variables.
    }
  }
  return output;
}

export class FigmaAdapter {
  private cancelled = false;

  cancel(): void {
    this.cancelled = true;
  }

  getCollectionOptions(includeRemote = true, remoteTimeoutMs = 4_000): Promise<VariableCollectionOption[]> {
    return listVariableCollectionOptions({ includeRemote, remoteTimeoutMs });
  }

  async getBootstrap(): Promise<BootstrapData> {
    const pages = figma.root.children;
    const stored = figma.root.getSharedPluginData("verndaleAiReady", "profile-v1");
    let profile = inferProfileFromPages(pages);
    let profileConfigured = false;
    if (stored) {
      const candidate = parseStoredProfile(stored);
      if (candidate) {
        profile = candidate;
        profileConfigured = true;
      }
    }
    return {
      fileName: figma.root.name,
      fileKeyAvailable: Boolean(figma.fileKey),
      editorType: figma.editorType === "dev" ? "dev" : "figma",
      canMutateDocument: figma.editorType === "figma",
      pages: pages.map((page) => ({ id: page.id, name: page.name })),
      collections: await this.getCollectionOptions(false),
      profile,
      profileConfigured,
      selectionCount: figma.currentPage.selection.length,
    };
  }

  async saveProfile(profile: ReadinessProfile): Promise<void> {
    assertProfileSemantics(profile, new Set(figma.root.children.map((page) => page.id)));
    figma.root.setSharedPluginData("verndaleAiReady", "profile-v1", JSON.stringify(profile));
  }

  matchesDocumentTopology(graph: Pick<DesignKnowledgeGraph, "pages">): boolean {
    const pages = figma.root.children;
    return pages.length === graph.pages.length
      && pages.every((page, index) => page.id === graph.pages[index]?.id && page.name === graph.pages[index]?.name);
  }

  async buildKnowledge(
    profile: ReadinessProfile,
    onProgress: (progress: ScanProgress) => void,
    priorCodeConnect: CodeConnectEvidence[] = [],
  ): Promise<KnowledgeBuildResult> {
    this.cancelled = false;
    const pages = figma.root.children;
    const nodes: Record<string, NodeSnapshot> = {};
    const pageSnapshots: PageSnapshot[] = [];
    const componentIds: string[] = [];
    const instanceIds: string[] = [];
    const enrich: Array<{ scene: SceneNode; snapshot: NodeSnapshot; getMain: boolean }> = [];
    let loadedPageCount = 0;

    for (const [pageIndex, page] of pages.entries()) {
      if (this.cancelled) break;
      onProgress({ phase: "loading-pages", completed: pageIndex, total: pages.length, pageName: page.name, message: `Loading ${page.name}` });
      await page.loadAsync();
      loadedPageCount += 1;
      const rootNodeIds: string[] = [];
      let pageNodeCount = 0;
      const stack = [...page.children].reverse().map((node) => ({ node, rootId: node.id, path: `${page.name} / ${node.name}` }));
      rootNodeIds.push(...page.children.map((node) => node.id));
      while (stack.length > 0) {
        if (this.cancelled) break;
        const entry = stack.pop();
        if (!entry) continue;
        const snapshot = snapshotBase(entry.node, entry.rootId, page.id, entry.path);
        nodes[entry.node.id] = snapshot;
        pageNodeCount += 1;
        if (entry.node.type === "COMPONENT" || entry.node.type === "COMPONENT_SET") componentIds.push(entry.node.id);
        if (entry.node.type === "INSTANCE") instanceIds.push(entry.node.id);
        enrich.push({
          scene: entry.node,
          snapshot,
          getMain: entry.node.type === "INSTANCE",
        });
        if (entry.node.type !== "INSTANCE" && hasChildren(entry.node)) {
          for (let index = entry.node.children.length - 1; index >= 0; index -= 1) {
            const child = entry.node.children[index];
            if (child) stack.push({ node: child, rootId: entry.rootId, path: `${entry.path} / ${child.name}` });
          }
        }
        if (pageNodeCount % 500 === 0) {
          onProgress({ phase: "indexing", completed: pageIndex, total: pages.length, pageName: page.name, message: `Indexed ${pageNodeCount.toLocaleString()} nodes on ${page.name}` });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      pageSnapshots.push({
        id: page.id,
        name: page.name,
        role: roleForPage(page.id, profile),
        loaded: true,
        nodeCount: pageNodeCount,
        rootNodeIds,
      });
      for (const root of page.children) {
        if (!("getDevResourcesAsync" in root)) continue;
        try {
          const resources = await root.getDevResourcesAsync({ includeChildren: true });
          for (const resource of resources) {
            const snapshot = nodes[resource.nodeId];
            if (snapshot) snapshot.devResourceCount += 1;
          }
        } catch {
          // Dev-resource availability is represented by measured zero, never by fetching its URL.
        }
      }
    }

    for (let index = 0; index < enrich.length && !this.cancelled; index += 50) {
      const batch = enrich.slice(index, index + 50);
      await Promise.all(batch.map(async ({ scene, snapshot, getMain }) => {
        if (getMain && scene.type === "INSTANCE") {
          const main = await scene.getMainComponentAsync().catch(() => null);
          snapshot.instance = {
            detached: false,
            ...(main ? { mainComponentId: main.id, mainComponentName: main.name, ...(main.key ? { mainComponentKey: main.key } : {}) } : {}),
          };
        }
      }));
    }

    populateGraphMetrics(nodes);
    onProgress({ phase: "indexing", completed: loadedPageCount, total: pages.length, message: "Resolving variables and cross-file relationships" });
    const collections = await this.getCollectionOptions(true);
    const variables = this.cancelled
      ? []
      : await variableCandidates(collections, nodes, () => this.cancelled, new Set(profile.tokenSourceCollectionKeys));
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
      codeConnect: priorCodeConnect,
    };
    partial.sourceFrameIds = sourceFrameIds(partial, profile);
    const graph = finalizeKnowledgeGraph(partial, profile);
    onProgress({ phase: "complete", completed: loadedPageCount, total: pages.length, message: graph.complete ? "Whole-file knowledge is complete" : "Whole-file knowledge is incomplete" });
    return { graph, collections };
  }

  targetRootIds(scope: ScanScope, graph: DesignKnowledgeGraph): string[] {
    return targetRootIds(scope, graph, figma.currentPage.id, figma.currentPage.selection.map((node) => node.id));
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
