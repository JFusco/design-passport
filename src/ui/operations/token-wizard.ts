import type { BindableField } from "../../core/contracts";
import type { VariableCollectionOption } from "../../figma/adapter";

export function defaultTokenCollectionId(
  field: BindableField,
  collections: readonly VariableCollectionOption[],
): string {
  const preferredName = field === "fills" || field === "strokes"
    ? /color/i
    : /dimension|space|size|typography|type/i;
  return collections.find((collection) => preferredName.test(collection.name))?.id ?? collections[0]?.id ?? "";
}
