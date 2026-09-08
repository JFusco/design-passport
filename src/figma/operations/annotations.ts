export function annotationText(annotation: Annotation): string {
  return annotation.labelMarkdown ?? annotation.label ?? "";
}

export function copyAnnotationForWrite(annotation: Annotation): Annotation {
  const text = annotationText(annotation);
  return {
    ...(annotation.labelMarkdown !== undefined ? { labelMarkdown: text } : { label: text }),
    ...(annotation.properties ? { properties: [...annotation.properties] } : {}),
    ...(annotation.categoryId ? { categoryId: annotation.categoryId } : {}),
  };
}

export function preservedAnnotations(
  annotations: readonly Annotation[],
  excludedPrefixes: readonly string[],
): Annotation[] {
  return annotations
    .filter((annotation) => !excludedPrefixes.some((prefix) => annotationText(annotation).startsWith(prefix)))
    .map(copyAnnotationForWrite);
}
