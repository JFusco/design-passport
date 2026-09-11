import { describe, expect, it, vi } from "vitest";
import type { CapturedAuditTarget } from "../src/figma/adapter";
import type { PluginToUiMessage } from "../src/plugin/messages";
import { resolveAuditTarget, runCapturedAuditAttempt, scanFailureMessages } from "../src/plugin/scan-lifecycle";
import { ScanCancelledError } from "../src/plugin/scan-errors";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("backend scan lifecycle", () => {
  it.each([
    {
      name: "selection",
      activeTarget: { scope: "selection", nodeIds: ["frame:captured"] } as const,
      liveTarget: { scope: "selection", nodeIds: ["frame:now-selected"] } as const,
    },
    {
      name: "page",
      activeTarget: { scope: "page", pageId: "page:captured" } as const,
      liveTarget: { scope: "page", pageId: "page:now-current" } as const,
    },
  ])("refreshes the captured $name target after live Figma state changes", ({ activeTarget, liveTarget }) => {
    const captureLiveTarget = vi.fn((): CapturedAuditTarget => liveTarget);

    expect(resolveAuditTarget({ kind: "refresh" }, activeTarget, captureLiveTarget)).toEqual(activeTarget);
    expect(captureLiveTarget).not.toHaveBeenCalled();
  });

  it("announces the captured target before async work starts and keeps that target authoritative", async () => {
    const events: PluginToUiMessage[] = [];
    const order: string[] = [];
    const work = deferred<void>();
    const requestedIds = ["frame:checkout", "component:button"];
    const requestedTarget: CapturedAuditTarget = { scope: "selection", nodeIds: requestedIds };
    let executedTarget: CapturedAuditTarget | undefined;
    let committedTarget: CapturedAuditTarget | undefined;

    const attempt = runCapturedAuditAttempt(requestedTarget, {
      begin: vi.fn(() => { order.push("begin"); }),
      post: (message) => {
        order.push(message.type);
        events.push(message);
      },
      execute: async (target) => {
        order.push("execute");
        executedTarget = target;
        await work.promise;
      },
      commit: (target) => { committedTarget = target; },
    });

    expect(events).toEqual([{
      type: "audit-started",
      target: { scope: "selection", selectionCount: 2 },
    }]);
    expect(order).toEqual(["begin", "audit-started", "execute"]);
    expect(executedTarget).toEqual({ scope: "selection", nodeIds: ["frame:checkout", "component:button"] });
    expect(committedTarget).toBeUndefined();

    requestedIds.splice(0, requestedIds.length, "frame:later-selection");
    work.resolve();
    await attempt;

    expect(committedTarget).toEqual({ scope: "selection", nodeIds: ["frame:checkout", "component:button"] });
  });

  it.each([
    {
      name: "the knowledge session is dirty",
      state: {
        knowledgeDirty: true,
        graph: { cancelled: false, complete: true, snapshotHash: "knowledge:new" },
        reportKnowledgeSnapshotHash: "knowledge:new",
      },
    },
    {
      name: "the interrupted graph is incomplete",
      state: {
        knowledgeDirty: false,
        graph: { cancelled: true, complete: false, snapshotHash: "knowledge:partial" },
        reportKnowledgeSnapshotHash: "knowledge:old",
      },
    },
  ])("posts stale knowledge before cancellation when $name", ({ state }) => {
    expect(scanFailureMessages(new ScanCancelledError(), state)).toEqual([
      { type: "knowledge-stale" },
      { type: "scan-cancelled" },
    ]);
  });

  it("posts stale knowledge before a generic rebuild error when the session is dirty", () => {
    expect(scanFailureMessages(new Error("Knowledge build failed"), {
      knowledgeDirty: true,
      graph: { cancelled: false, complete: true, snapshotHash: "knowledge:old" },
      reportKnowledgeSnapshotHash: "knowledge:old",
    })).toEqual([
      { type: "knowledge-stale" },
      { type: "error", message: "Knowledge build failed" },
    ]);
  });

  it("preserves the prior report after a clean target-validation failure", () => {
    expect(scanFailureMessages(new Error("Captured selection no longer exists"), {
      knowledgeDirty: false,
      graph: { cancelled: false, complete: true, snapshotHash: "knowledge:current" },
      reportKnowledgeSnapshotHash: "knowledge:current",
    })).toEqual([
      { type: "error", message: "Captured selection no longer exists" },
    ]);
  });

  it("does not replace the prior active target when a new audit attempt fails", async () => {
    const priorTarget: CapturedAuditTarget = { scope: "page", pageId: "page:checkout" };
    let activeTarget: CapturedAuditTarget = priorTarget;
    const failure = new Error("Captured selection no longer exists");

    const attempt = runCapturedAuditAttempt(
      { scope: "selection", nodeIds: ["frame:deleted"] },
      {
        begin: () => undefined,
        post: () => undefined,
        execute: async () => { throw failure; },
        commit: (target) => { activeTarget = target; },
      },
    );

    await expect(attempt).rejects.toBe(failure);
    expect(activeTarget).toBe(priorTarget);
  });
});
