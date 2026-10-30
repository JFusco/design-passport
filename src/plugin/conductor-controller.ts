import { existingPendingKey, createPendingSendController, type PendingSendMetadata } from "./conductor-pending-send";
import { designChangeStatusMessage, submissionStatusMessage } from "./conductor-submission-status";
import { createDesignChangeController } from "./conductor-change-controller";
import { readExistingFrame } from "../figma/conductor-existing-frame";
import { createExistingFrameController } from "./conductor-existing-controller";
import { readConductorSelection } from "../figma/conductor-selection";
import { parseDesignSubmission, parseSubmissionResult, type DesignSubmission } from "../core/conductor-contracts";
import { assertContractVersion, WORKSPACE_LIMITS, type CanvasJob, type WorkspaceLease, type WorkspaceReceipt } from "../core/conductor-contracts";
import { CONDUCTOR_ENVIRONMENTS } from "./conductor-environments";
import type { ConductorCommand, ConductorPresentation } from "./conductor-state";
import { ConductorAuthorizationError, ConductorRequestTimeoutError, ConductorTransport, type ConductorCredentials } from "./conductor-transport";

interface ContextResponse {
  contractVersion: string; enabled: boolean; supports?: string[]; destination: { project: string; deliverable: string };
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
  let supportScope: { token: ConductorCredentials; fileKey: string; epoch: number; values: string[] } | undefined;
  const supported = (value: string) => Boolean(active && supportScope && supportScope.token === credentials && supportScope.fileKey === figma.fileKey && supportScope.epoch === epoch && Date.parse(supportScope.token.expiresAt) > Date.now() && supportScope.values.includes(value));
  const supportsDesignChanges = () => supported("design_change") && supported("resolve_pending_send");
  let submitting: object | undefined;
  let submissionSelection: { selection: ReturnType<typeof readConductorSelection>; context: { componentId: string; componentName: string; connectionVersion: number; frames: DesignSubmission["frames"]; workflow: { version: number; transitions: { id: string; label: string }[] } } } | undefined;
  const draftKey = (token: ConductorCredentials, fileKey: string) => `conductor-draft-v1:${token.origin}:${token.ownerUserId}:${fileKey}`;
  const newRequestId = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => { const random = Math.floor(Math.random() * 16); return (char === "x" ? random : (random & 3) | 8).toString(16); });
  let presentation: ConductorPresentation = { state: "offline", message: "Connect to Conductor to prepare a workspace.", environments, jobs: [] };
  let busy: ConductorPresentation["busy"];
  let busyOwner: object | undefined;
  const present = (state: ConductorPresentation["state"], message: string, rest: Partial<ConductorPresentation> = {}) => {
    presentation = { state, message, environments, jobs: state === "connected" ? presentation.jobs : [], ...(state === "connected" && presentation.destination ? { destination: presentation.destination } : {}), supportsDesignChanges: state === "connected" && supportsDesignChanges(), ...rest };
    deps.post({ ...presentation, ...(busy ? { busy } : {}) });
  };
  const stop = () => { existing.reset(); changes.reset(); pending.reset(); supportScope = undefined; busy = undefined; busyOwner = undefined; submissionSelection = undefined; submitting = undefined; active = false; epoch++; if (timer !== undefined) clearTimeout(timer); timer = undefined; transport.stop(); };
  const requireCredentials = () => {
    if (!active || !credentials || Date.parse(credentials.expiresAt) <= Date.now()) throw new Error("Connect to Conductor again; your connection expired or is offline");
    return credentials;
  };
  const request = (path: string, body?: unknown) => { const token = requireCredentials(); return transport.request(token.origin, path, { token: token.token, ...(body === undefined ? {} : { body }) }); };
  const pending = createPendingSendController({ credentials: requireCredentials, current: () => active, session: () => epoch,
    supported: () => supported("resolve_pending_send"), request,
    present: (message, recovery, terminal) => {
      if (terminal) {
        existing.reset(); changes.reset(); submissionSelection = undefined;
        if (terminal.redacted) { presentation = { ...presentation, jobs: [] }; delete presentation.destination; }
      }
      present("connected", message, recovery ? { recovery } : terminal?.metadata ? { destination: terminal.metadata.destination, existingResult: terminal.metadata.resultPath } : terminal?.redacted ? { redacted: true } : {});
    },
  });
  const changes = createDesignChangeController({ request, current: () => active, newId: newRequestId, pending,
    present: (message, change, result) => present("connected", message, { ...(change ? { change } : {}), ...(result ? { existingResult: result } : {}) }),
  });
  const existing = createExistingFrameController({
    credentials: requireCredentials, pending,
    request,
    present: (message, state, result) => present("connected", message, { ...(state ? { existing: state } : {}), ...(result ? { existingResult: result } : {}) }),
    current: () => active && Boolean(credentials), newId: newRequestId,
  });
  const refresh = async () => {
    const token = requireCredentials(); const generation = epoch;
    supportScope = undefined;
    if (!figma.fileKey) { present("unavailable", "This file has no stable Figma key. Open a linked file to prepare workspaces."); return; }
    const fileKey = figma.fileKey;
    const current = () => active && generation === epoch && credentials === token && figma.fileKey === fileKey;
    const context = await transport.request(token.origin, `/api/figma-plugin/v1/context?fileKey=${encodeURIComponent(fileKey)}`, { token: token.token }) as ContextResponse;
    if (!current()) return;
    assertContractVersion(context.contractVersion);
    if (!context.enabled) { present("unavailable", "Design workspaces are not enabled for your organization. Offline audits remain available."); return; }
    if (!Array.isArray(context.jobs) || context.jobs.length > 100 || !context.destination || typeof context.destination.project !== "string" || typeof context.destination.deliverable !== "string") throw new Error("Invalid Conductor workspace response");
    supportScope = { token, fileKey, epoch: generation, values: Array.isArray(context.supports) && context.supports.every(value => typeof value === "string") ? context.supports : [] };
    if (await pending.blocked()) return;
    if (!current()) return;
    let message = "Connected. Keep this file and the plugin open while preparing workspaces.";
    for (const key of [draftKey(token, fileKey), existingPendingKey(token, fileKey)]) {
      const requestId: unknown = await figma.clientStorage.getAsync(`${key}:receipt`);
      if (!active || generation !== epoch) return;
      if (typeof requestId === "string" && /^[a-f0-9-]{36}$/i.test(requestId)) {
        try {
          const status = parseSubmissionResult(await transport.request(token.origin, `/api/figma-plugin/v1/submissions/${encodeURIComponent(requestId)}`, { token: token.token }));
          if (!current()) return;
          const terminal = await figma.clientStorage.getAsync(`${key}:terminal`) as { requestId?: string; fileKey?: string; outcome?: string; receipt?: unknown; intent?: string } | undefined;
          if (!current()) return;
          const change = terminal?.requestId === requestId && terminal.fileKey === fileKey && terminal.outcome === "committed" && terminal.receipt != null && terminal.intent === "design_change";
          message = change ? designChangeStatusMessage(status) : submissionStatusMessage(status);
        } catch (error) {
          if (!current()) return;
          if (error instanceof ConductorAuthorizationError) throw error;
          message = "Connected. The saved submission receipt is unavailable. Refresh to check again.";
        }
      }
    }
    if (current()) present("connected", message, { destination: context.destination, jobs: context.jobs });
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
      const op = {};
      let operationEpoch = epoch;
      if (busy && command.type !== "conductor-offline" && command.type !== "conductor-disconnect") return;
      const activities: Partial<Record<ConductorCommand["type"], NonNullable<ConductorPresentation["busy"]>>> = {
        "conductor-start-change": "inspecting", "conductor-review-change": "inspecting", "conductor-confirm-change": "submitting", "conductor-check-pending": "refreshing", "conductor-resolve-pending": "submitting", "conductor-start-existing-change": "choosing", "conductor-start-existing": "choosing", "conductor-existing-destination": "choosing", "conductor-review-existing": "inspecting", "conductor-confirm-existing": "submitting", "conductor-connect": "connecting", "conductor-refresh": "refreshing", "conductor-inspect-selection": "inspecting", "conductor-submit": "submitting", "conductor-apply": "preparing",
      };
      busy = activities[command.type];
      busyOwner = busy ? op : undefined;
      if (busy) deps.post({ ...presentation, busy, hasError: false });
      try {
        if (command.type === "conductor-check-pending") { await pending.check(); return; }
        if (command.type === "conductor-request-resolution") { await pending.requestResolution(); return; }
        if (command.type === "conductor-resolve-pending") { await pending.resolve(); return; }
        if (command.type === "conductor-open-existing-result") {
          const token = requireCredentials();
          if (!presentation.existingResult) throw new Error("Send a frame before opening its destination.");
          figma.openExternal(`${token.origin}${presentation.existingResult}`); return;
        }
        if (command.type === "conductor-cancel-send") { changes.reset(); existing.reset(); submissionSelection = undefined; present("connected", "Design submission cancelled. Use Design Notes in Conductor when nothing changed."); return; }
        if (["conductor-start-change", "conductor-review-change", "conductor-edit-change", "conductor-confirm-change", "conductor-start-existing-change"].includes(command.type)) {
          requireCredentials();
          if (!supportsDesignChanges()) throw new Error("Reconnect to Conductor with design-change and pending-send recovery support.");
          if (command.type === "conductor-start-change") {
            const review = await pending.review("bound", "design_change");
            if (!review) return;
            let unbound = false;
            try { readExistingFrame(); unbound = true; } catch { /* Bound selections are validated by the change controller. */ }
            if (unbound) { await existing.handle({ type: "conductor-start-existing-change" }); return; }
          }
          if (command.type === "conductor-start-existing-change") { await existing.handle(command); return; }
          await changes.handle(command as import("./conductor-change-controller").DesignChangeCommand); return;
        }
        if (["conductor-start-existing", "conductor-existing-destination", "conductor-review-existing", "conductor-edit-existing", "conductor-confirm-existing", "conductor-open-existing-result"].includes(command.type)) {
          const generation = epoch;
          try { await existing.handle(command as import("./conductor-existing-state").ExistingFrameCommand); }
          catch (error) { if (active && credentials && generation === epoch) throw error; }
          return;
        }
        if (command.type === "conductor-offline") { stop(); return; }
        if (command.type === "conductor-open") {
          stop(); operationEpoch = epoch; credentials = undefined; active = true; transport.open(); const generation = epoch;
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
          stop(); operationEpoch = epoch; active = true; transport.open(); const generation = epoch;
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
          const retry = await pending.review("bound");
          if (!retry || !active || generation !== epoch) return;
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
          if (context.frames.length !== selection.frames.length || context.frames.some(frame => !selection.frames.some(source => source.id === frame.nodeId && source.binding.variantId === frame.variantId))) throw new Error("Selection no longer matches its Conductor variants");
          if (retry.payload && (retry.payload.componentId !== context.componentId || retry.payload.connectionVersion !== context.connectionVersion || JSON.stringify(retry.payload.frames) !== JSON.stringify(context.frames.map(({ nodeId, variantId, expectedVariantVersion }) => ({ nodeId, variantId, expectedVariantVersion }))))) throw new Error("The original destination or variant version changed. Check the saved receipt or resolve the pending send.");
          submissionSelection = { selection, context };
          const saved: unknown = await figma.clientStorage.getAsync(draftKey(token, selection.fileKey));
          if (!active || generation !== epoch) return;
          let message = "";
          if (saved && typeof saved === "object" && "payload" in saved) { try { message = parseDesignSubmission(saved.payload).message; } catch { /* Invalid drafts cannot establish a destination. */ } }
          const annotationIds = retry.payload?.annotations.map(note => selection.annotations.find(source => source.nodeId === note.nodeId && source.text === note.text)?.id);
          if (annotationIds?.some(id => !id)) throw new Error("The original checked annotations changed. Check the saved receipt or resolve the pending send.");
          present("connected", "Review the destination and choose which annotations to submit.", { submission: { componentName: context.componentName, frames: selection.frames.map(({ id, name }) => ({ id, name })), message, annotations: selection.annotations.map(({ id, text }) => ({ id, text })), transitions: context.workflow.transitions, ...(retry.payload ? { retry: { message: retry.payload.message, annotationIds: annotationIds as string[], transitionId: retry.payload.transition?.id ?? "" } } : {}) } });
          return;
        }
        if (command.type === "conductor-submit") {
          if (submitting) return;
          const token = requireCredentials(); const generation = epoch;
          const live = () => active && generation === epoch && credentials === token;
          const owner = {}; submitting = owner;
          try {
          if (!await pending.review("bound") || !live()) return;
          const selected = submissionSelection;
          if (!selected) throw new Error("Select and review the destination again before submitting");
          const current = readConductorSelection();
          if (JSON.stringify(current) !== JSON.stringify(selected.selection)) throw new Error("Your selected design changed; review its destination again");
          const query = `fileKey=${encodeURIComponent(current.fileKey)}&${current.frames.map(frame => `nodeId=${encodeURIComponent(frame.id)}`).join("&")}`;
          const latest = await request(`/api/figma-plugin/v1/submissions/context?${query}`);
          if (!live()) return;
          if (JSON.stringify(latest) !== JSON.stringify(selected.context)) throw new Error("The destination or variant version changed. Review the selection again.");
          if (JSON.stringify(readConductorSelection()) !== JSON.stringify(current)) throw new Error("Your selected design changed; review its destination again");
          const annotations = command.annotationIds.map((id) => { const note = current.annotations.find((note) => note.id === id); if (!note) throw new Error("Selected annotations changed; review them again"); return { nodeId: note.nodeId, text: note.text }; });
          const transition = command.transitionId ? selected.context.workflow.transitions.find((entry) => entry.id === command.transitionId) : undefined;
          if (command.transitionId && !transition) throw new Error("Choose a permitted workflow action");
          const payload = parseDesignSubmission({ submissionId: newRequestId(), connectionVersion: selected.context.connectionVersion, componentId: selected.context.componentId, fileKey: current.fileKey,
            frames: selected.context.frames.map(({ nodeId, variantId, expectedVariantVersion }) => ({ nodeId, variantId, expectedVariantVersion })), message: command.message, annotations,
            ...(transition ? { transition: { id: transition.id, expectedWorkflowVersion: selected.context.workflow.version } } : {}) });
          const binding = current.frames[0]!.binding;
          const metadata: PendingSendMetadata | undefined = presentation.destination ? { destination: { ...presentation.destination, component: selected.context.componentName }, resultPath: `/projects/${encodeURIComponent(binding.projectId)}/deliverables/${encodeURIComponent(binding.deliverableId)}/features/${encodeURIComponent(binding.componentId)}?tab=design` } : undefined;
          const result = await pending.send(payload, "bound", metadata);
          if (!live() || !result) return;
            submissionSelection = undefined;
          } catch (error) { if (live()) throw error; }
          finally { if (submitting === owner) submitting = undefined; }
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
        if (error instanceof ConductorAuthorizationError && operationEpoch === epoch) supportScope = undefined;
        if (active && operationEpoch === epoch) {
          const message = error instanceof Error ? error.message : "Conductor is unavailable. Your design is retained; try again.";
          const recoverable = credentials && Date.parse(credentials.expiresAt) > Date.now() && !(error instanceof ConductorAuthorizationError);
          present(recoverable ? "connected" : "error", message, { ...(recoverable ? { jobs: presentation.jobs, ...(presentation.destination ? { destination: presentation.destination } : {}), ...(presentation.submission ? { submission: presentation.submission } : {}), ...(presentation.existing ? { existing: presentation.existing } : {}), ...(presentation.existingResult ? { existingResult: presentation.existingResult } : {}), ...(presentation.recovery ? { recovery: presentation.recovery } : {}), ...(presentation.change ? { change: presentation.change } : {}) } : {}), hasError: true });
        }
      } finally { if (busyOwner === op || busyOwner === undefined) { busy = undefined; busyOwner = undefined; deps.post(presentation); } }
    },
  };
}
