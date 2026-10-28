import { parseDesignSubmission, type DesignSubmission, type SubmissionResult } from "../core/conductor-contracts";
import { readExistingFrame } from "../figma/conductor-existing-frame";
import { parseDestinationOptions, type ExistingFrameCommand, type ExistingFrameState } from "./conductor-existing-state";
import { ConductorSubmissionRefusedError, type ConductorCredentials } from "./conductor-transport";

export function createExistingFrameController(deps: {
  credentials: () => ConductorCredentials;
  request: (path: string, body?: unknown) => Promise<unknown>;
  present: (message: string, state?: ExistingFrameState, result?: string) => void;
  current: () => boolean;
  newId: () => string;
}) {
  let generation = 0;
  let state: ExistingFrameState | undefined;
  let resultPath: string | undefined;
  const selected = () => {
    const frame = readExistingFrame();
    if (!state || JSON.stringify(frame) !== JSON.stringify(state.frame)) throw new Error("Your selected frame, name, width or annotations changed. Choose Send existing frame to Conductor and review it again.");
    return frame;
  };
  const key = (token: ConductorCredentials, fileKey: string) => `conductor-existing-pending-v1:${token.origin}:${token.ownerUserId}:${fileKey}`;
  return {
    reset() { generation++; state = undefined; resultPath = undefined; },
    async handle(command: ExistingFrameCommand) {
      const token = deps.credentials();
      const version = generation;
      const current = () => version === generation && deps.current();
      if (command.type === "conductor-open-existing-result") {
        if (!resultPath) throw new Error("Send a frame before opening its destination.");
        figma.openExternal(`${deps.credentials().origin}${resultPath}`); return;
      }
      if (command.type === "conductor-start-existing" || command.type === "conductor-existing-destination") {
        const frame = command.type === "conductor-start-existing" ? readExistingFrame() : selected();
        if (command.type === "conductor-start-existing") {
          const pendingKey = key(token, frame.fileKey);
          let saved: unknown = await figma.clientStorage.getAsync(pendingKey);
          if (!current()) return;
          const legacyKey = `conductor-existing-pending-v1:${token.origin}:${token.ownerUserId}`;
          const legacy: unknown = await figma.clientStorage.getAsync(legacyKey);
          if (!current()) return;
          if (legacy) {
            const pending = parseDesignSubmission(legacy);
            if (pending.fileKey === frame.fileKey) {
              if (saved && JSON.stringify(parseDesignSubmission(saved)) !== JSON.stringify(pending)) throw new Error("A previous frame submission still needs acknowledgement. Retry its original frame and details before sending another design.");
              // Copy before deleting so interruption never loses the original retry identity.
              if (!saved) {
                await figma.clientStorage.setAsync(pendingKey, pending);
                if (!current()) return;
              }
              await figma.clientStorage.deleteAsync(legacyKey);
              if (!current()) return;
              saved = pending;
            }
          }
          if (saved) {
            const pending = parseDesignSubmission(saved);
            const original = pending.existingFrame;
            if (!original || pending.fileKey !== frame.fileKey || pending.frames[0]?.nodeId !== frame.id || original.frameName !== frame.name || original.frameWidth !== frame.width) throw new Error(`A previous handoff for “${original?.frameName ?? "another frame"}” still needs acknowledgement. Select its original frame at its original width, then choose Send existing frame again.`);
            const query = { projectId: original.projectId, deliverableId: original.deliverableId, componentId: pending.componentId };
            const params = Object.entries(query).map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("&");
            const data = parseDestinationOptions(await deps.request(`/api/figma-plugin/v1/destinations?${params}`));
            if (!current()) return;
            const annotationIds = pending.annotations.map((note) => frame.annotations.find((entry) => entry.nodeId === note.nodeId && entry.text === note.text)?.id);
            if (annotationIds.some((id) => !id)) throw new Error("The pending handoff’s original annotations changed. Restore those notes before retrying.");
            state = { frame, query, ...data, review: { variantName: original.variantName, isDefaultAppearance: original.isDefaultAppearance, deviceTargetSlug: original.deviceTargetSlug, message: pending.message, annotationIds: annotationIds as string[] } };
            deps.present("A previous handoff still needs acknowledgement. Check its original details, then send again to check the saved result without duplicating it.", state); return;
          }
        }
        const query = command.type === "conductor-start-existing" ? {} : { ...(command.projectId ? { projectId: command.projectId } : {}), ...(command.deliverableId ? { deliverableId: command.deliverableId } : {}), ...(command.componentId ? { componentId: command.componentId } : {}), ...(command.search ? { search: command.search } : {}) };
        const prior = state;
        const projectName = query.projectId ? (prior?.query.projectId === query.projectId ? prior.path?.project : prior?.options.find((entry) => entry.id === query.projectId)?.name) : undefined;
        const deliverableName = query.deliverableId ? (prior?.query.deliverableId === query.deliverableId ? prior.path?.deliverable : prior?.options.find((entry) => entry.id === query.deliverableId)?.name) : undefined;
        const path = projectName ? { project: projectName, ...(deliverableName ? { deliverable: deliverableName } : {}) } : undefined;
        state = { frame, query, ...(path ? { path } : {}), options: [], more: false };
        deps.present("Loading destinations you can access…", state);
        const search = Object.entries(query).map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("&");
        const data = parseDestinationOptions(await deps.request(`/api/figma-plugin/v1/destinations${search ? `?${search}` : ""}`));
        if (!current()) return;
        state = { frame, query, ...(path ? { path } : {}), ...data };
        deps.present(data.destination ? "Name the design and match its width to a project breakpoint." : "Choose where this frame will land. Nothing has been saved.", state); return;
      }
      if (command.type === "conductor-edit-existing") {
        selected();
        state = { ...state!, details: state!.review, review: undefined };
        deps.present("Edit the design details, then review the destination again.", state); return;
      }
      const frame = selected();
      const target = state!.destination;
      if (!target) throw new Error("Choose a project, deliverable and feature/component first.");
      if (command.type === "conductor-review-existing") {
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
      const pendingKey = key(token, frame.fileKey);
      const saved: unknown = await figma.clientStorage.getAsync(pendingKey);
      if (!current()) return;
      if (!saved && JSON.stringify(latest.destination) !== JSON.stringify(target)) {
        state = { ...state!, ...latest, details: review, review: undefined };
        deps.present("The destination or project breakpoints changed. Review the updated details before sending.", state); return;
      }
      selected();
      const payload = parseDesignSubmission({ submissionId: deps.newId(), connectionVersion: 1, componentId: target.component.id, fileKey: frame.fileKey,
        existingFrame: { projectId: target.project.id, deliverableId: target.deliverable.id, frameName: frame.name, variantName: review.variantName, isDefaultAppearance: review.isDefaultAppearance, frameWidth: frame.width, deviceTargetSlug: review.deviceTargetSlug },
        frames: [{ nodeId: frame.id, variantId: deps.newId(), expectedVariantVersion: null }], message: review.message, annotations: frame.annotations.filter((note) => review.annotationIds.includes(note.id)).map(({ nodeId, text }) => ({ nodeId, text })) });
      let pending = payload;
      if (saved) {
        const previous = parseDesignSubmission(saved);
        const identity = (entry: DesignSubmission) => JSON.stringify({ ...entry, submissionId: "", frames: entry.frames.map((item) => ({ ...item, variantId: "" })) });
        if (identity(previous) !== identity(payload)) throw new Error("A previous frame submission still needs acknowledgement. Retry its original frame and details before sending another design.");
        pending = previous;
      }
      await figma.clientStorage.setAsync(pendingKey, pending);
      if (!current()) return;
      let result: SubmissionResult;
      try { result = await deps.request("/api/figma-plugin/v1/submissions", pending) as SubmissionResult; }
      catch (error) {
        if (!current()) return;
        if (error instanceof ConductorSubmissionRefusedError) {
          await figma.clientStorage.deleteAsync(pendingKey);
          if (!current()) return;
          state = { ...state!, details: review, review: undefined };
          const message = "Conductor refused this submission. Check your project access, frame width, design name and default appearance, then review the destination again. Existing designs are unchanged.";
          deps.present(message, state);
          throw new ConductorSubmissionRefusedError(message);
        }
        throw error;
      }
      if (!current()) return;
      if (typeof result.commentId !== "string" || result.variantIds?.length !== 1 || result.variantIds[0] !== pending.frames[0]!.variantId) throw new Error("Conductor has not confirmed this submission. Retry with the same frame and details.");
      await figma.clientStorage.deleteAsync(pendingKey);
      if (!current()) return;
      resultPath = `/projects/${encodeURIComponent(target.project.id)}/deliverables/${encodeURIComponent(target.deliverable.id)}/features/${encodeURIComponent(target.component.id)}?tab=design`;
      state = undefined;
      deps.present(`Saved “${review.variantName}” as ${review.isDefaultAppearance ? "Default appearance" : "a named variant"} at ${frame.width}px in ${target.project.name} / ${target.deliverable.name} / ${target.component.name} → Design. Your message and checked annotations are in Design discussion. Approval and workflow state are unchanged.`, undefined, resultPath);
    },
  };
}
