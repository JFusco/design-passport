import type { BindableField, JsonValue } from "../../core/contracts";
import { stableStringify } from "../../core/stable";

function paints(value: unknown): ReadonlyArray<Paint> {
  return Array.isArray(value) ? value as ReadonlyArray<Paint> : [];
}

export function readBindableRawValue(node: SceneNode, field: BindableField): JsonValue | undefined {
  if (field === "fills" || field === "strokes") {
    if (!(field in node)) return undefined;
    const value = field === "fills"
      ? ("fills" in node ? node.fills : undefined)
      : ("strokes" in node ? node.strokes : undefined);
    const paint = paints(value).find((item) => item.type === "SOLID" && item.visible !== false);
    return paint?.type === "SOLID" ? { r: paint.color.r, g: paint.color.g, b: paint.color.b, a: paint.opacity ?? 1 } : undefined;
  }
  if (field === "lineHeight" && node.type === "TEXT") {
    const value = node.lineHeight;
    if (typeof value !== "object") return undefined;
    if (value.unit === "PIXELS") return value.value;
    if (value.unit === "PERCENT" && typeof node.fontSize === "number") return node.fontSize * value.value / 100;
    return undefined;
  }
  if (field === "letterSpacing" && node.type === "TEXT") {
    const value = node.letterSpacing;
    if (typeof value !== "object") return undefined;
    if (value.unit === "PIXELS") return value.value;
    if (value.unit === "PERCENT" && typeof node.fontSize === "number") return node.fontSize * value.value / 100;
    return undefined;
  }
  if (field === "fontFamily" && node.type === "TEXT" && node.fontName !== figma.mixed) return node.fontName.family;
  if (field === "fontStyle" && node.type === "TEXT" && node.fontName !== figma.mixed) return node.fontName.style;
  if (field === "fontSize" && node.type === "TEXT") return typeof node.fontSize === "number" ? node.fontSize : undefined;
  if (field === "fontWeight" && node.type === "TEXT") return typeof node.fontWeight === "number" ? node.fontWeight : undefined;
  if (field === "paragraphSpacing" && node.type === "TEXT") return typeof node.paragraphSpacing === "number" ? node.paragraphSpacing : undefined;
  if (field === "paragraphIndent" && node.type === "TEXT") return typeof node.paragraphIndent === "number" ? node.paragraphIndent : undefined;
  if (field in node) {
    const value = node[field as keyof SceneNode];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}

export function sameBindableValue(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  return left !== undefined && right !== undefined && stableStringify(left) === stableStringify(right);
}
