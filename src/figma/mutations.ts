import {
  AI_SOURCE_FRAME_ANNOTATION,
  CERTIFICATION_ANNOTATION_PREFIX,
  CERTIFICATION_DATA_KEY,
  LEGACY_CERTIFICATION_ANNOTATION_PREFIX,
  PRODUCT_NAME,
  SHARED_PLUGIN_DATA_NAMESPACE,
  VARIANT_COVERAGE_ANNOTATION_PREFIX,
} from "../core/constants";
import type { BindableField, CertificationSummary, ChangeOperation, ChangePlan, JsonValue } from "../core/contracts";
import { assertContract } from "../core/schema";
import { stableStringify } from "../core/stable";
import { readBindableRawValue, sameBindableValue } from "./operations/bindable-value";
import { assessGeometryChange, type Bounds } from "./operations/geometry";
import { annotationText, preservedAnnotations } from "./operations/annotations";
import { parseCertificationSummary, parsePatternConfirmation } from "./operations/shared-data";
import { normalizeSemanticTokenName, toVariableValue, variableScopesForField, variableTypeForField, webCodeSyntaxForTokenName } from "./operations/token-value";

export { assessGeometryChange } from "./operations/geometry";
export type { Bounds } from "./operations/geometry";

export interface ApplyPlanOptions {
  undoOnlyAcknowledged: boolean;
  structuralCheckpointSatisfied?: boolean;
}

export interface ApplyPlanResult {
  plan: ChangePlan;
  checkpointCreated: boolean;
  appliedOperationCount: number;
}

const TRANSACTION_MARKER_KEY = "cleanup-transaction-marker";

function isSceneNode(node: BaseNode | null): node is SceneNode {
  return Boolean(node && node.type !== "DOCUMENT" && node.type !== "PAGE");
}

function hasChildren(node: SceneNode): node is SceneNode & ChildrenMixin {
  return "children" in node;
}

function requiresStructuralCheckpoint(operation: ChangeOperation): boolean {
  return ["apply-inferred-auto-layout", "reconnect-instance", "convert-to-component", "group-variants"].includes(operation.kind);
}

function bounds(node: SceneNode): Bounds {
  return { x: node.x, y: node.y, width: node.width, height: node.height };
}

export function applyAutoLayoutProperties(node: FrameNode | ComponentNode | ComponentSetNode, inferred: InferredAutoLayoutResult): void {
  if (inferred.layoutMode === "NONE" || inferred.layoutMode === "GRID") throw new Error("Only inferred horizontal or vertical Auto Layout is supported");
  node.layoutMode = inferred.layoutMode;
  node.primaryAxisSizingMode = inferred.primaryAxisSizingMode;
  node.counterAxisSizingMode = inferred.counterAxisSizingMode;
  node.primaryAxisAlignItems = inferred.primaryAxisAlignItems;
  node.counterAxisAlignItems = inferred.counterAxisAlignItems;
  node.paddingTop = inferred.paddingTop;
  node.paddingRight = inferred.paddingRight;
  node.paddingBottom = inferred.paddingBottom;
  node.paddingLeft = inferred.paddingLeft;
  node.itemSpacing = inferred.itemSpacing;
  // Figma can return partial inferred-auto-layout payloads for nodes created
  // before newer layout properties were introduced. Assigning an absent value
  // is rejected by the Plugin API, so preserve the node's valid defaults.
  if (inferred.layoutWrap !== undefined) node.layoutWrap = inferred.layoutWrap;
  if (inferred.counterAxisSpacing !== undefined) node.counterAxisSpacing = inferred.counterAxisSpacing;
  if (inferred.itemReverseZIndex !== undefined) node.itemReverseZIndex = inferred.itemReverseZIndex;
  if (inferred.strokesIncludedInLayout !== undefined) node.strokesIncludedInLayout = inferred.strokesIncludedInLayout;
}

function isAutoLayoutNode(node: SceneNode): node is FrameNode | ComponentNode | ComponentSetNode {
  return node.type === "FRAME" || node.type === "COMPONENT" || node.type === "COMPONENT_SET";
}

async function validateInferredAutoLayout(node: SceneNode, tolerance: number): Promise<void> {
  if (!isAutoLayoutNode(node) || !hasChildren(node)) throw new Error("Inferred Auto Layout requires a frame or component container");
  const inferred = node.inferredAutoLayout;
  if (!inferred) throw new Error("Figma no longer provides inferred Auto Layout for this node");
  const beforeValidation = node.children.map(bounds);
  const clone = node.clone();
  clone.name = `[temporary validation] ${node.name}`;
  // Hidden nodes do not always participate in Figma's layout engine, which can
  // make a destructive conversion appear geometry-safe. Keep the validation
  // clone renderable but fully transparent and off-canvas so layout is computed.
  figma.currentPage.appendChild(clone);
  clone.x = 1_000_000;
  clone.y = 1_000_000;
  clone.opacity = 0;
  clone.locked = true;
  try {
    const cloneBefore = clone.children.map(bounds);
    const cloneOrder = clone.children.map((child) => child.id);
    applyAutoLayoutProperties(clone, inferred);
    const cloneAfter = clone.children.map(bounds);
    if (clone.children.length !== cloneOrder.length || clone.children.some((child, index) => child.id !== cloneOrder[index])) throw new Error("Auto Layout validation changed child order");
    const assessment = assessGeometryChange(cloneBefore, cloneAfter, clone, tolerance);
    if (assessment.maximumDelta > tolerance) throw new Error(`Auto Layout geometry changed by more than ${tolerance}px`);
    if (assessment.introducedOverlap) throw new Error("Auto Layout validation introduced child overlap");
    if (assessment.introducedClipping) throw new Error("Auto Layout validation introduced clipping");
  } finally {
    clone.remove();
  }
  const beforeApply = node.children.map(bounds);
  const validationSideEffect = assessGeometryChange(beforeValidation, beforeApply, node, tolerance);
  if (!validationSideEffect.valid) {
    throw new Error(`Auto Layout validation changed the source geometry for ${node.name} (${node.id}); maximum delta ${validationSideEffect.maximumDelta}px`);
  }
}

async function applyInferredAutoLayout(node: SceneNode, tolerance: number, prevalidated = false): Promise<void> {
  if (!isAutoLayoutNode(node) || !hasChildren(node)) throw new Error("Inferred Auto Layout requires a frame or component container");
  if (!prevalidated) await validateInferredAutoLayout(node, tolerance);
  const inferred = node.inferredAutoLayout;
  if (!inferred) throw new Error("Figma no longer provides inferred Auto Layout for this node");
  const beforeApply = node.children.map(bounds);
  applyAutoLayoutProperties(node, inferred);
  const after = node.children.map(bounds);
  const assessment = assessGeometryChange(beforeApply, after, node, tolerance);
  if (!assessment.valid) {
    throw new Error(
      `Applied Auto Layout failed its postcondition for ${node.name} (${node.id}); maximum delta ${assessment.maximumDelta}px, introduced overlap ${assessment.introducedOverlap}, introduced clipping ${assessment.introducedClipping}`,
    );
  }
}

function asBindable(node: SceneNode): SceneNode & MinimalFillsMixin & MinimalStrokesMixin {
  return node as SceneNode & MinimalFillsMixin & MinimalStrokesMixin;
}

async function loadTextFonts(node: SceneNode): Promise<void> {
  if (node.type !== "TEXT") return;
  const fonts = new Map<string, FontName>();
  for (const segment of node.getStyledTextSegments(["fontName"])) {
    fonts.set(`${segment.fontName.family}\u0000${segment.fontName.style}`, segment.fontName);
  }
  await Promise.all([...fonts.values()].map((font) => figma.loadFontAsync(font)));
}

async function bindVariable(node: SceneNode, field: BindableField, variable: Variable): Promise<void> {
  await loadTextFonts(node);
  const bindable = asBindable(node);
  if (field === "fills" || field === "strokes") {
    if (!(field in bindable)) throw new Error(`${node.type} does not support ${field}`);
    const source = field === "fills" ? bindable.fills : bindable.strokes;
    if (source === figma.mixed) throw new Error(`${field} are mixed and cannot be bound automatically`);
    let changed = false;
    const next = source.map((paint) => {
      if (!changed && paint.type === "SOLID" && paint.visible !== false) {
        changed = true;
        return figma.variables.setBoundVariableForPaint(paint, "color", variable);
      }
      return paint;
    });
    if (!changed) throw new Error(`No visible solid ${field} can be bound`);
    if (field === "fills") bindable.fills = next;
    else bindable.strokes = next;
    return;
  }
  bindable.setBoundVariable(field as VariableBindableNodeField | VariableBindableTextField, variable);
}

function hasVariableBinding(node: SceneNode, field: BindableField): boolean {
  return boundVariableIdsForField(node, field).size > 0;
}

function aliasIds(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((candidate) => candidate && typeof candidate === "object" && "id" in candidate && typeof candidate.id === "string" ? [candidate.id] : []);
}

function boundVariableIdsForField(node: SceneNode, field: BindableField): Set<string> {
  const bindings = node.boundVariables as Record<string, unknown> | undefined;
  const output = new Set<string>();
  const sourceFields = field === "cornerRadius"
    ? ["cornerRadius", "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]
    : field === "strokeWeight"
      ? ["strokeWeight", "strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"]
    : [field];
  for (const sourceField of sourceFields) for (const id of aliasIds(bindings?.[sourceField])) output.add(id);
  if ((field === "fills" || field === "strokes") && field in node) {
    const paints = field === "fills"
      ? ("fills" in node ? node.fills : undefined)
      : ("strokes" in node ? node.strokes : undefined);
    if (Array.isArray(paints)) {
      for (const paint of paints) {
        if (paint.type === "SOLID" && paint.boundVariables?.color?.id) output.add(paint.boundVariables.color.id);
      }
    }
  }
  return output;
}

async function preflightOperation(operation: ChangeOperation): Promise<void> {
  if (operation.kind !== "apply-inferred-auto-layout") return;
  const base = await figma.getNodeByIdAsync(operation.nodeId);
  if (!isSceneNode(base)) throw new Error(`Node ${operation.nodeId} no longer exists`);
  await validateInferredAutoLayout(base, operation.value.tolerance);
}

async function applyOperation(operation: ChangeOperation, prevalidatedNodeIds: ReadonlySet<string>): Promise<void> {
  const base = await figma.getNodeByIdAsync(operation.nodeId);
  if (!isSceneNode(base)) throw new Error(`Node ${operation.nodeId} no longer exists`);
  if (operation.kind === "rename-node") {
    base.name = operation.value.name;
  } else if (operation.kind === "confirm-pattern") {
    base.setSharedPluginData(SHARED_PLUGIN_DATA_NAMESPACE, "pattern-resolution-v1", JSON.stringify(operation.value));
  } else if (operation.kind === "set-annotation") {
    if (!("annotations" in base)) throw new Error("This node does not support annotations");
    if (!base.annotations.some((annotation) => annotationText(annotation) === operation.value.label)) {
      base.annotations = [...preservedAnnotations(base.annotations, []), { label: operation.value.label }];
    }
  } else if (operation.kind === "normalize-export-name") {
    base.name = operation.value.name;
  } else if (operation.kind === "bind-variable") {
    const variable = await figma.variables.getVariableByIdAsync(operation.value.variableId);
    if (!variable) throw new Error("The selected variable no longer exists");
    await bindVariable(base, operation.value.field, variable);
  } else if (operation.kind === "apply-inferred-auto-layout") {
    await applyInferredAutoLayout(base, operation.value.tolerance, prevalidatedNodeIds.has(operation.nodeId));
  } else if (operation.kind === "reconnect-instance") {
    throw new Error("Detached-instance reconnection requires an exact supported source and is not enabled in this build");
  } else if (operation.kind === "convert-to-component") {
    figma.createComponentFromNode(base).name = operation.value.name;
  } else if (operation.kind === "group-variants") {
    const parent = base.parent;
    if (!parent || !("children" in parent)) throw new Error("Variant components need a common editable parent");
    const componentNodes = await Promise.all(operation.value.componentIds.map((id) => figma.getNodeByIdAsync(id)));
    if (!componentNodes.every((node): node is ComponentNode => Boolean(node && node.type === "COMPONENT"))) throw new Error("Every variant target must be a component");
    figma.combineAsVariants(componentNodes, parent);
  } else if (operation.kind === "set-certification") {
    setCertification(base, operation.value);
  }
}

async function verifyOperation(operation: ChangeOperation): Promise<boolean> {
  const node = await figma.getNodeByIdAsync(operation.nodeId);
  if (!isSceneNode(node)) return false;
  if (operation.kind === "rename-node" || operation.kind === "normalize-export-name") return node.name === operation.value.name;
  if (operation.kind === "confirm-pattern") {
    const stored = parsePatternConfirmation(node.getSharedPluginData(SHARED_PLUGIN_DATA_NAMESPACE, "pattern-resolution-v1"));
    return stableStringify(stored) === stableStringify(operation.value);
  }
  if (operation.kind === "set-annotation") return "annotations" in node && node.annotations.some((annotation) => annotationText(annotation) === operation.value.label);
  if (operation.kind === "bind-variable") return boundVariableIdsForField(node, operation.value.field).has(operation.value.variableId);
  if (operation.kind === "apply-inferred-auto-layout") return isAutoLayoutNode(node) && node.layoutMode !== "NONE";
  if (operation.kind === "set-certification") {
    const stored = parseCertificationSummary(node.getSharedPluginData(SHARED_PLUGIN_DATA_NAMESPACE, CERTIFICATION_DATA_KEY));
    return stableStringify(stored) === stableStringify(operation.value);
  }
  if (operation.kind === "convert-to-component") return node.type === "COMPONENT" && node.name === operation.value.name;
  if (operation.kind === "group-variants") {
    const components = await Promise.all(operation.value.componentIds.map((id) => figma.getNodeByIdAsync(id)));
    return components.length > 0 && components.every((candidate) => candidate?.type === "COMPONENT" && candidate.parent?.type === "COMPONENT_SET" && candidate.parent.id === components[0]?.parent?.id);
  }
  return true;
}

export async function applyChangePlan(plan: ChangePlan, options: ApplyPlanOptions): Promise<ApplyPlanResult> {
  assertContract("change-plan", plan);
  const structural = plan.operations.some(requiresStructuralCheckpoint);
  const prevalidatedNodeIds = new Set<string>();
  for (const operation of plan.operations) {
    await preflightOperation(operation);
    if (operation.kind === "apply-inferred-auto-layout") prevalidatedNodeIds.add(operation.nodeId);
  }
  let checkpointCreated = false;
  if (structural && !options.structuralCheckpointSatisfied) {
    try {
      await figma.saveVersionHistoryAsync(`Before ${PRODUCT_NAME} cleanup`, `Cleanup plan ${plan.id}`);
      checkpointCreated = true;
    } catch (error) {
      if (!options.undoOnlyAcknowledged) throw new Error(`Version-history checkpoint failed. Structural work requires undo-only acknowledgement. ${String(error)}`);
    }
  }
  figma.commitUndo();
  const previousMarker = figma.root.getPluginData(TRANSACTION_MARKER_KEY);
  figma.root.setPluginData(TRANSACTION_MARKER_KEY, `${plan.id}:${Date.now()}`);
  try {
    for (const operation of plan.operations) await applyOperation(operation, prevalidatedNodeIds);
    for (const operation of plan.operations) {
      if (!(await verifyOperation(operation))) throw new Error(`Postcondition failed for ${operation.kind} on ${operation.nodeId}`);
    }
    figma.root.setPluginData(TRANSACTION_MARKER_KEY, previousMarker);
    figma.commitUndo();
    return { plan, checkpointCreated, appliedOperationCount: plan.operations.length };
  } catch (error) {
    // The marker guarantees this undo group is non-empty even when Figma
    // silently ignores an attempted property assignment. Undo can therefore
    // never roll back a designer action or a previously saved profile.
    figma.triggerUndo();
    throw error;
  }
}

export function setCertification(node: SceneNode, summary: CertificationSummary, coveredVariantCount = 0): void {
  if (!["A", "B", "C", "D", "F"].includes(summary.grade) || !Number.isFinite(summary.score) || summary.score < 0 || summary.score > 100
    || !Number.isFinite(Date.parse(summary.certifiedAt)) || !summary.rulesetVersion || !summary.catalogVersion || !summary.snapshotHash || !summary.knowledgeSnapshotHash) {
    throw new Error("Certification summary is invalid");
  }
  node.setSharedPluginData(SHARED_PLUGIN_DATA_NAMESPACE, CERTIFICATION_DATA_KEY, JSON.stringify(summary));
  node.setRelaunchData({ "review-certification": `Review ${summary.grade} certification from ${summary.certifiedAt}` });
  if ("annotations" in node) {
    const coverage = coveredVariantCount > 0 ? `, covers ${coveredVariantCount} variants` : "";
    const annotation = `${CERTIFICATION_ANNOTATION_PREFIX} Grade ${summary.grade} (${summary.score.toFixed(1)})${coverage}, ruleset ${summary.rulesetVersion}, catalog ${summary.catalogVersion}, ${summary.certifiedAt}, snapshot ${summary.snapshotHash}`;
    const existing = preservedAnnotations(node.annotations, [
      CERTIFICATION_ANNOTATION_PREFIX,
      LEGACY_CERTIFICATION_ANNOTATION_PREFIX,
    ]);
    node.annotations = [
      ...existing,
      ...(existing.some((item) => annotationText(item) === AI_SOURCE_FRAME_ANNOTATION) ? [] : [{ label: AI_SOURCE_FRAME_ANNOTATION }]),
      { label: annotation },
    ];
  }
}

export function setVariantCoverageAnnotation(
  node: SceneNode,
  parentName: string,
  summary: CertificationSummary,
): void {
  if (node.type !== "COMPONENT" || node.parent?.type !== "COMPONENT_SET") {
    throw new Error("Variant coverage can only be recorded on a component inside a component set");
  }
  if (!("annotations" in node)) return;
  const existing = preservedAnnotations(node.annotations, [VARIANT_COVERAGE_ANNOTATION_PREFIX]);
  node.annotations = [
    ...existing,
    { label: `${VARIANT_COVERAGE_ANNOTATION_PREFIX} “${parentName}” aggregate ${summary.grade} (${summary.score.toFixed(1)}); this variant is not independently graded.` },
  ];
}

export async function createSemanticTokenAndBind(input: {
  collectionId: string;
  name: string;
  field: BindableField;
  nodeIds: string[];
  rawValue: JsonValue;
}): Promise<{ variableId: string; boundCount: number }> {
  const name = normalizeSemanticTokenName(input.name);
  const nodeIds = [...new Set(input.nodeIds)];
  if (nodeIds.length < 3) throw new Error("Token creation requires at least three distinct repeated uses");
  const collection = await figma.variables.getVariableCollectionByIdAsync(input.collectionId);
  if (!collection || collection.remote) throw new Error("Choose an existing local variable collection");
  const existing = (await figma.variables.getLocalVariablesAsync()).find((variable) => variable.variableCollectionId === collection.id && variable.name.toLocaleLowerCase("en-US") === name.toLocaleLowerCase("en-US"));
  if (existing) throw new Error("A variable with this name already exists in the selected collection");
  const type = variableTypeForField(input.field);
  const value = toVariableValue(input.rawValue, type);
  const nodes = await Promise.all(nodeIds.map((nodeId) => figma.getNodeByIdAsync(nodeId)));
  if (!nodes.every(isSceneNode)) throw new Error("Every repeated-use node must still exist");
  for (const node of nodes) {
    if (hasVariableBinding(node, input.field) || !sameBindableValue(readBindableRawValue(node, input.field), input.rawValue)) {
      throw new Error("The repeated-value proposal is stale; rescan before creating a token");
    }
  }
  figma.commitUndo();
  try {
    const variable = figma.variables.createVariable(name, collection, type);
    variable.scopes = variableScopesForField(input.field);
    variable.setVariableCodeSyntax("WEB", webCodeSyntaxForTokenName(name));
    variable.description = `Semantic token created by ${PRODUCT_NAME} for ${input.field}.`;
    for (const mode of collection.modes) variable.setValueForMode(mode.modeId, value);
    let boundCount = 0;
    for (const node of nodes) {
      await bindVariable(node, input.field, variable);
      boundCount += 1;
    }
    if (boundCount < 3) throw new Error("Token creation requires at least three compatible repeated uses");
    figma.commitUndo();
    return { variableId: variable.id, boundCount };
  } catch (error) {
    figma.triggerUndo();
    throw error;
  }
}
