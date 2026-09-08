import {
  CERTIFICATION_ANNOTATION_PREFIX,
  CERTIFICATION_DATA_KEY,
  LEGACY_CERTIFICATION_ANNOTATION_PREFIX,
  PRODUCT_NAME,
  SHARED_PLUGIN_DATA_NAMESPACE,
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

function applyAutoLayoutProperties(node: FrameNode | ComponentNode | ComponentSetNode, inferred: InferredAutoLayoutResult): void {
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
  node.layoutWrap = inferred.layoutWrap;
  node.counterAxisSpacing = inferred.counterAxisSpacing;
  node.itemReverseZIndex = inferred.itemReverseZIndex;
  node.strokesIncludedInLayout = inferred.strokesIncludedInLayout;
}

function isAutoLayoutNode(node: SceneNode): node is FrameNode | ComponentNode | ComponentSetNode {
  return node.type === "FRAME" || node.type === "COMPONENT" || node.type === "COMPONENT_SET";
}

async function applyInferredAutoLayout(node: SceneNode, tolerance: number): Promise<void> {
  if (!isAutoLayoutNode(node) || !hasChildren(node)) throw new Error("Inferred Auto Layout requires a frame or component container");
  const inferred = node.inferredAutoLayout;
  if (!inferred) throw new Error("Figma no longer provides inferred Auto Layout for this node");
  const before = node.children.map(bounds);
  const clone = node.clone();
  clone.name = `[temporary validation] ${node.name}`;
  clone.visible = false;
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
  applyAutoLayoutProperties(node, inferred);
  const after = node.children.map(bounds);
  if (!assessGeometryChange(before, after, node, tolerance).valid) {
    throw new Error("Applied Auto Layout failed its postcondition");
  }
}

function asBindable(node: SceneNode): SceneNode & MinimalFillsMixin & MinimalStrokesMixin {
  return node as SceneNode & MinimalFillsMixin & MinimalStrokesMixin;
}

async function bindVariable(node: SceneNode, field: BindableField, variable: Variable): Promise<void> {
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

async function applyOperation(operation: ChangeOperation): Promise<void> {
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
    await applyInferredAutoLayout(base, operation.value.tolerance);
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
  let checkpointCreated = false;
  if (structural) {
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
    for (const operation of plan.operations) await applyOperation(operation);
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

export function setCertification(node: SceneNode, summary: CertificationSummary): void {
  if (!["A", "B", "C", "D", "F"].includes(summary.grade) || !Number.isFinite(summary.score) || summary.score < 0 || summary.score > 100
    || !Number.isFinite(Date.parse(summary.certifiedAt)) || !summary.rulesetVersion || !summary.catalogVersion || !summary.snapshotHash || !summary.knowledgeSnapshotHash) {
    throw new Error("Certification summary is invalid");
  }
  node.setSharedPluginData(SHARED_PLUGIN_DATA_NAMESPACE, CERTIFICATION_DATA_KEY, JSON.stringify(summary));
  node.setRelaunchData({ "review-certification": `Review ${summary.grade} certification from ${summary.certifiedAt}` });
  if ("annotations" in node) {
    const annotation = `${CERTIFICATION_ANNOTATION_PREFIX} Grade ${summary.grade} (${summary.score.toFixed(1)}), ruleset ${summary.rulesetVersion}, catalog ${summary.catalogVersion}, ${summary.certifiedAt}, snapshot ${summary.snapshotHash}`;
    node.annotations = [...preservedAnnotations(node.annotations, [
      CERTIFICATION_ANNOTATION_PREFIX,
      LEGACY_CERTIFICATION_ANNOTATION_PREFIX,
    ]), { label: annotation }];
  }
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
