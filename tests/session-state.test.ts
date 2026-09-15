import { describe, expect, it } from "vitest";
import { CommandGate, KnowledgeSessionState, MutationChangeGuard, requiresTransientMutationGuard } from "../src/plugin/session-state";

describe("plugin session safety", () => {
  it("accepts only a complete knowledge build with no intervening change", () => {
    const state = new KnowledgeSessionState();
    expect(state.dirty).toBe(true);
    const token = state.beginBuild();
    expect(state.completeBuild(token, true)).toBe(true);
    expect(state.dirty).toBe(false);

    const changed = state.beginBuild();
    state.markDirty();
    expect(state.completeBuild(changed, true)).toBe(false);
    expect(state.dirty).toBe(true);
  });

  it("rejects stale and concurrent build tokens", () => {
    const state = new KnowledgeSessionState();
    const token = state.beginBuild();
    expect(() => state.beginBuild()).toThrow("already running");
    state.abandonBuild(token);
    const next = state.beginBuild();
    expect(() => state.completeBuild(token, true)).toThrow("stale");
    state.abandonBuild(next);
  });

  it("serializes commands and makes release idempotent", () => {
    const gate = new CommandGate();
    const release = gate.enter("scan");
    expect(() => gate.enter("apply-all")).toThrow("scan is still running");
    release();
    release();
    expect(gate.active).toBe(false);
    gate.enter("apply-all")();
  });

  it("serializes captured-target refreshes with every other plugin command", () => {
    const gate = new CommandGate();
    const release = gate.enter("refresh-audit");

    expect(() => gate.enter("scan")).toThrow("refresh-audit is still running");

    release();
    expect(() => gate.enter("scan")()).not.toThrow();
  });

  it("never uses an expected node ID to discard a designer's visual edit", () => {
    const guard = new MutationChangeGuard();
    guard.arm(["root", "frame", "child"], 1_000, 5_000);
    expect(guard.hasUnexpectedChange([{ id: "child", origin: "LOCAL" }, { id: "frame", origin: "LOCAL" }], 2_000)).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "other", origin: "LOCAL" }], 2_000)).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "child", origin: "REMOTE" }], 2_000)).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "child", origin: "LOCAL" }], 6_001)).toBe(true);
  });

  it("requires live recapture of delayed same-node visual changes throughout a post-mutation scan", () => {
    const guard = new MutationChangeGuard();
    guard.arm(["frame"], 1_000);
    expect(guard.hasUnexpectedChange([{ id: "frame", origin: "LOCAL" }], 120_999)).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "frame", origin: "LOCAL" }], 121_001)).toBe(true);
  });

  it("does not confuse transient clone IDs with proof that every concurrent local edit is safe", () => {
    const guard = new MutationChangeGuard();
    guard.arm(["frame"], 1_000, 120_000, true);
    expect(guard.hasUnexpectedChange([{ id: "temporary-clone", origin: "LOCAL", type: "CREATE" }], 2_000)).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "frame", origin: "REMOTE" }], 2_000)).toBe(true);
    guard.clear();
    expect(guard.hasUnexpectedChange([{ id: "temporary-clone", origin: "LOCAL", type: "CREATE" }], 2_000)).toBe(true);
  });

  it("arms the transient-node guard for every structural plan, including a single-plan apply", () => {
    expect(requiresTransientMutationGuard("low")).toBe(false);
    expect(requiresTransientMutationGuard("guarded")).toBe(false);
    expect(requiresTransientMutationGuard("structural")).toBe(true);
  });

  it("does not treat delayed local plugin metadata as design drift", () => {
    const guard = new MutationChangeGuard();
    guard.arm(["frame"], 1_000, 5_000);
    expect(guard.hasUnexpectedChange([{
      id: "frame",
      origin: "LOCAL",
      type: "PROPERTY_CHANGE",
      properties: ["pluginData"],
    }], 60_000)).toBe(false);
    expect(guard.hasUnexpectedChange([{
      id: "frame",
      origin: "LOCAL",
      type: "PROPERTY_CHANGE",
      properties: ["pluginData", "fills"],
    }], 60_000)).toBe(true);
  });

  it("retains a bounded change journal until a complete stable capture", () => {
    const state = new KnowledgeSessionState();
    state.completeBuild(state.beginBuild(), true);
    state.markDirty(["first"]);
    state.markDirty(["first", "second"]);
    expect(state.changes).toEqual({ nodeIds: ["first", "second"] });
    const capture = state.beginBuild();
    state.markDirty(["third"], "structural-change");
    expect(state.completeBuild(capture, true)).toBe(false);
    expect(state.changes).toEqual({ nodeIds: ["first", "second", "third"], fullBuildReason: "structural-change" });
    state.completeBuild(state.beginBuild(), true);
    expect(state.changes).toEqual({ nodeIds: [] });
  });

  it("reconciles only exact annotation output and still invalidates real edits on that same node", () => {
    const guard = new MutationChangeGuard();
    let annotations = "certified annotation";
    guard.expectAnnotations("frame", annotations, () => annotations);
    const event = { id: "frame", origin: "LOCAL" as const, type: "PROPERTY_CHANGE", properties: ["annotations", "pluginData"] };
    expect(guard.hasUnexpectedChange([event])).toBe(false);
    expect(guard.hasUnexpectedChange([{ ...event, properties: ["annotations", "fills"] }])).toBe(true);
    expect(guard.hasUnexpectedChange([{ ...event, origin: "REMOTE" }])).toBe(true);
    annotations = "designer changed documentation";
    expect(guard.hasUnexpectedChange([event])).toBe(true);
  });
});
