import { designChangeStatusMessage } from "./conductor-submission-status";
import { parseDesignSubmission } from "../core/conductor-contracts";
import { readExistingFrame } from "../figma/conductor-existing-frame";
import { parseDestinationOptions, type ExistingFrameCommand, type ExistingFrameState } from "./conductor-existing-state";
import { type ConductorCredentials } from "./conductor-transport";
import { LegacySendRefusedError } from "./conductor-pending-send";

export function createExistingFrameController(deps: {
  credentials: () => ConductorCredentials;
  request: (path: string, body?: unknown) => Promise<unknown>;
  present: (message: string, state?: ExistingFrameState, result?: string) => void;
  current: () => boolean;
  newId: () => string;
  pending: Pick<ReturnType<typeof import("./conductor-pending-send").createPendingSendController>, "review" | "send">;
}) {
  let generation = 0;
  let state: ExistingFrameState | undefined;
  let resultPath: string | undefined;
  const selected = () => {
    const frame = readExistingFrame();
    if (!state || JSON.stringify(frame) !== JSON.stringify(state.frame)) throw new Error("Your selected frame, name, width or annotations changed. Choose Send existing frame to Conductor and review it again.");
    return frame;
  };
  let intent: "design_change" | undefined;
  return {
    reset() { generation++; state = undefined; resultPath = undefined; intent = undefined; },
    async handle(command: ExistingFrameCommand) {
      deps.credentials();
      const version = generation;
      const current = () => version === generation && deps.current();
      if (command.type === "conductor-open-existing-result") {
        if (!resultPath) throw new Error("Send a frame before opening its destination.");
        figma.openExternal(`${deps.credentials().origin}${resultPath}`); return;
      }
      if (command.type === "conductor-start-existing" || command.type === "conductor-start-existing-change" || command.type === "conductor-existing-destination") {
        const starting = command.type !== "conductor-existing-destination";
        if (starting) intent = command.type === "conductor-start-existing-change" ? "design_change" : undefined;
        const retry = await deps.pending.review("existing", intent);
        if (!retry || !current()) return;
        const frame = starting ? readExistingFrame() : selected();
        const original = retry.payload?.existingFrame;
        if (original && (retry.payload!.frames[0]?.nodeId !== frame.id || original.frameName !== frame.name || original.frameWidth !== frame.width)) throw new Error("Select the original frame with its reviewed name and width before retrying, or resolve the pending send.");
        const query = original ? { projectId: original.projectId, deliverableId: original.deliverableId, componentId: retry.payload!.componentId } : starting ? {} : { ...(command.projectId ? { projectId: command.projectId } : {}), ...(command.deliverableId ? { deliverableId: command.deliverableId } : {}), ...(command.componentId ? { componentId: command.componentId } : {}), ...(command.search ? { search: command.search } : {}) };
        const prior = state;
        const projectName = query.projectId ? (prior?.query.projectId === query.projectId ? prior.path?.project : prior?.options.find((entry) => entry.id === query.projectId)?.name) : undefined;
        const deliverableName = query.deliverableId ? (prior?.query.deliverableId === query.deliverableId ? prior.path?.deliverable : prior?.options.find((entry) => entry.id === query.deliverableId)?.name) : undefined;
        const path = projectName ? { project: projectName, ...(deliverableName ? { deliverable: deliverableName } : {}) } : undefined;
        state = { frame, query, ...(intent ? { intent } : {}), ...(path ? { path } : {}), options: [], more: false };
        deps.present("Loading destinations you can access…", state);
        const search = Object.entries(query).map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("&");
        const data = parseDestinationOptions(await deps.request(`/api/figma-plugin/v1/destinations${search ? `?${search}` : ""}`));
        if (!current()) return;
        state = { frame, query, ...(intent ? { intent } : {}), ...(path ? { path } : {}), ...data };
        if (original) {
          if (!data.destination || data.destination.project.id !== original.projectId || data.destination.deliverable.id !== original.deliverableId || data.destination.component.id !== retry.payload!.componentId || !data.destination.devices.some(device => device.slug === original.deviceTargetSlug && device.width === frame.width)) throw new Error("The original destination or breakpoint changed. Check its receipt or resolve the pending send.");
          const annotationIds = retry.payload!.annotations.map(note => frame.annotations.find(source => source.nodeId === note.nodeId && source.text === note.text)?.id);
          if (annotationIds.some(id => !id)) throw new Error("The original checked annotations changed. Check its receipt or resolve the pending send.");
          state.review = { variantName: original.variantName, isDefaultAppearance: original.isDefaultAppearance, deviceTargetSlug: original.deviceTargetSlug, message: retry.payload!.message, annotationIds: annotationIds as string[] };
        }
        deps.present(data.destination ? "Name the design and match its width to a project breakpoint." : "Choose where this frame will land. Nothing has been saved.", state); return;
      }
      if (command.type === "conductor-edit-existing") {
        selected();
        state = { ...state!, details: state!.review, review: undefined };
        deps.present("Edit the design details, then review the destination again.", state); return;
      }
      if (!await deps.pending.review("existing", intent) || !current()) return;
      const frame = selected();
      const target = state!.destination;
      if (!target) throw new Error("Choose a project, deliverable and feature/component first.");
      if (command.type === "conductor-review-existing") {
        if (intent && !command.message.trim()) throw new Error("Describe the design changes before sending. If nothing changed, cancel and use Design Notes in Conductor.");
        const device = target.devices.find((entry) => entry.slug === command.deviceTargetSlug);
        if (!device || device.width !== frame.width) throw new Error(`This frame is ${frame.width}px wide. Choose a configured project breakpoint with the same width, or resize the frame in Figma and start again.`);
        if (command.isDefaultAppearance && device.hasDefault) throw new Error("A default design already exists at this breakpoint. Choose Named variant and enter a unique name. The existing default will stay unchanged.");
        if (!command.variantName.trim() || command.variantName.trim().length > 200) throw new Error("Enter a design / variant name of 1–200 characters.");
        if (command.annotationIds.some((id) => !frame.annotations.some((note) => note.id === id))) throw new Error("The selected annotations changed. Review this frame again.");
        state = { ...state!, review: { variantName: command.variantName.trim(), isDefaultAppearance: command.isDefaultAppearance, deviceTargetSlug: command.deviceTargetSlug, message: command.message, annotationIds: command.annotationIds } };
        deps.present("Confirm the destination and details below. Nothing has been saved yet.", state); return;
      }
      const review = state!.review;
      if (!review) throw new Error("Review the destination and design details before sending.");
      // Refresh destination metadata so a renamed target or changed breakpoint needs a new review.
      const params = `projectId=${encodeURIComponent(target.project.id)}&deliverableId=${encodeURIComponent(target.deliverable.id)}&componentId=${encodeURIComponent(target.component.id)}`;
      const latest = parseDestinationOptions(await deps.request(`/api/figma-plugin/v1/destinations?${params}`));
      if (!current()) return;
      if (JSON.stringify(latest.destination) !== JSON.stringify(target)) {
        state = { ...state!, ...latest, details: review, review: undefined };
        deps.present("The destination or project breakpoints changed. Review the updated details before sending.", state); return;
      }
      selected();
      const payload = parseDesignSubmission({ ...(intent ? { intent } : {}), submissionId: deps.newId(), connectionVersion: 1, componentId: target.component.id, fileKey: frame.fileKey,
        existingFrame: { projectId: target.project.id, deliverableId: target.deliverable.id, frameName: frame.name, variantName: review.variantName, isDefaultAppearance: review.isDefaultAppearance, frameWidth: frame.width, deviceTargetSlug: review.deviceTargetSlug },
        frames: [{ nodeId: frame.id, variantId: deps.newId(), expectedVariantVersion: null }], message: review.message, annotations: frame.annotations.filter((note) => review.annotationIds.includes(note.id)).map(({ nodeId, text }) => ({ nodeId, text })) });
      const destination = { project: target.project.name, deliverable: target.deliverable.name, component: target.component.name };
      const path = `/projects/${encodeURIComponent(target.project.id)}/deliverables/${encodeURIComponent(target.deliverable.id)}/features/${encodeURIComponent(target.component.id)}?tab=design`;
      let result;
      try { result = await deps.pending.send(payload, "existing", { destination, resultPath: path }); }
      catch (error) {
        if (current() && error instanceof LegacySendRefusedError) {
          state = { ...state!, details: review, review: undefined };
          deps.present(error.message, state);
        }
        throw error;
      }
      if (!current() || !result) return;
      resultPath = path;
      state = undefined;
      deps.present(`${intent ? `${designChangeStatusMessage(result)} ` : ""}Saved “${review.variantName}” as ${review.isDefaultAppearance ? "Default appearance" : "a named variant"} at ${frame.width}px in ${target.project.name} / ${target.deliverable.name} / ${target.component.name} → Design. Your message and checked annotations are in Design discussion. Approval and workflow state are unchanged.`, undefined, resultPath);
    },
  };
}
