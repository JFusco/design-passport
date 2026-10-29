import { designChangeStatusMessage } from "./conductor-submission-status";
import { parseDesignSubmission, type DesignSubmission } from "../core/conductor-contracts";
import { readConductorSelection } from "../figma/conductor-selection";
export interface DesignChangeContext {
  projectId: string; projectName: string; deliverableId: string; deliverableName: string;
  componentId: string; componentName: string; connectionVersion: number;
  frames: DesignSubmission["frames"];
  frameDetails: Record<string, { variantName: string; isDefaultAppearance: boolean; deviceTargetSlug: string; frameWidth: number }>;
}
export interface DesignChangeState {
  project: string; deliverable: string; feature: string;
  frames: { id: string; name: string; variantName: string; appearance: string; breakpoint: string; width: number; newLink: boolean }[];
  annotations: { id: string; text: string }[];
  review?: { summary: string; annotationIds: string[] } | undefined;
}
export type DesignChangeCommand = { type: "conductor-start-change" } | { type: "conductor-edit-change" }
  | { type: "conductor-review-change"; summary: string; annotationIds: string[] } | { type: "conductor-confirm-change" };
export function createDesignChangeController(deps: {
  request: (path: string) => Promise<unknown>;
  current: () => boolean;
  present: (message: string, state?: DesignChangeState) => void;
  pending: Pick<ReturnType<typeof import("./conductor-pending-send").createPendingSendController>, "blocked" | "send">;
  newId: () => string;
}) {
  let generation = 0;
  let selected: ReturnType<typeof readConductorSelection> | undefined;
  let context: DesignChangeContext | undefined;
  let state: DesignChangeState | undefined;
  const liveSelection = () => {
    const live = readConductorSelection();
    if (JSON.stringify(live) !== JSON.stringify(selected)) throw new Error("The selected frames, widths, bindings or annotations changed. Review Send design changes again.");
    return live;
  };
  const load = async (selection: ReturnType<typeof readConductorSelection>) => {
    const query = `fileKey=${encodeURIComponent(selection.fileKey)}&${selection.frames.map(frame => `nodeId=${encodeURIComponent(frame.id)}`).join("&")}`;
    const data = await deps.request(`/api/figma-plugin/v1/submissions/context?${query}`) as DesignChangeContext;
    const binding = selection.frames[0]!.binding;
    if (!data || data.projectId !== binding.projectId || data.deliverableId !== binding.deliverableId || data.componentId !== binding.componentId || data.connectionVersion !== binding.connectionVersion ||
      ![data.projectName, data.deliverableName, data.componentName].every(name => typeof name === "string" && name.length > 0 && name.length <= 200) ||
      !Array.isArray(data.frames) || data.frames.length !== selection.frames.length || !data.frameDetails) throw new Error("The destination no longer matches these Design frames. Refresh and review again.");
    for (const frame of selection.frames) {
      const target = data.frames.find(entry => entry.nodeId === frame.id), detail = data.frameDetails[frame.id];
      if (!target || target.variantId !== frame.binding.variantId || !detail || typeof detail.variantName !== "string" || !detail.variantName ||
        typeof detail.isDefaultAppearance !== "boolean" || typeof detail.deviceTargetSlug !== "string" || !detail.deviceTargetSlug ||
        !Number.isFinite(detail.frameWidth) || detail.frameWidth !== frame.width) throw new Error("A selected frame must exactly match its configured project breakpoint. Check its width and review again.");
    }
    return data;
  };
  return {
    reset() { generation++; selected = undefined; context = undefined; state = undefined; },
    async handle(command: DesignChangeCommand) {
      const version = generation, current = () => version === generation && deps.current();
      if (await deps.pending.blocked() || !current()) return;
      if (command.type === "conductor-start-change") {
        const selection = readConductorSelection();
        const data = await load(selection); if (!current()) return;
        selected = selection; context = data;
        state = { project: data.projectName, deliverable: data.deliverableName, feature: data.componentName,
          frames: selection.frames.map(frame => { const detail = data.frameDetails[frame.id]!;
            return { id: frame.id, name: frame.name, variantName: detail.variantName, appearance: detail.isDefaultAppearance ? "Default appearance" : "Named variant",
              breakpoint: detail.deviceTargetSlug, width: detail.frameWidth, newLink: data.frames.find(entry => entry.nodeId === frame.id)!.expectedVariantVersion === null }; }),
          annotations: selection.annotations.map(({ id, text }) => ({ id, text })),
        };
        deps.present("Describe the design changes and choose which annotations to include. Nothing has been saved.", state); return;
      }
      if (!selected || !context || !state) throw new Error("Choose Send design changes and review its destination first.");
      const live = liveSelection();
      if (command.type === "conductor-edit-change") { state = { ...state, review: undefined }; deps.present("Edit the summary and checked annotations, then review again.", state); return; }
      if (command.type === "conductor-review-change") {
        if (!command.summary.trim()) throw new Error("Describe the design changes before sending. If nothing changed, cancel and use Design Notes in Conductor.");
        if (new Set(command.annotationIds).size !== command.annotationIds.length || command.annotationIds.some(id => !live.annotations.some(note => note.id === id))) throw new Error("The checked annotations changed. Review them again.");
        state = { ...state, review: { summary: command.summary.trim(), annotationIds: command.annotationIds } };
        deps.present("Confirm the exact destination, design changes and checked annotations below.", state); return;
      }
      if (!state.review) throw new Error("Review your summary and design details before sending.");
      const latest = await load(live); if (!current()) return;
      if (JSON.stringify(latest) !== JSON.stringify(context)) { selected = undefined; context = undefined; state = undefined; throw new Error("The destination, variant version or breakpoint changed. Choose Send design changes and review it again."); }
      liveSelection();
      const review = state.review;
      const payload = parseDesignSubmission({ intent: "design_change", submissionId: deps.newId(), componentId: context.componentId,
        connectionVersion: context.connectionVersion, fileKey: live.fileKey, message: review.summary,
        frames: context.frames.map(({ nodeId, variantId, expectedVariantVersion }) => ({ nodeId, variantId, expectedVariantVersion, frameWidth: live.frames.find(frame => frame.id === nodeId)!.width })),
        annotations: live.annotations.filter(note => review.annotationIds.includes(note.id)).map(({ nodeId, text }) => ({ nodeId, text })),
      });
      const receipt = await deps.pending.send(payload, "bound"); if (!current() || !receipt) return;
      selected = undefined; context = undefined; state = undefined;
      deps.present(designChangeStatusMessage(receipt));
    },
  };
}
