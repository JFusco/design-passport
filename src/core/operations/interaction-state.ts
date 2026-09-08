import type { DesignKnowledgeGraph, NodeSnapshot } from "../contracts";

const INACTIVE_VALUES = new Set(["disabled", "inactive", "unavailable"]);
const TRUE_VALUES = new Set(["true", "yes", "on", "1"]);
const FALSE_VALUES = new Set(["false", "no", "off", "0"]);

type VariantPropertyInput = string | Readonly<Record<string, string>>;

function normalizePropertyName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/[\s_-]+/g, "");
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

function normalizedProperties(input: VariantPropertyInput): Map<string, string> {
  if (typeof input === "string") return variantProperties(input);
  return new Map(Object.entries(input).map(([name, value]) => [
    normalizePropertyName(name),
    normalizePropertyValue(value),
  ]));
}

export function hasInactiveVariantState(input: VariantPropertyInput): boolean {
  const properties = normalizedProperties(input);
  const disabled = properties.get("disabled") ?? properties.get("isdisabled");
  if (disabled && (TRUE_VALUES.has(disabled) || INACTIVE_VALUES.has(disabled))) return true;

  const enabled = properties.get("enabled") ?? properties.get("isenabled");
  if (enabled && (FALSE_VALUES.has(enabled) || INACTIVE_VALUES.has(enabled))) return true;

  const state = properties.get("state") ?? properties.get("status");
  return Boolean(state && INACTIVE_VALUES.has(state));
}

export function isWithinInactiveComponent(
  graph: Pick<DesignKnowledgeGraph, "nodes">,
  node: NodeSnapshot,
): boolean {
  const visited = new Set<string>();
  let current: NodeSnapshot | undefined = node;
  while (current) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    if (
      ["COMPONENT", "COMPONENT_SET", "INSTANCE"].includes(current.type)
      && hasInactiveVariantState(current.variantProperties ?? current.name)
    ) return true;
    current = current.parentId ? graph.nodes[current.parentId] : undefined;
  }
  return false;
}
