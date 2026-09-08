import type { BindableField, ChangeOperation, ChangePlan, Finding } from "../contracts";
import { stableStringify } from "../stable";

const BINDABLE_FIELDS = new Set<BindableField>([
  "fills", "strokes", "cornerRadius", "itemSpacing", "counterAxisSpacing", "gridRowGap", "gridColumnGap",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "width", "height", "opacity", "strokeWeight",
  "fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent",
]);

export interface PlannedOperation {
  finding: Finding;
  operation: ChangeOperation;
}

export function isBindableField(value: unknown): value is BindableField {
  return typeof value === "string" && BINDABLE_FIELDS.has(value as BindableField);
}

export function operationForFinding(item: Finding): ChangeOperation | undefined {
  if (item.status === "pass" || item.status === "not-applicable" || item.status === "waived") return undefined;
  const suggested = item.suggestedValue && typeof item.suggestedValue === "object" && !Array.isArray(item.suggestedValue)
    ? item.suggestedValue as Record<string, unknown>
    : undefined;
  if (["naming.pattern-alias", "naming.pattern-canonical", "naming.whitespace"].includes(item.ruleId)) {
    if (item.fixability === "automatic" && typeof suggested?.name === "string" && suggested.name.trim()) {
      return { kind: "rename-node", nodeId: item.nodeId, value: { name: suggested.name } };
    }
  }
  if (item.ruleId === "token.application.unique-inference") {
    if (item.fixability === "guarded" && isBindableField(suggested?.field) && typeof suggested.variableId === "string" && suggested.variableId) {
      return { kind: "bind-variable", nodeId: item.nodeId, value: { field: suggested.field, variableId: suggested.variableId } };
    }
  }
  if (item.ruleId === "structure.inferred-auto-layout" && item.fixability === "guarded") {
    return { kind: "apply-inferred-auto-layout", nodeId: item.nodeId, value: { tolerance: 0.5 } };
  }
  if (item.ruleId === "pipeline.annotation" && item.fixability === "automatic") {
    return { kind: "set-annotation", nodeId: item.nodeId, value: { label: "AI source frame" } };
  }
  return undefined;
}

export function riskForOperation(operation: ChangeOperation): ChangePlan["risk"] {
  if (["rename-node", "confirm-pattern", "set-annotation", "normalize-export-name", "set-certification"].includes(operation.kind)) return "low";
  if (["bind-variable", "apply-inferred-auto-layout", "reconnect-instance"].includes(operation.kind)) return "guarded";
  return "structural";
}

function priority(entry: PlannedOperation): number {
  if (entry.finding.ruleId === "naming.pattern-alias" || entry.finding.ruleId === "naming.pattern-canonical") return 30;
  if (entry.finding.ruleId === "naming.whitespace") return 10;
  return 20;
}

function operationKey(operation: ChangeOperation): string {
  if (operation.kind === "rename-node" || operation.kind === "normalize-export-name") return `${operation.nodeId}:name`;
  if (operation.kind === "bind-variable") return `${operation.nodeId}:bind:${operation.value.field}`;
  if (operation.kind === "set-annotation") return `${operation.nodeId}:annotation:${operation.value.label}`;
  return `${operation.nodeId}:${operation.kind}`;
}

function operationOrder(operation: ChangeOperation): number {
  const order: Record<ChangeOperation["kind"], number> = {
    "rename-node": 10,
    "confirm-pattern": 20,
    "set-annotation": 30,
    "normalize-export-name": 40,
    "bind-variable": 50,
    "reconnect-instance": 60,
    "apply-inferred-auto-layout": 70,
    "convert-to-component": 80,
    "group-variants": 90,
    "set-certification": 100,
  };
  return order[operation.kind];
}

export function resolveOperationConflicts(entries: readonly PlannedOperation[]): PlannedOperation[] {
  const selected = new Map<string, PlannedOperation>();
  const conflicted = new Set<string>();
  const ordered = [...entries].sort((left, right) => priority(right) - priority(left)
    || left.finding.id.localeCompare(right.finding.id)
    || operationKey(left.operation).localeCompare(operationKey(right.operation)));
  for (const entry of ordered) {
    const key = operationKey(entry.operation);
    if (conflicted.has(key)) continue;
    const existing = selected.get(key);
    if (!existing) {
      selected.set(key, entry);
      continue;
    }
    if (stableStringify(existing.operation) === stableStringify(entry.operation)) continue;
    const nameConflict = key.endsWith(":name");
    if (nameConflict) continue;
    selected.delete(key);
    conflicted.add(key);
  }
  return [...selected.values()].sort((left, right) => left.operation.nodeId.localeCompare(right.operation.nodeId)
    || operationOrder(left.operation) - operationOrder(right.operation)
    || left.finding.id.localeCompare(right.finding.id));
}
