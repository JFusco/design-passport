import { expect, vi } from "vitest";
import type { CertificationSummary, ChangeOperation, ChangePlan } from "../src/core/contracts";

export const legacyCertificate: CertificationSummary = {
  schemaVersion: 2, grade: "B", score: 85, rulesetVersion: "1.0.0-beta.4", catalogVersion: "1.17.0",
  certifiedAt: "2026-09-30T12:00:00.000Z", snapshotHash: "legacy-report", knowledgeSnapshotHash: "legacy-knowledge",
  pluginVersion: "0.4.0", buildSha: "legacy-build", channel: "production",
};

export const retiredOperation: ChangeOperation = { kind: "set-certification", nodeId: "root:desktop", value: legacyCertificate };
export const layoutOperation: ChangeOperation = { kind: "apply-inferred-auto-layout", nodeId: "root:desktop", value: { tolerance: 0.5 } };
export function retirementPlan(operations: ChangeOperation[], id = "legacy-plan", risk: ChangePlan["risk"] = "low"): ChangePlan {
  return { id, findingIds: ["legacy-finding"], risk, operations, expectedPostconditions: ["Legacy metadata"], rollbackBoundary: "operation" };
}

/** Reachable document surfaces must remain untouched, including validation clones. */
export function documentActivitySpies() {
  const writes = {
    clone: vi.fn(), appendChild: vi.fn(), remove: vi.fn(), saveVersionHistoryAsync: vi.fn(), commitUndo: vi.fn(), triggerUndo: vi.fn(),
    setPluginData: vi.fn(), setSharedPluginData: vi.fn(), setRelaunchData: vi.fn(), annotations: vi.fn(), name: vi.fn(),
  };
  const live = {
    id: "root:desktop", type: "FRAME", removed: false, children: [], inferredAutoLayout: { layoutMode: "HORIZONTAL" },
    clone: writes.clone, remove: writes.remove, setSharedPluginData: writes.setSharedPluginData, setRelaunchData: writes.setRelaunchData,
    get annotations() { return [{ label: "Legacy note" }]; }, set annotations(value) { writes.annotations(value); },
    get name() { return "Original"; }, set name(value) { writes.name(value); },
  };
  writes.clone.mockReturnValue({ ...live, remove: writes.remove });
  const figma = {
    getNodeByIdAsync: vi.fn(async () => live), currentPage: { appendChild: writes.appendChild },
    root: { getPluginData: vi.fn(() => "prior marker"), setPluginData: writes.setPluginData },
    commitUndo: writes.commitUndo, triggerUndo: writes.triggerUndo, saveVersionHistoryAsync: writes.saveVersionHistoryAsync,
  };
  return { figma, writes, assertUntouched: () => { for (const [name, spy] of Object.entries(writes)) expect(spy, name).not.toHaveBeenCalled(); } };
}
