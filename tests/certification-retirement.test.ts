import { afterEach, describe, expect, it, vi } from "vitest";
import { applyChangePlan } from "../src/figma/mutations";
import { validateContract } from "../src/core/schema";
import { buildChangePlans } from "../src/core/planner";
import { syntheticFinding } from "./fixtures";
import { documentActivitySpies, layoutOperation, retiredOperation, retirementPlan } from "./retirement-fixtures";

afterEach(() => vi.unstubAllGlobals());

describe("retired certification operations", () => {
  it.each([false, true])("rejects before any document activity, including earlier layout preflight (mixed=%s)", async (mixed) => {
    const plan = retirementPlan(mixed ? [layoutOperation, retiredOperation] : [retiredOperation]);
    expect(validateContract("change-plan", plan)).toEqual({ valid: true, errors: [] });
    const activity = documentActivitySpies();
    vi.stubGlobal("figma", activity.figma);
    await expect(applyChangePlan(plan, { undoOnlyAcknowledged: false })).rejects.toThrow("Certification operations are retired");
    activity.assertUntouched();
    expect(activity.figma.getNodeByIdAsync).not.toHaveBeenCalled();
  });

  it("never plans a retired operation from a historical freshness finding", () => {
    expect(buildChangePlans([syntheticFinding({ ruleId: "pipeline.certification-freshness", status: "needs-review", fixability: "automatic" })])).toEqual([]);
  });

  it("keeps ordinary source annotation cleanup without changing legacy metadata", async () => {
    const annotations = [{ label: "[Design Passport] Grade B (85)." }, { label: "[Design Passport] Covered by legacy set" }, { label: "Designer note" }];
    const live = { id: "root:desktop", type: "FRAME", annotations: [...annotations], setSharedPluginData: vi.fn(), setRelaunchData: vi.fn() };
    const activity = documentActivitySpies();
    vi.stubGlobal("figma", { ...activity.figma, getNodeByIdAsync: vi.fn(async () => live) });
    const plan = retirementPlan([{ kind: "set-annotation", nodeId: live.id, value: { label: "AI source frame" } }]);
    await expect(applyChangePlan(plan, { undoOnlyAcknowledged: false })).resolves.toMatchObject({ appliedOperationCount: 1, checkpointCreated: false });
    expect(live.annotations).toEqual([...annotations, { label: "AI source frame" }]);
    await applyChangePlan(plan, { undoOnlyAcknowledged: false });
    expect(live.annotations).toEqual([...annotations, { label: "AI source frame" }]);
    expect(live.setSharedPluginData).not.toHaveBeenCalled();
    expect(live.setRelaunchData).not.toHaveBeenCalled();
    expect(activity.writes.commitUndo).toHaveBeenCalledTimes(4);
    expect(activity.writes.triggerUndo).not.toHaveBeenCalled();
    expect(activity.writes.saveVersionHistoryAsync).not.toHaveBeenCalled();
    expect(activity.writes.setPluginData).toHaveBeenLastCalledWith("cleanup-transaction-marker", "prior marker");
  });
});
