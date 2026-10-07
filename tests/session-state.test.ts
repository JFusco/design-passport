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
    expect(guard.hasUnexpectedChange([{ id: "child", origin: "LOCAL" }, { id: "frame", origin: "LOCAL" }])).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "other", origin: "LOCAL" }])).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "child", origin: "REMOTE" }])).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "child", origin: "LOCAL" }])).toBe(true);
  });

  it("requires live recapture of delayed same-node visual changes throughout a post-mutation scan", () => {
    const guard = new MutationChangeGuard();
    expect(guard.hasUnexpectedChange([{ id: "frame", origin: "LOCAL" }])).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "frame", origin: "LOCAL" }])).toBe(true);
  });

  it("does not confuse transient clone IDs with proof that every concurrent local edit is safe", () => {
    const guard = new MutationChangeGuard();
    expect(guard.hasUnexpectedChange([{ id: "temporary-clone", origin: "LOCAL", type: "CREATE" }])).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "frame", origin: "REMOTE" }])).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "temporary-clone", origin: "LOCAL", type: "CREATE" }])).toBe(true);
  });

  it("requires structural recapture for every structural plan, including a single-plan apply", () => {
    expect(requiresTransientMutationGuard("low")).toBe(false);
    expect(requiresTransientMutationGuard("guarded")).toBe(false);
    expect(requiresTransientMutationGuard("structural")).toBe(true);
  });

  it("does not treat delayed local plugin metadata as design drift", () => {
    const guard = new MutationChangeGuard();
    expect(guard.hasUnexpectedChange([{
      id: "frame",
      origin: "LOCAL",
      type: "PROPERTY_CHANGE",
      properties: ["pluginData"],
    }])).toBe(false);
    expect(guard.hasUnexpectedChange([{
      id: "frame",
      origin: "LOCAL",
      type: "PROPERTY_CHANGE",
      properties: ["pluginData", "fills"],
    }])).toBe(true);
  });

  it("retains a bounded change journal until a complete stable capture", () => {
    const state = new KnowledgeSessionState();
    state.completeBuild(state.beginBuild(), true);
    state.markDirty(["first"]);
    state.markDirty(["first", "second"]);
    expect(state.changes).toEqual({ nodeIds: ["first", "second"], properties: { first: ["unknown"], second: ["unknown"] } });
    const capture = state.beginBuild();
    state.markDirty(["third"], "structural-change");
    expect(state.completeBuild(capture, true)).toBe(false);
    expect(state.changes).toEqual({ nodeIds: ["first", "second", "third"], properties: { first: ["unknown"], second: ["unknown"], third: ["unknown"] }, fullBuildReason: "structural-change" });
    state.completeBuild(state.beginBuild(), true);
    expect(state.changes).toEqual({ nodeIds: [], properties: {} });
  });


  it("invalidates annotation, remote metadata, mixed, and unknown changes", () => {
    const guard = new MutationChangeGuard();
    for (const change of [
      { origin: "LOCAL" as const, properties: ["annotations"] },
      { origin: "LOCAL" as const, properties: ["annotations", "pluginData"] },
      { origin: "REMOTE" as const, properties: ["pluginData"] },
      { origin: "LOCAL" as const, properties: ["unknown"] },
      { origin: "LOCAL" as const, properties: [] },
    ]) expect(guard.hasUnexpectedChange([{ id: "frame", type: "PROPERTY_CHANGE", ...change }])).toBe(true);
  });
});
