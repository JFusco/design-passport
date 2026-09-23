const SEMANTIC_CATEGORIES = new Set([
  "semantic", "text", "surface", "background", "border", "action", "button", "input", "content",
  "color", "space", "spacing", "radius", "type", "font", "padding", "stack", "layout", "gutter", "gap", "inset",
  "size", "dimension", "grid", "breakpoint", "motion", "duration", "easing", "elevation", "shadow", "icon", "stroke", "z-index",
]);

const RAW_LITERAL = /^(?:#[0-9a-f]{3,8}|-?\d+(?:\.\d+)?(?:px|rem|em|%)?)$/i;

/** Category + purpose paths are semantic; raw value names are not. */
export function isSemanticVariableName(name: string): boolean {
  const segments = name.split("/").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length < 2 || segments.some((segment) => RAW_LITERAL.test(segment))) return false;
  const normalized = segments.map((segment) => segment.toLocaleLowerCase("en-US"));
  return normalized.every((segment) => /^[a-z][a-z0-9._-]*$/i.test(segment))
    && normalized.some((segment) => SEMANTIC_CATEGORIES.has(segment));
}
