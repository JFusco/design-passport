import { createExistingFrameController } from "./conductor-existing-controller";
import { submissionStatusMessage } from "./conductor-submission-status";
import { readConductorSelection } from "../figma/conductor-selection";
import { parseDesignSubmission, type DesignSubmission, type SubmissionResult } from "../core/conductor-contracts";
import { assertContractVersion, WORKSPACE_LIMITS, type CanvasJob, type WorkspaceLease, type WorkspaceReceipt } from "../core/conductor-contracts";
import { CONDUCTOR_ENVIRONMENTS } from "./conductor-environments";
import type { ConductorCommand, ConductorPresentation } from "./conductor-state";
import { ConductorAuthorizationError, ConductorRequestTimeoutError, ConductorTransport, type ConductorCredentials } from "./conductor-transport";

interface ContextResponse {
  contractVersion: string; enabled: boolean; destination: { project: string; deliverable: string };
  jobs: ConductorPresentation["jobs"];
}
const STORAGE_KEY = "conductor-credentials-v1";
export function createConductorController(deps: {
  enterCanvas: () => () => void;
  post: (state: ConductorPresentation) => void;
  apply: (job: CanvasJob, lease: WorkspaceLease, screenshot: Uint8Array, checkpoint: () => Promise<WorkspaceLease>) => Promise<WorkspaceReceipt>;
}) {
  const transport = new ConductorTransport(CONDUCTOR_ENVIRONMENTS);
  const environments = CONDUCTOR_ENVIRONMENTS.map(({ id, label }) => ({ id, label }));
  let credentials: ConductorCredentials | undefined;
  let epoch = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = false;
  let submitting = false;
  let submissionSelection: { selection: ReturnType<typeof readConductorSelection>; context: { componentId: string; componentName: string; connectionVersion: number; frames: DesignSubmission["frames"]; workflow: { version: number; transitions: { id: string; label: string }[] } } } | undefined;
  const draftKey = (token: ConductorCredentials, fileKey: string) => `conductor-draft-v1:${token.origin}:${token.ownerUserId}:${fileKey}`;
  const newRequestId = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => { const random = Math.floor(Math.random() * 16); return (char === "x" ? random : (random & 3) | 8).toString(16); });
  let presentation: ConductorPresentation = { state: "offline", message: "Connect to Conductor to prepare a workspace.", environments, jobs: [] };
  let busy: ConductorPresentation["busy"];
  const present = (state: ConductorPresentation["state"], message: string, rest: Partial<ConductorPresentation> = {}) => {
    presentation = { state, message, environments, jobs: state === "connected" ? presentation.jobs : [], ...(state === "connected" && presentation.destination ? { destination: presentation.destination } : {}), ...rest };
    deps.post({ ...presentation, ...(busy ? { busy } : {}) });
  };
  const stop = () => { existing.reset(); submissionSelection = undefined; active = false; epoch++; if (timer !== undefined) clearTimeout(timer); timer = undefined; transport.stop(); };
  const requireCredentials = () => {
    if (!active || !credentials || Date.parse(credentials.expiresAt) <= Date.now()) throw new Error("Connect to Conductor again; your connection expired or is offline");
    return credentials;
  };
  const existing = createExistingFrameController({
    credentials: requireCredentials,
    request: (path, body) => { const token = requireCredentials(); return transport.request(token.origin, path, { token: token.token, ...(body === undefined ? {} : { body }) }); },
    present: (message, state, result) => present("connected", message, { ...(state ? { existing: state } : {}), ...(result ? { existingResult: result } : {}) }),
    current: () => active && Boolean(credentials), newId: newRequestId,
  });
  const refresh = async () => {
    const token = requireCredentials(); const generation = epoch;
    if (!figma.fileKey) { present("unavailable", "This file has no stable Figma key. Open a linked file to prepare workspaces."); return; }
    const context = await transport.request(token.origin, `/api/figma-plugin/v1/context?fileKey=${encodeURIComponent(figma.fileKey)}`, { token: token.token }) as ContextResponse;
    if (generation !== epoch || !active) return;
    assertContractVersion(context.contractVersion);
    if (!context.enabled) { present("unavailable", "Design workspaces are not enabled for your organization. Offline audits remain available."); return; }
    if (!Array.isArray(context.jobs) || context.jobs.length > 100 || !context.destination || typeof context.destination.project !== "string" || typeof context.destination.deliverable !== "string") throw new Error("Invalid Conductor workspace response");
    let message = "Connected. Keep this file and the plugin open while preparing workspaces.";
    const requestId: unknown = await figma.clientStorage.getAsync(`${draftKey(token, figma.fileKey)}:receipt`);
    if (!active || generation !== epoch) return;
    if (typeof requestId === "string" && /^[a-f0-9-]{36}$/i.test(requestId)) {
      const status = await transport.request(token.origin, `/api/figma-plugin/v1/submissions/${encodeURIComponent(requestId)}`, { token: token.token }) as SubmissionResult;
      if (!active || generation !== epoch) return;
      message = submissionStatusMessage(status);
    }
    present("connected", message, { destination: context.destination, jobs: context.jobs });
  };
  const poll = async (origin: string, id: string, proof: string, deadline: number, generation: number, userCode: string) => {
    if (!active || generation !== epoch) return;
    if (Date.now() >= deadline) { present("error", "The connection code expired. Start a new connection."); return; }
    try {
      const result = await transport.request(origin, `/api/figma-plugin/v1/pairings/${encodeURIComponent(id)}`, { body: { pollingSecret: proof } }) as { state: string; token?: string; ownerUserId?: string; expiresAt?: string };
      if (!active || generation !== epoch) return;
      if (result.state === "connected" && typeof result.token === "string" && typeof result.ownerUserId === "string" && typeof result.expiresAt === "string") {
        const expiry = Date.parse(result.expiresAt);
        if (!Number.isFinite(expiry) || expiry <= Date.now() || expiry > Date.now() + WORKSPACE_LIMITS.tokenMs + 5_000) throw new Error("Invalid Conductor credential expiry");
        credentials = { origin, token: result.token, ownerUserId: result.ownerUserId, expiresAt: result.expiresAt };
        await figma.clientStorage.setAsync(STORAGE_KEY, credentials);
        await refresh(); return;
      }
      if (result.state !== "pending") throw new Error("Connection expired or was already redeemed. Start a new connection.");
      present("pairing", "Approve this connection in your browser, then return here.", { userCode });
      timer = setTimeout(() => { void poll(origin, id, proof, deadline, generation, userCode); }, WORKSPACE_LIMITS.pollMs);
    } catch (error) {
      if (!active || generation !== epoch) return;
      if (error instanceof ConductorRequestTimeoutError && Date.now() < deadline) {
        present("pairing", "Conductor is taking longer to respond. Still waiting for browser approval.", { userCode });
        timer = setTimeout(() => { void poll(origin, id, proof, deadline, generation, userCode); }, WORKSPACE_LIMITS.pollMs);
      } else present("error", error instanceof Error ? error.message : "Conductor connection failed. Try connecting again.");
    }
  };
  return {
    stop,
    async handle(command: ConductorCommand) {
      if (busy && command.type !== "conductor-offline" && command.type !== "conductor-disconnect") return;
      const activities: Partial<Record<ConductorCommand["type"], NonNullable<ConductorPresentation["busy"]>>> = {
        "conductor-start-existing": "choosing", "conductor-existing-destination": "choosing", "conductor-review-existing": "inspecting", "conductor-confirm-existing": "submitting", "conductor-connect": "connecting", "conductor-refresh": "refreshing", "conductor-inspect-selection": "inspecting", "conductor-submit": "submitting", "conductor-apply": "preparing",
      };
      busy = activities[command.type];
      if (busy) deps.post({ ...presentation, busy, hasError: false });
      try {
        if (["conductor-start-existing", "conductor-existing-destination", "conductor-review-existing", "conductor-edit-existing", "conductor-confirm-existing", "conductor-open-existing-result"].includes(command.type)) {
          const generation = epoch;
          try { await existing.handle(command as import("./conductor-existing-state").ExistingFrameCommand); }
          catch (error) { if (active && credentials && generation === epoch) throw error; }
          return;
        }
        if (command.type === "conductor-offline") { stop(); return; }
        if (command.type === "conductor-open") {
          stop(); credentials = undefined; active = true; transport.open(); const generation = epoch;
          const saved: unknown = await figma.clientStorage.getAsync(STORAGE_KEY);
          if (!active || generation !== epoch) return;
          if (saved && typeof saved === "object") {
            const value = saved as ConductorCredentials;
            if (CONDUCTOR_ENVIRONMENTS.some((env) => env.origin === value.origin) && typeof value.token === "string" && typeof value.ownerUserId === "string" && Date.parse(value.expiresAt) > Date.now()) credentials = value;
          }
          if (credentials) await refresh();
          else present("offline", "Connect in your browser to approve access to your Conductor workspaces.");
          return;
        }
        if (command.type === "conductor-disconnect") {
          const current = credentials; credentials = undefined;
          await figma.clientStorage.deleteAsync(STORAGE_KEY);
          if (current && active) await transport.request(current.origin, "/api/figma-plugin/v1/disconnect", { token: current.token, body: {} }).catch(() => {});
          stop(); present("offline", "Disconnected locally. You can also revoke Design Passport access from your Conductor profile."); return;
        }
        if (command.type === "conductor-connect") {
          stop(); active = true; transport.open(); const generation = epoch;
          const environment = transport.environment(command.environment);
          const pairing = await transport.request(environment.origin, "/api/figma-plugin/v1/pairings", { body: {} }) as { id: string; pollingSecret: string; userCode: string; verificationUrl: string; expiresAt: string };
          if (!active || generation !== epoch) return;
          const url = `${environment.origin}/design-passport/pair?code=${pairing.userCode}`;
          if (pairing.verificationUrl !== url || !/^[A-Z0-9]{8}$/.test(pairing.userCode) || typeof pairing.id !== "string" || pairing.id.length > 100 || typeof pairing.pollingSecret !== "string" || !/^[a-f0-9]{64}$/.test(pairing.pollingSecret)) throw new Error("Invalid Conductor approval URL");
          const deadline = Date.parse(pairing.expiresAt);
          if (!Number.isFinite(deadline) || deadline <= Date.now() || deadline > Date.now() + WORKSPACE_LIMITS.pairingMs + 5_000) throw new Error("Invalid pairing deadline");
          figma.openExternal(url); present("pairing", "Approve this connection in your browser, then return here.", { userCode: pairing.userCode });
          timer = setTimeout(() => { void poll(environment.origin, pairing.id, pairing.pollingSecret, deadline, generation, pairing.userCode); }, WORKSPACE_LIMITS.pollMs);
          return;
        }
        if (command.type === "conductor-inspect-selection") {
          const token = requireCredentials(); const generation = epoch;
          let selection: ReturnType<typeof readConductorSelection>;
          try { selection = readConductorSelection(); }
          catch (error) {
            submissionSelection = undefined;
            present("connected", error instanceof Error ? error.message : "Select a Design frame or annotated layer, then try again.", { hasError: true });
            return;
          }
          const query = `fileKey=${encodeURIComponent(selection.fileKey)}&${selection.frames.map((frame) => `nodeId=${encodeURIComponent(frame.id)}`).join("&")}`;
          const context = await transport.request(token.origin, `/api/figma-plugin/v1/submissions/context?${query}`, { token: token.token }) as NonNullable<typeof submissionSelection>["context"];
          if (generation !== epoch || !active) return;
          if (context.componentId !== selection.frames[0]?.binding.componentId || context.connectionVersion !== selection.frames[0]?.binding.connectionVersion || !Array.isArray(context.frames) || !context.workflow || !Array.isArray(context.workflow.transitions)) throw new Error("Selection no longer matches its Conductor component");
          submissionSelection = { selection, context };
          const saved: unknown = await figma.clientStorage.getAsync(draftKey(token, selection.fileKey));
          if (!active || generation !== epoch) return;
          let message = "";
          if (saved && typeof saved === "object" && "payload" in saved) { try { message = parseDesignSubmission(saved.payload).message; } catch { /* Invalid drafts cannot establish a destination. */ } }
          present("connected", "Review the destination and choose which annotations to submit.", { submission: { componentName: context.componentName, frames: selection.frames.map(({ id, name }) => ({ id, name })), message, annotations: selection.annotations.map(({ id, text }) => ({ id, text })), transitions: context.workflow.transitions } });
          return;
        }
        if (command.type === "conductor-submit") {
          if (submitting) return;
          submitting = true;
          try {
          const token = requireCredentials(); const selected = submissionSelection;
          if (!selected) throw new Error("Select and review the destination again before submitting");
          const current = readConductorSelection();
          if (JSON.stringify(current.frames.map((frame) => frame.id)) !== JSON.stringify(selected.selection.frames.map((frame) => frame.id)) || current.fileKey !== selected.selection.fileKey) throw new Error("Your selected design changed; review its destination again");
          const annotations = command.annotationIds.map((id) => { const note = current.annotations.find((note) => note.id === id); if (!note) throw new Error("Selected annotations changed; review them again"); return { nodeId: note.nodeId, text: note.text }; });
          const transition = command.transitionId ? selected.context.workflow.transitions.find((entry) => entry.id === command.transitionId) : undefined;
          if (command.transitionId && !transition) throw new Error("Choose a permitted workflow action");
          const key = draftKey(token, current.fileKey);
          const payload = parseDesignSubmission({ submissionId: newRequestId(), connectionVersion: selected.context.connectionVersion, componentId: selected.context.componentId, fileKey: current.fileKey, frames: selected.context.frames, message: command.message, annotations,
            ...(transition ? { transition: { id: transition.id, expectedWorkflowVersion: selected.context.workflow.version } } : {}) });
          const saved: unknown = await figma.clientStorage.getAsync(key);
          let pending = payload;
          if (saved && typeof saved === "object" && "payload" in saved) {
            const previous = parseDesignSubmission(saved.payload);
            if (previous.componentId !== payload.componentId || previous.fileKey !== payload.fileKey || previous.message !== payload.message || JSON.stringify(previous.annotations) !== JSON.stringify(payload.annotations) || previous.transition?.id !== payload.transition?.id || JSON.stringify(previous.frames.map((frame) => frame.nodeId)) !== JSON.stringify(payload.frames.map((frame) => frame.nodeId))) throw new Error("A previous submission still awaits acknowledgement. Retry its original message and selection before changing it.");
            pending = previous;
          }
            await figma.clientStorage.setAsync(key, { payload: pending });
            const result = await transport.request(token.origin, "/api/figma-plugin/v1/submissions", { token: token.token, body: pending }) as SubmissionResult;
            if (typeof result.commentId !== "string" || !Array.isArray(result.variantIds)) throw new Error("Submission acknowledgement is incomplete; retry to check its saved state");
            await figma.clientStorage.setAsync(`${key}:receipt`, pending.submissionId);
            await figma.clientStorage.deleteAsync(key); submissionSelection = undefined;
            present("connected", submissionStatusMessage(result));
          } finally { submitting = false; }
          return;
        }
        if (command.type === "conductor-refresh") { await refresh(); return; }
        if (command.type === "conductor-apply") {
          const release = deps.enterCanvas();
          try {
          const token = requireCredentials(); const generation = epoch;
          if (!figma.fileKey || figma.editorType !== "figma" || figma.mode !== "default") throw new Error("Prepare workspaces in the linked Figma Design file");
          const fileKey = figma.fileKey;
          const path = `/api/figma-plugin/v1/job-items/${encodeURIComponent(command.jobId)}`;
          const claimed = await transport.request(token.origin, `${path}/claim`, { token: token.token, body: { fileKey } }) as { job: CanvasJob; lease: WorkspaceLease };
          const checkpoint = async () => {
            requireCredentials(); if (generation !== epoch || figma.fileKey !== fileKey) throw new Error("Conductor session changed");
            return await transport.request(token.origin, `${path}/heartbeat`, { token: token.token, body: { fileKey, epoch: claimed.lease.epoch } }) as WorkspaceLease;
          };
          try {
            const screenshot = await transport.request(token.origin, `${path}/screenshot?fileKey=${encodeURIComponent(fileKey)}`, { token: token.token, binary: true }) as Uint8Array;
            const receipt = await deps.apply(claimed.job, claimed.lease, screenshot, checkpoint);
            await checkpoint();
            await transport.request(token.origin, `${path}/receipt`, { token: token.token, body: receipt });
            await refresh();
          } catch (error) {
            if (active && generation === epoch) await transport.request(token.origin, `${path}/failure`, { token: token.token, body: { fileKey, epoch: claimed.lease.epoch } }).catch(() => {});
            throw error;
          }
          } finally { release(); }
        }
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : "Conductor is unavailable. Your design is retained; try again.";
          const recoverable = credentials && Date.parse(credentials.expiresAt) > Date.now() && !(error instanceof ConductorAuthorizationError);
          present(recoverable ? "connected" : "error", message, { ...(recoverable ? { jobs: presentation.jobs, ...(presentation.destination ? { destination: presentation.destination } : {}), ...(presentation.submission ? { submission: presentation.submission } : {}), ...(presentation.existing ? { existing: presentation.existing } : {}), ...(presentation.existingResult ? { existingResult: presentation.existingResult } : {}) } : {}), hasError: true });
        }
      } finally { busy = undefined; deps.post(presentation); }
    },
  };
}
