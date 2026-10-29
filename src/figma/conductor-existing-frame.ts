import { CONDUCTOR_BINDING_KEY, CONDUCTOR_NAMESPACE } from "./conductor-binding";
import { annotationText } from "./operations/annotations";

export function readExistingFrame() {
  if (!figma.fileKey || figma.editorType !== "figma" || figma.mode !== "default") throw new Error("Open a saved Figma Design file before sending a frame.");
  const selection = figma.currentPage.selection;
  const frame = selection[0];
  if (selection.length !== 1 || !frame || frame.type !== "FRAME") throw new Error("Select one existing frame, then choose Send existing frame to Conductor.");
  let parent: BaseNode | null = frame;
  while (parent && parent.type !== "DOCUMENT") {
    if (parent.getSharedPluginData?.(CONDUCTOR_NAMESPACE, CONDUCTOR_BINDING_KEY)) throw new Error("This frame belongs to a Conductor workspace. Use selected design frames to send it to its existing component.");
    parent = parent.parent;
  }
  if (!frame.name.trim() || frame.name.length > 200) throw new Error("Give this frame a name of 1–200 characters before sending it.");
  const annotations = frame.annotations.map((annotation, index) => ({ id: `${frame.id}/${index}`, nodeId: frame.id, text: annotationText(annotation) })).filter((note) => note.text.trim());
  if (annotations.length > 20 || annotations.some((note) => note.text.length > 1000)) throw new Error("Include at most 20 frame annotations, each with at most 1,000 characters.");
  return { fileKey: figma.fileKey, id: frame.id, name: frame.name, width: frame.width, annotations };
}
