import type { DesignKnowledgeGraph, NodeSnapshot } from "../contracts";

const TRUE_VALUES = new Set(["true", "yes", "on", "1"]);
const FALSE_VALUES = new Set(["false", "no", "off", "0"]);

type VariantPropertyInput = string | Readonly<Record<string, string>>;
export interface InteractionState {
  state: "disabled" | "enabled" | "unknown" | "conflicting";
  evidence: Array<{ nodeId: string; property: string; value: string; disabled: boolean }>;
}

function normalizePropertyName(value: string): string {
  return value.replace(/#[^#]+$/, "").trim().toLocaleLowerCase("en-US").replace(/[\s_-]+/g, "");
}

function normalizePropertyValue(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function variantProperties(name: string): Map<string, string> {
  const output = new Map<string, string>();
  for (const part of name.split(",")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = normalizePropertyName(part.slice(0, separator));
    const value = normalizePropertyValue(part.slice(separator + 1));
    if (key && value) output.set(key, value);
  }
  return output;
}

function normalizedProperties(input: VariantPropertyInput): Array<[string, string]> {
  if (typeof input === "string") return [...variantProperties(input)];
  return Object.entries(input).map(([name, value]) => [normalizePropertyName(name), normalizePropertyValue(value)]);
}

function stateEvidence(input: VariantPropertyInput, nodeId: string): InteractionState["evidence"] {
  const evidence: InteractionState["evidence"] = [];
  for (const [property, value] of normalizedProperties(input)) {
    let disabled: boolean | undefined;
    if (["disabled", "isdisabled"].includes(property)) {
      if (TRUE_VALUES.has(value) || value === "disabled") disabled = true;
      if (FALSE_VALUES.has(value) || value === "enabled") disabled = false;
    } else if (["enabled", "isenabled"].includes(property)) {
      if (FALSE_VALUES.has(value) || value === "disabled") disabled = true;
      if (TRUE_VALUES.has(value) || value === "enabled") disabled = false;
    } else if (["state", "status"].includes(property)) {
      if (/^disabled(?:$|[\s_-])/.test(value)) disabled = true;
      if (value === "enabled" || value === "active") disabled = false;
    }
    if (disabled !== undefined) evidence.push({ nodeId, property, value, disabled });
  }
  return evidence;
}

function resolvedState(evidence: InteractionState["evidence"]): InteractionState {
  const disabled = evidence.some((item) => item.disabled);
  const enabled = evidence.some((item) => !item.disabled);
  return { state: disabled && enabled ? "conflicting" : disabled ? "disabled" : enabled ? "enabled" : "unknown", evidence };
}

/** Compatibility name: only an unambiguous, explicit disabled state is exempt. */
export function hasInactiveVariantState(input: VariantPropertyInput): boolean {
  return resolvedState(stateEvidence(input, "")).state === "disabled";
}

export function interactionState(
  graph: Pick<DesignKnowledgeGraph, "nodes">,
  node: NodeSnapshot,
): InteractionState {
  const visited = new Set<string>();
  const evidence: InteractionState["evidence"] = [];
  let current: NodeSnapshot | undefined = node;
  while (current) {
    if (visited.has(current.id)) return { state: "conflicting", evidence };
    visited.add(current.id);
    if (["COMPONENT", "COMPONENT_SET", "INSTANCE"].includes(current.type)) {
      evidence.push(...stateEvidence(current.interactionProperties ?? current.variantProperties ?? current.name, current.id));
    }
    current = current.parentId ? graph.nodes[current.parentId] : undefined;
  }
  return resolvedState(evidence);
}

export function isWithinInactiveComponent(graph: Pick<DesignKnowledgeGraph, "nodes">, node: NodeSnapshot): boolean {
  return interactionState(graph, node).state === "disabled";
}
