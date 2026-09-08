import type { BindableField, VariableCandidate } from "../contracts";

const FLOAT_FIELDS = new Set<BindableField>([
  "cornerRadius", "itemSpacing", "counterAxisSpacing", "gridRowGap", "gridColumnGap",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "width", "height",
  "opacity", "strokeWeight", "fontSize", "fontWeight", "letterSpacing", "lineHeight",
  "paragraphSpacing", "paragraphIndent",
]);

const FIELD_SCOPES: Record<BindableField, readonly string[]> = {
  fills: ["ALL_FILLS", "FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"],
  strokes: ["STROKE_COLOR"],
  cornerRadius: ["CORNER_RADIUS"],
  itemSpacing: ["GAP"],
  counterAxisSpacing: ["GAP"],
  gridRowGap: ["GAP"],
  gridColumnGap: ["GAP"],
  paddingTop: ["GAP"],
  paddingRight: ["GAP"],
  paddingBottom: ["GAP"],
  paddingLeft: ["GAP"],
  width: ["WIDTH_HEIGHT"],
  height: ["WIDTH_HEIGHT"],
  opacity: ["OPACITY"],
  strokeWeight: ["STROKE_FLOAT"],
  fontFamily: ["FONT_FAMILY"],
  fontSize: ["FONT_SIZE"],
  fontStyle: ["FONT_STYLE"],
  fontWeight: ["FONT_WEIGHT"],
  letterSpacing: ["LETTER_SPACING"],
  lineHeight: ["LINE_HEIGHT"],
  paragraphSpacing: ["PARAGRAPH_SPACING"],
  paragraphIndent: ["PARAGRAPH_INDENT"],
};

export function variableTypeForBindableField(field: BindableField): VariableCandidate["type"] {
  if (field === "fills" || field === "strokes") return "COLOR";
  if (field === "fontFamily" || field === "fontStyle") return "STRING";
  if (FLOAT_FIELDS.has(field)) return "FLOAT";
  return "BOOLEAN";
}

export function scopesForBindableField(field: BindableField): readonly string[] {
  return FIELD_SCOPES[field];
}

export function isPreciselyScopedVariableForField(variable: VariableCandidate, field: BindableField): boolean {
  if (variable.type !== variableTypeForBindableField(field)) return false;
  if (variable.evidenceLevel !== "full" || variable.scopes.length === 0 || variable.scopes.includes("ALL_SCOPES")) return false;
  const accepted = new Set(scopesForBindableField(field));
  return variable.scopes.some((scope) => accepted.has(scope));
}
