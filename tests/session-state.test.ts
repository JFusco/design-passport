import { describe, expect, it } from "vitest";
import { CommandGate, KnowledgeSessionState, MutationChangeGuard } from "../src/plugin/session-state";

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

  it("ignores expected local mutation echoes but flags unrelated, remote, and expired changes", () => {
    const guard = new MutationChangeGuard();
    guard.arm(["root", "frame", "child"], 1_000, 5_000);
    expect(guard.hasUnexpectedChange([{ id: "child", origin: "LOCAL" }, { id: "frame", origin: "LOCAL" }], 2_000)).toBe(false);
    expect(guard.hasUnexpectedChange([{ id: "other", origin: "LOCAL" }], 2_000)).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "child", origin: "REMOTE" }], 2_000)).toBe(true);
    expect(guard.hasUnexpectedChange([{ id: "child", origin: "LOCAL" }], 6_001)).toBe(true);
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
});
