import { assertCurrentConductorBinding, readConductorBinding } from "./conductor-binding";
import { annotationText } from "./operations/annotations";
import type { WorkspaceBinding } from "../core/conductor-contracts";

export function readConductorSelection() {
  const fileKey = figma.fileKey; if (!fileKey) throw new Error("Open a linked Figma file before selecting a design");
  const frames = new Map<string, { id: string; name: string; binding: WorkspaceBinding }>();
  const annotations: { id: string; nodeId: string; text: string }[] = [];
  if (figma.currentPage.selection.length < 1 || figma.currentPage.selection.length > 8) throw new Error("Select one to eight bound Design frames or annotated layers inside them");
  for (const selected of figma.currentPage.selection) {
    let node: BaseNode | null = selected; let design: BaseNode | undefined;
    while (node && node.type !== "PAGE" && node.type !== "DOCUMENT") {
      const binding = readConductorBinding(node);
      if (binding?.role === "reference" || binding?.role === "wireframe") throw new Error("Select the replacement Design frame, not its reference or wireframe");
      if (binding?.role === "design") { design = node; break; }
      node = node.parent;
    }
    if (!design) throw new Error("This selection is not inside a Conductor Design frame");
    const binding = assertCurrentConductorBinding(design, fileKey);
    frames.set(design.id, { id: design.id, name: design.name, binding });
    if ("annotations" in selected) selected.annotations.forEach((annotation, index) => {
      const text = annotationText(annotation);
      if (text.length > 1000) throw new Error("An annotation exceeds 1,000 characters; shorten it before submitting");
      if (text.trim()) annotations.push({ id: `${selected.id}/${index}`, nodeId: selected.id, text });
    });
  }
  if (annotations.length > 20) throw new Error("Select at most 20 annotations for one submission");
  if (new Set([...frames.values()].map((frame) => JSON.stringify([frame.binding.organizationId, frame.binding.projectId, frame.binding.deliverableId, frame.binding.componentId, frame.binding.connectionVersion]))).size !== 1) throw new Error("Submit frames for one Conductor component at a time");
  return { fileKey, frames: [...frames.values()], annotations };
}
