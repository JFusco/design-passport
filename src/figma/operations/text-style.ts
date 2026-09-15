import type { BindableField, NodeSnapshot } from "../../core/contracts";
import { TYPOGRAPHY_FIELDS } from "../../core/operations/node-fields";
import { hashValue } from "../../core/stable";
import { mapConcurrent } from "../context-cache";

interface TextStyleMaterial {
  id: string;
  key: string;
  name: string;
  remote: boolean;
  fontSize: number;
  fontName: FontName;
  letterSpacing: LetterSpacing;
  lineHeight: LineHeight;
  paragraphSpacing: number;
  paragraphIndent: number;
  boundVariables?: TextStyle["boundVariables"];
}

function material(style: BaseStyle | null): TextStyleMaterial | undefined {
  if (!style || style.type !== "TEXT") return undefined;
  // Detach every nested value from Figma's live bridge for a stable epoch.
  return JSON.parse(JSON.stringify({ id: style.id, key: style.key, name: style.name, remote: style.remote,
    fontSize: style.fontSize, fontName: style.fontName, letterSpacing: style.letterSpacing, lineHeight: style.lineHeight,
    paragraphSpacing: style.paragraphSpacing, paragraphIndent: style.paragraphIndent, boundVariables: style.boundVariables,
  })) as TextStyleMaterial;
}

export function mixedTypographyFields(node: TextNode): BindableField[] {
  const output: BindableField[] = [];
  if (node.fontName === figma.mixed) output.push("fontFamily", "fontStyle");
  for (const field of ["fontSize", "fontWeight", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent"] as const) {
    if (node[field] === figma.mixed) output.push(field);
  }
  return output;
}

/** Resolved remote styles count exactly like local styles; availability is evidence, not approval. */
export class TextStyleEvidenceReader {
  private readonly captured = new Map<string, Promise<TextStyleMaterial | undefined>>();

  private async read(id: string): Promise<TextStyleMaterial | undefined> {
    try { return material(await figma.getStyleByIdAsync(id)); }
    catch { return undefined; }
  }

  async evidence(node: TextNode, text: NonNullable<NodeSnapshot["text"]>): Promise<NonNullable<NodeSnapshot["text"]>["style"]> {
    const id = node.textStyleId;
    if (id === figma.mixed) return { status: "mixed", controlledFields: [], overriddenFields: [] };
    if (!id) return undefined;
    let pending = this.captured.get(id);
    if (!pending) { pending = this.read(id); this.captured.set(id, pending); }
    const style = await pending;
    if (!style) return { id, status: "unavailable", controlledFields: [], overriddenFields: [] };
    // These values were captured or validated live during this build. Reusing
    // them avoids another full set of per-text Plugin API property reads.
    const mixed = new Set(text.mixedFields);
    const current: Partial<Record<BindableField, unknown>> = {
      fontFamily: text.fontFamily, fontStyle: text.fontStyle, fontSize: text.fontSize,
      letterSpacing: text.letterSpacing, lineHeight: text.lineHeight,
      paragraphSpacing: text.paragraphSpacing, paragraphIndent: text.paragraphIndent,
    };
    const expected: Partial<Record<BindableField, unknown>> = {
      fontFamily: style.fontName?.family, fontStyle: style.fontName?.style, fontSize: style.fontSize,
      letterSpacing: style.letterSpacing, lineHeight: style.lineHeight,
      paragraphSpacing: style.paragraphSpacing, paragraphIndent: style.paragraphIndent,
    };
    const controlledFields = TYPOGRAPHY_FIELDS.filter((field) => !mixed.has(field) && field !== "fontWeight"
      && expected[field] !== undefined && hashValue(current[field]) === hashValue(expected[field]));
    // TextStyle owns a font face rather than a numeric fontWeight property. An
    // unchanged family/style establishes the face's weight without guessing by name.
    if (!mixed.has("fontWeight") && controlledFields.includes("fontFamily") && controlledFields.includes("fontStyle")) controlledFields.push("fontWeight");
    const overriddenFields = TYPOGRAPHY_FIELDS.filter((field) => !controlledFields.includes(field) && !mixed.has(field));
    let explicitOverrideKinds: string[] = [];
    if (overriddenFields.length > 0) {
      try {
        explicitOverrideKinds = [...new Set(node.getStyledTextSegments(["textStyleOverrides"])
          .flatMap((segment) => segment.textStyleOverrides ?? []).map(String))].sort();
      } catch { /* Older runtimes still retain value-difference evidence. */ }
    }
    return { id, key: style.key, name: style.name, remote: style.remote, status: "resolved", controlledFields, overriddenFields,
      ...(explicitOverrideKinds.length > 0 ? { explicitOverrideKinds } : {}) };
  }

  async verify(): Promise<boolean> {
    const matches = await mapConcurrent([...this.captured], 8, async ([id, expected]) =>
      hashValue(await expected) === hashValue(await this.read(id)), () => false);
    return matches.every(Boolean);
  }

  async fingerprint(): Promise<string> {
    return hashValue(await Promise.all([...this.captured].sort(([left], [right]) => left.localeCompare(right))
      .map(async ([id, pending]) => ({ id, material: await pending }))));
  }
}
