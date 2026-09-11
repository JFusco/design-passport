import type { ScanScope } from "../core/contracts";
import type { CapturedAuditTarget } from "../figma/adapter";
import type { AuditTargetSummary, PluginToUiMessage } from "./messages";
import { pluginMessageForError } from "./scan-errors";

export interface CapturedAuditAttempt<TResult> {
  begin: () => void;
  post: (message: PluginToUiMessage) => void;
  execute: (target: CapturedAuditTarget) => Promise<TResult>;
  commit: (target: CapturedAuditTarget) => void;
}

export interface ScanFailureState {
  knowledgeDirty: boolean;
  graph: {
    cancelled: boolean;
    complete: boolean;
    snapshotHash: string;
  } | undefined;
  reportKnowledgeSnapshotHash: string | undefined;
}

function captureTargetSnapshot(target: CapturedAuditTarget): CapturedAuditTarget {
  if (target.scope === "selection") return { scope: target.scope, nodeIds: [...target.nodeIds] };
  if (target.scope === "page") return { scope: target.scope, pageId: target.pageId };
  return { scope: target.scope };
}

export type AuditTargetIntent =
  | { kind: "capture"; scope: ScanScope }
  | { kind: "refresh" };

/** Resolves new audits from live Figma state and refreshes from the last committed target. */
export function resolveAuditTarget(
  intent: AuditTargetIntent,
  activeTarget: CapturedAuditTarget | undefined,
  captureLiveTarget: (scope: ScanScope) => CapturedAuditTarget,
): CapturedAuditTarget {
  if (intent.kind === "capture") return captureTargetSnapshot(captureLiveTarget(intent.scope));
  if (!activeTarget) throw new Error("Run an audit before refreshing its captured target");
  return captureTargetSnapshot(activeTarget);
}

export function auditTargetSummary(target: CapturedAuditTarget): AuditTargetSummary {
  return target.scope === "selection"
    ? { scope: target.scope, selectionCount: target.nodeIds.length }
    : { scope: target.scope };
}

/**
 * Starts an audit from one immutable target snapshot. The start event is posted
 * synchronously before any async preparation or analysis can observe a later
 * Figma selection, and the target becomes active only after the attempt succeeds.
 */
export async function runCapturedAuditAttempt<TResult>(
  requestedTarget: CapturedAuditTarget,
  attempt: CapturedAuditAttempt<TResult>,
): Promise<TResult> {
  const target = captureTargetSnapshot(requestedTarget);
  attempt.begin();
  attempt.post({ type: "audit-started", target: auditTargetSummary(target) });
  const result = await attempt.execute(target);
  attempt.commit(target);
  return result;
}

/** Returns UI failure messages in the order they must be applied. */
export function scanFailureMessages(error: unknown, state: ScanFailureState): PluginToUiMessage[] {
  const failure = pluginMessageForError(error);
  const reportUsesDifferentKnowledge = Boolean(
    state.graph
    && state.reportKnowledgeSnapshotHash !== undefined
    && state.reportKnowledgeSnapshotHash !== state.graph.snapshotHash,
  );
  const knowledgeIsUnusable = state.knowledgeDirty
    || state.graph?.cancelled === true
    || state.graph?.complete === false
    || reportUsesDifferentKnowledge;

  if (!knowledgeIsUnusable) return [failure];
  return [{ type: "knowledge-stale" }, failure];
}
