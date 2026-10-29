import { parseDesignSubmission, parseSubmissionResolution, parseSubmissionResult, type DesignSubmission, type SubmissionResult } from "../core/conductor-contracts";
import { designChangeStatusMessage, submissionStatusMessage } from "./conductor-submission-status";
import { ConductorSubmissionRefusedError, type ConductorCredentials } from "./conductor-transport";
export interface PendingSendMetadata { destination: { project: string; deliverable: string; component: string }; resultPath: string; }
export interface PendingSendPresentation {
  summary: string; canResolve: boolean; confirming?: boolean;
  destination?: PendingSendMetadata["destination"];
  retryCommand?: "conductor-inspect-selection" | "conductor-start-existing" | "conductor-start-change" | "conductor-start-existing-change";
}
export interface PendingSendTerminal { outcome: "committed" | "cancelled"; redacted: boolean; metadata?: PendingSendMetadata; }
export class LegacySendRefusedError extends ConductorSubmissionRefusedError {}
interface Pending { key: string; payload: DesignSubmission; resolving: boolean; metadata?: PendingSendMetadata; }
const identity = (payload: DesignSubmission) => JSON.stringify({
  intent: payload.intent, connectionVersion: payload.connectionVersion, componentId: payload.componentId, fileKey: payload.fileKey,
  frames: payload.frames.map(frame => ({ nodeId: frame.nodeId, variantId: payload.existingFrame ? "" : frame.variantId, expectedVariantVersion: frame.expectedVariantVersion, frameWidth: frame.frameWidth })),
  message: payload.message, annotations: payload.annotations, transition: payload.transition,
  existingFrame: payload.existingFrame ? { projectId: payload.existingFrame.projectId, deliverableId: payload.existingFrame.deliverableId, frameName: payload.existingFrame.frameName, variantName: payload.existingFrame.variantName, isDefaultAppearance: payload.existingFrame.isDefaultAppearance, frameWidth: payload.existingFrame.frameWidth, deviceTargetSlug: payload.existingFrame.deviceTargetSlug } : undefined,
});
function presentationMetadata(value: unknown): PendingSendMetadata | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as PendingSendMetadata;
  if (!data.destination || ![data.destination.project, data.destination.deliverable, data.destination.component].every(name => typeof name === "string" && name.length > 0 && name.length <= 200) ||
    typeof data.resultPath !== "string" || !/^\/projects\/[^/?#\\]+\/deliverables\/[^/?#\\]+\/features\/[^/?#\\]+\?tab=design$/.test(data.resultPath) || /[\u0000-\u0020]/.test(data.resultPath)) return undefined;
  return data;
}
// Serializes storage mutations even when a stopped controller has a late callback.
let storageQueue = Promise.resolve();
function serial<T>(action: () => Promise<T>): Promise<T> {
  const work = storageQueue.then(action, action);
  storageQueue = work.then(() => undefined, () => undefined);
  return work;
}
export const boundPendingKey = (token: ConductorCredentials, fileKey: string) => `conductor-draft-v1:${token.origin}:${token.ownerUserId}:${fileKey}`;
export const existingPendingKey = (token: ConductorCredentials, fileKey: string) => `conductor-existing-pending-v1:${token.origin}:${token.ownerUserId}:${fileKey}`;
export function createPendingSendController(deps: {
  credentials: () => ConductorCredentials;
  current: () => boolean;
  session: () => number;
  supported: () => boolean;
  request: (path: string, body?: unknown) => Promise<unknown>;
  present: (message: string, pending?: PendingSendPresentation, terminal?: PendingSendTerminal) => void;
}) {
  let pending: Pending | undefined;
  let resumed = false;
  let confirmation: { requestId: string; session: number } | undefined;
  let fresh: { requestId: string; session: number } | undefined;
  const capture = () => {
    const token = deps.credentials(), session = deps.session(), fileKey = figma.fileKey;
    if (!fileKey) throw new Error("Open a saved Figma file to check pending sends.");
    return () => {
      if (!deps.current() || deps.session() !== session || deps.credentials() !== token || figma.fileKey !== fileKey) throw new Error("Conductor session changed; reconnect to check the pending send.");
    };
  };
  const shown = (confirming = false): PendingSendPresentation => ({
    summary: pending!.payload.message || "Previous design submission", canResolve: deps.supported(),
    ...(pending!.metadata ? { destination: pending!.metadata.destination } : {}),
    ...(!pending!.resolving ? { retryCommand: pending!.payload.existingFrame
      ? pending!.payload.intent ? "conductor-start-existing-change" as const : "conductor-start-existing" as const
      : pending!.payload.intent ? "conductor-start-change" as const : "conductor-inspect-selection" as const } : {}),
    ...(confirming ? { confirming: true } : {}),
  });
  const read = async (key: string) => {
    const value: unknown = await figma.clientStorage.getAsync(key);
    if (!value) return undefined;
    return parseDesignSubmission(typeof value === "object" && "payload" in value ? value.payload : value);
  };
  const clear = async (entry: Pending, check: () => void) => serial(async () => {
    check(); const stored = await read(entry.key); check();
    if (stored?.submissionId !== entry.payload.submissionId) throw new Error("Pending send identity changed. Refresh its status.");
    await figma.clientStorage.deleteAsync(entry.key); check();
    for (const suffix of [":dispatch", ":recovery", ":presentation"]) {
      const sidecar = await figma.clientStorage.getAsync(entry.key + suffix) as { requestId?: string; fileKey?: string } | undefined; check();
      if (sidecar?.requestId === entry.payload.submissionId && sidecar.fileKey === entry.payload.fileKey) { await figma.clientStorage.deleteAsync(entry.key + suffix); check(); }
    }
    pending = undefined; fresh = undefined; confirmation = undefined;
  });
  const acknowledge = async (entry: Pending, outcome: "committed" | "cancelled" | "refused", receipt: SubmissionResult | null, check: () => void) => {
    if (receipt) receipt = parseSubmissionResult(receipt);
    await serial(async () => {
      check(); const stored = await read(entry.key); check();
      if (stored?.submissionId !== entry.payload.submissionId) throw new Error("Pending send identity changed. Refresh its status.");
      await figma.clientStorage.setAsync(`${entry.key}:terminal`, { requestId: entry.payload.submissionId, fileKey: entry.payload.fileKey, outcome, receipt, ...(entry.payload.intent ? { intent: entry.payload.intent } : {}), ...(entry.metadata ? { metadata: entry.metadata } : {}) }); check();
      if (outcome === "committed" && receipt) { await figma.clientStorage.setAsync(`${entry.key}:receipt`, entry.payload.submissionId); check(); }
    });
    await clear(entry, check);
    if (outcome === "refused") return;
    const metadata = outcome === "committed" && receipt ? entry.metadata : undefined;
    const message = outcome === "cancelled" ? "The pending send was cancelled. Nothing from this request was saved."
      : !receipt ? "The earlier send was saved, but its details are no longer accessible."
      : `${entry.payload.intent === "design_change" ? designChangeStatusMessage(receipt) : submissionStatusMessage(receipt)}${metadata ? ` ${metadata.destination.project} / ${metadata.destination.deliverable} / ${metadata.destination.component} → Design.` : ""}`;
    deps.present(message, undefined, { outcome, redacted: outcome === "committed" && !receipt, ...(metadata ? { metadata } : {}) });
  };
  const resolve = async () => {
    const check = capture(), entry = pending;
    if (!entry || !deps.supported()) throw new Error("Reconnect to a Conductor server supporting pending-send recovery. Your pending request is retained.");
    // Persist the operation before transport. Restart must never reinterpret this as a design retry.
    await serial(async () => {
      check(); const stored = await read(entry.key); check();
      if (stored?.submissionId !== entry.payload.submissionId) throw new Error("Pending send identity changed. Refresh its status.");
      await figma.clientStorage.setAsync(`${entry.key}:recovery`, { requestId: entry.payload.submissionId, fileKey: entry.payload.fileKey, operation: "resolve" }); check(); entry.resolving = true;
    });
    const result = parseSubmissionResolution(await deps.request(`/api/figma-plugin/v1/submissions/${encodeURIComponent(entry.payload.submissionId)}/resolve`, { fileKey: entry.payload.fileKey })); check();
    if (result.requestId !== entry.payload.submissionId || result.fileKey !== entry.payload.fileKey) throw new Error("Conductor returned a different pending-send identity.");
    await acknowledge(entry, result.outcome, result.outcome === "committed" ? result.receipt : null, check);
  };
  const load = async () => {
    resumed = false;
    const check = capture(), token = deps.credentials(), fileKey = figma.fileKey!;
    const legacyKey = `conductor-existing-pending-v1:${token.origin}:${token.ownerUserId}`;
    await serial(async () => {
      check(); const legacy = await read(legacyKey); check();
      if (legacy?.fileKey === fileKey) {
        const key = existingPendingKey(token, fileKey), stored = await read(key); check();
        if (stored && stored.submissionId !== legacy.submissionId) throw new Error("Two earlier sends need acknowledgement. Keep this file open and resolve the stored send first.");
        if (!stored) { await figma.clientStorage.setAsync(key, legacy); check(); }
        await figma.clientStorage.deleteAsync(legacyKey); check();
      }
    });
    for (const key of [boundPendingKey(token, fileKey), existingPendingKey(token, fileKey)]) {
      const payload = await read(key); check();
      if (!payload) continue;
      if (payload.fileKey !== fileKey) throw new Error("Pending send does not match this Figma file.");
      const recovery = await figma.clientStorage.getAsync(`${key}:recovery`); check();
      const display = await figma.clientStorage.getAsync(`${key}:presentation`) as { requestId?: string; fileKey?: string; metadata?: PendingSendMetadata } | undefined; check();
      const metadata = display?.requestId === payload.submissionId && display.fileKey === fileKey ? presentationMetadata(display.metadata) : undefined;
      pending = { key, payload, resolving: Boolean(recovery), ...(metadata ? { metadata } : {}) };
      const terminal = await figma.clientStorage.getAsync(`${key}:terminal`) as { requestId?: string; fileKey?: string; outcome?: string; receipt?: unknown; metadata?: PendingSendMetadata } | undefined; check();
      if (terminal?.requestId === payload.submissionId && terminal.fileKey === fileKey && (terminal.outcome === "committed" || terminal.outcome === "cancelled" || terminal.outcome === "refused")) {
        const metadata = presentationMetadata(terminal.metadata);
        if (metadata) pending.metadata = metadata;
        const receipt = terminal.outcome === "committed" && terminal.receipt !== null ? parseSubmissionResult(terminal.receipt) : null;
        await acknowledge(pending, terminal.outcome, receipt, check); resumed = true; continue;
      }
      return pending;
    }
    pending = undefined;
    return undefined;
  };
  return {
    reset() { pending = undefined; fresh = undefined; confirmation = undefined; },
    async blocked() {
      if (!await load()) return resumed;
      deps.present("A previous send needs acknowledgement. Check its saved receipt, review its original details to retry, or resolve the pending request before sending another design. Receipt checking and resolution need no frame selection.", shown()); return true;
    },
    async review(kind: "bound" | "existing", intent?: "design_change"): Promise<{ payload?: DesignSubmission } | undefined> {
      const entry = await load();
      if (!entry) return resumed ? undefined : {};
      if (!entry.resolving && Boolean(entry.payload.existingFrame) === (kind === "existing") && entry.payload.intent === intent) return { payload: entry.payload };
      deps.present("A previous send still needs acknowledgement. Review its original handoff or resolve it before starting another design.", shown()); return undefined;
    },
    async check() {
      if (!await load()) { if (!resumed) deps.present("No pending sends remain. You can review and send a design."); return; }
      const check = capture(), entry = pending!;
      try {
        const receipt = parseSubmissionResult(await deps.request(`/api/figma-plugin/v1/submissions/${encodeURIComponent(entry.payload.submissionId)}`)); check();
        await acknowledge(entry, "committed", receipt, check);
      } catch (error) {
        check(); deps.present(`${error instanceof Error ? error.message : "Receipt lookup failed."} The pending send is retained. Reconnect or restore project access to check again. A timeout or missing receipt does not cancel a send.`, shown());
      }
    },
    async requestResolution() {
      if (await load()) { confirmation = { requestId: pending!.payload.submissionId, session: deps.session() }; deps.present("If this send was already saved, Conductor will recover its result. Otherwise, Conductor will cancel this pending send so it cannot save later. This does not undo a saved design or workflow action.", shown(true)); }
    },
    async resolve() {
      if (!await load()) return;
      const check = capture();
      const sidecar = await figma.clientStorage.getAsync(`${pending!.key}:recovery`) as { requestId?: string; fileKey?: string; operation?: string } | undefined;
      check();
      if (!(sidecar?.requestId === pending!.payload.submissionId && sidecar.fileKey === pending!.payload.fileKey && sidecar.operation === "resolve") &&
        !(confirmation?.requestId === pending!.payload.submissionId && confirmation.session === deps.session())) throw new Error("Confirm pending-send resolution before continuing.");
      try { await resolve(); }
      catch (error) { check(); deps.present(`${error instanceof Error ? error.message : "Recovery unavailable."} The pending resolution is retained. Reconnect and try Resolve pending send again; the design will not be resent.`, shown()); }
    },
    async send(payload: DesignSubmission, kind: "bound" | "existing", metadata?: PendingSendMetadata): Promise<SubmissionResult | undefined> {
      const previous = await load();
      if (resumed) return;
      if (previous && (previous.resolving || identity(previous.payload) !== identity(payload))) { deps.present("A previous send still needs acknowledgement. Retry only its original reviewed details.", shown()); return; }
      const check = capture(), token = deps.credentials();
      const entry: Pending = previous ?? { key: kind === "bound" ? boundPendingKey(token, payload.fileKey) : existingPendingKey(token, payload.fileKey), payload, resolving: false, ...(metadata ? { metadata } : {}) };
      payload = entry.payload;
      await serial(async () => {
        check();
        if (!previous) { await figma.clientStorage.setAsync(entry.key, kind === "bound" ? { payload } : payload); check(); }
        else {
          const stored = await read(entry.key); check();
          const recovery = await figma.clientStorage.getAsync(`${entry.key}:recovery`); check();
          if (stored?.submissionId !== payload.submissionId || recovery) throw new Error("Pending send changed or is being resolved. Check its status before retrying.");
        }
        pending = entry; fresh = undefined;
        if (!previous && metadata) { await figma.clientStorage.setAsync(`${entry.key}:presentation`, { requestId: payload.submissionId, fileKey: payload.fileKey, metadata }); check(); }
        const attempt = await figma.clientStorage.getAsync(`${entry.key}:dispatch`) as { requestId?: string; fileKey?: string; attemptsStarted?: number } | undefined; check();
        const priorAttempts = attempt?.requestId === payload.submissionId && attempt.fileKey === payload.fileKey && Number.isSafeInteger(attempt.attemptsStarted) && attempt.attemptsStarted! >= 1 ? attempt.attemptsStarted! : 1;
        const attempts = previous ? priorAttempts : 0;
        await figma.clientStorage.setAsync(`${entry.key}:dispatch`, { requestId: payload.submissionId, fileKey: payload.fileKey, attemptsStarted: attempts + 1 }); check();
        if (!previous) fresh = { requestId: payload.submissionId, session: deps.session() };
      });
      try {
        const result = parseSubmissionResult(await deps.request("/api/figma-plugin/v1/submissions", payload)); check();
        if (JSON.stringify([...result.variantIds].sort()) !== JSON.stringify(payload.frames.map(frame => frame.variantId).sort())) throw new Error("Submission receipt does not match the selected design variants.");
        await acknowledge(entry, "committed", result, check);
        return result;
      } catch (error) {
        check();
        if (error instanceof ConductorSubmissionRefusedError) {
          if (deps.supported()) {
            try { await resolve(); } catch (resolutionError) { check(); deps.present(`${resolutionError instanceof Error ? resolutionError.message : "Recovery unavailable."} Pending resolution is retained; reconnect or restore access and try Resolve pending send again.`, shown()); }
            return;
          }
          const attempt = await figma.clientStorage.getAsync(`${entry.key}:dispatch`) as { requestId?: string; fileKey?: string; attemptsStarted?: number } | undefined; check();
          const recovery = await figma.clientStorage.getAsync(`${entry.key}:recovery`); check();
          if (!payload.intent && !recovery && fresh?.requestId === payload.submissionId && fresh.session === deps.session() && attempt?.requestId === payload.submissionId && attempt.fileKey === payload.fileKey && attempt.attemptsStarted === 1) {
            await acknowledge(entry, "refused", null, check);
            throw new LegacySendRefusedError("Conductor refused this first send. Review the destination, width and design details before starting a new request.");
          }
        }
        fresh = undefined;
        deps.present(`${error instanceof Error ? error.message : "Submission acknowledgement unavailable."} Check the saved receipt before starting a new send.${deps.supported() ? "" : " Upgrade Conductor to resolve an uncertain request safely."}`, shown()); return;
      }
    },
  };
}
