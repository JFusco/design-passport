import { parseDesignSubmission, parseSubmissionResolution, parseSubmissionResult, type DesignSubmission, type SubmissionResult } from "../core/conductor-contracts";
import { ConductorSubmissionRefusedError, type ConductorCredentials } from "./conductor-transport";
export interface PendingSendPresentation { summary: string; canResolve: boolean; confirming?: boolean; }
interface Pending { key: string; payload: DesignSubmission; }
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
  present: (message: string, pending?: PendingSendPresentation) => void;
}) {
  let pending: Pending | undefined;
  let confirmation: { requestId: string; session: number } | undefined;
  let fresh: { requestId: string; session: number } | undefined;
  const capture = () => {
    const token = deps.credentials(), session = deps.session(), fileKey = figma.fileKey;
    if (!fileKey) throw new Error("Open a saved Figma file to check pending sends.");
    return () => {
      if (!deps.current() || deps.session() !== session || deps.credentials() !== token || figma.fileKey !== fileKey) throw new Error("Conductor session changed; reconnect to check the pending send.");
    };
  };
  const shown = (confirming = false): PendingSendPresentation => ({ summary: pending!.payload.message || "Previous design submission", canResolve: deps.supported(), ...(confirming ? { confirming: true } : {}) });
  const read = async (key: string) => {
    const value: unknown = await figma.clientStorage.getAsync(key);
    if (!value) return undefined;
    return parseDesignSubmission(typeof value === "object" && "payload" in value ? value.payload : value);
  };
  const clear = async (entry: Pending, check: () => void) => serial(async () => {
    check(); const stored = await read(entry.key); check();
    if (stored?.submissionId !== entry.payload.submissionId) throw new Error("Pending send identity changed. Refresh its status.");
    await figma.clientStorage.deleteAsync(entry.key); check();
    for (const suffix of [":dispatch", ":recovery"]) { await figma.clientStorage.deleteAsync(entry.key + suffix); check(); }
    pending = undefined; fresh = undefined; confirmation = undefined;
  });
  const acknowledge = async (entry: Pending, outcome: "committed" | "cancelled" | "refused", receipt: SubmissionResult | null, check: () => void) => {
    await serial(async () => {
      check(); const stored = await read(entry.key); check();
      if (stored?.submissionId !== entry.payload.submissionId) throw new Error("Pending send identity changed. Refresh its status.");
      await figma.clientStorage.setAsync(`${entry.key}:terminal`, { requestId: entry.payload.submissionId, fileKey: entry.payload.fileKey, outcome, receipt, ...(entry.payload.intent ? { intent: entry.payload.intent } : {}) }); check();
      if (outcome === "committed" && receipt) { await figma.clientStorage.setAsync(`${entry.key}:receipt`, entry.payload.submissionId); check(); }
    });
    await clear(entry, check);
  };
  const resolve = async () => {
    const check = capture(), entry = pending;
    if (!entry || !deps.supported()) throw new Error("Reconnect to a Conductor server supporting pending-send recovery. Your pending request is retained.");
    // Persist the operation before transport. Restart must never reinterpret this as a design retry.
    await serial(async () => { check(); await figma.clientStorage.setAsync(`${entry.key}:recovery`, {
      requestId: entry.payload.submissionId, fileKey: entry.payload.fileKey, operation: "resolve",
    }); check(); });
    const result = parseSubmissionResolution(await deps.request(`/api/figma-plugin/v1/submissions/${encodeURIComponent(entry.payload.submissionId)}/resolve`, { fileKey: entry.payload.fileKey })); check();
    if (result.requestId !== entry.payload.submissionId || result.fileKey !== entry.payload.fileKey) throw new Error("Conductor returned a different pending-send identity.");
    await acknowledge(entry, result.outcome, result.outcome === "committed" ? result.receipt : null, check);
    deps.present(result.outcome === "cancelled" ? "The pending request was safely cancelled. Review your design before starting a new send."
      : result.receipt ? "Conductor recovered the saved design receipt. The pending request is resolved."
      : "Conductor confirmed your earlier send was saved. Receipt details are unavailable with your current project access.");
  };
  const load = async () => {
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
      pending = { key, payload };
      const terminal = await figma.clientStorage.getAsync(`${key}:terminal`) as { requestId?: string; fileKey?: string; outcome?: string } | undefined; check();
      if (terminal?.requestId === payload.submissionId && terminal.fileKey === fileKey && ["committed", "cancelled", "refused"].includes(terminal.outcome ?? "")) {
        await clear(pending, check); continue;
      }
      return pending;
    }
    pending = undefined;
    return undefined;
  };
  return {
    reset() { pending = undefined; fresh = undefined; confirmation = undefined; },
    async blocked() {
      if (!await load()) return false;
      deps.present("A previous send needs acknowledgement. Check its saved receipt or resolve the pending request before sending another design. No frame selection is needed.", shown());
      return true;
    },
    async check() {
      if (!await load()) { deps.present("No pending sends remain. You can review and send a design."); return; }
      const check = capture(), entry = pending!;
      try {
        const receipt = parseSubmissionResult(await deps.request(`/api/figma-plugin/v1/submissions/${encodeURIComponent(entry.payload.submissionId)}`)); check();
        await acknowledge(entry, "committed", receipt, check);
        deps.present("Conductor confirmed your design was saved. Its receipt is retained.");
      } catch (error) {
        check(); deps.present(`${error instanceof Error ? error.message : "Receipt lookup failed."} The pending send is retained. Reconnect or restore project access to check again. A timeout or missing receipt does not cancel a send.`, shown());
      }
    },
    async requestResolution() {
      if (await load()) { confirmation = { requestId: pending!.payload.submissionId, session: deps.session() }; deps.present("Resolve this pending send? Conductor will recover its saved receipt or safely cancel this request. This cannot undo a design that was already saved.", shown(true)); }
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
    async send(payload: DesignSubmission, kind: "bound" | "existing"): Promise<SubmissionResult | undefined> {
      if (await load()) { deps.present("A previous send still needs acknowledgement.", shown()); return; }
      const check = capture(), token = deps.credentials();
      const entry: Pending = { key: kind === "bound" ? boundPendingKey(token, payload.fileKey) : existingPendingKey(token, payload.fileKey), payload };
      await serial(async () => {
        check(); await figma.clientStorage.setAsync(entry.key, kind === "bound" ? { payload } : payload); check();
        pending = entry; fresh = { requestId: payload.submissionId, session: deps.session() };
        await figma.clientStorage.setAsync(`${entry.key}:dispatch`, { requestId: payload.submissionId, fileKey: payload.fileKey, attemptsStarted: 1 }); check();
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
          if (!recovery && fresh?.requestId === payload.submissionId && fresh.session === deps.session() && attempt?.requestId === payload.submissionId && attempt.fileKey === payload.fileKey && attempt.attemptsStarted === 1) {
            await acknowledge(entry, "refused", null, check);
            throw new ConductorSubmissionRefusedError("Conductor refused this first send. Review the destination, width and design details before starting a new request.");
          }
        }
        deps.present(`${error instanceof Error ? error.message : "Submission acknowledgement unavailable."} Check the saved receipt before starting a new send.${deps.supported() ? "" : " Upgrade Conductor to resolve an uncertain request safely."}`, shown());
        return;
      }
    },
  };
}
