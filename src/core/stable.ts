import type { JsonValue } from "./contracts";

function normalizeStableValue(value: unknown, ancestors: Set<object>): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") return value.toString();
  if (value === undefined || typeof value === "function" || typeof value === "symbol") return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : "Invalid Date";
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new Error("Cannot create a stable value from circular data");
    ancestors.add(value);
    const normalized = value.map((item) => normalizeStableValue(item, ancestors));
    ancestors.delete(value);
    return normalized;
  }
  if (typeof value === "object") {
    if (ancestors.has(value)) throw new Error("Cannot create a stable value from circular data");
    ancestors.add(value);
    const record = value as Record<string, unknown>;
    const normalized = Object.fromEntries(Object.keys(record).sort().map((key) => [key, normalizeStableValue(record[key], ancestors)])) as Record<string, JsonValue>;
    ancestors.delete(value);
    return normalized;
  }
  return null;
}

export function stableValue(value: unknown): JsonValue {
  return normalizeStableValue(value, new Set());
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

export function hashValue(value: unknown): string {
  const input = stableStringify(value);
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `h53:${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0")}`;
}
