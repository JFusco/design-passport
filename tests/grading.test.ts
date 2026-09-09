import { describe, expect, it } from "vitest";
import { AXES } from "../src/core/contracts";
import { axisScores, capGradeForTokenCoverage, gradeFromAxes, letterForScore, worstAxisScores } from "../src/core/grading";
import { syntheticFinding } from "./fixtures";

describe("deterministic grading", () => {
  it.each([
    [100, "A"], [90, "A"], [89.99, "B"], [80, "B"], [79.99, "C"], [70, "C"], [69.99, "D"], [50, "D"], [49.99, "F"],
  ] as const)("maps %s to %s", (score, letter) => expect(letterForScore(score)).toBe(letter));

  it("treats needs-review and waived as deductions", () => {
    const scores = axisScores([
      syntheticFinding({ id: "pass", ruleId: "rule.pass", severity: 4, status: "pass" }),
      syntheticFinding({ id: "review", ruleId: "rule.review", severity: 2, status: "needs-review" }),
      syntheticFinding({ id: "waived", ruleId: "rule.waived", severity: 2, status: "waived" }),
      syntheticFinding({ id: "na", ruleId: "rule.na", severity: 4, status: "not-applicable" }),
    ]);
    expect(scores[0]).toMatchObject({ passedWeight: 4, applicableWeight: 8, score: 50 });
  });

  it("scores repeated node findings once per rule and root", () => {
    const scores = axisScores([
      syntheticFinding({ id: "one", ruleId: "rule.same", severity: 2, status: "pass" }),
      syntheticFinding({ id: "two", ruleId: "rule.same", severity: 2, status: "fail", nodeId: "node:2" }),
    ]);
    expect(scores[0]).toMatchObject({ passedWeight: 0, applicableWeight: 2, score: 0 });
  });

  it("shows progress below the 80% B target and 95% A threshold", () => {
    const progress = axisScores([
      syntheticFinding({ id: "started", ruleId: "token.application.started", axis: "token-application", severity: 1, status: "pass" }),
      syntheticFinding({ id: "substantial", ruleId: "token.application.substantial", axis: "token-application", severity: 1, status: "fail" }),
      syntheticFinding({ id: "strong", ruleId: "token.application.strong", axis: "token-application", severity: 2, status: "fail" }),
      syntheticFinding({ id: "min", ruleId: "token.application.minimum", axis: "token-application", severity: 4, status: "fail" }),
      syntheticFinding({ id: "excellent", ruleId: "token.application.excellent", axis: "token-application", severity: 1, status: "fail" }),
    ]).find((axis) => axis.axis === "token-application");
    const b = axisScores([
      syntheticFinding({ id: "started", ruleId: "token.application.started", axis: "token-application", severity: 1, status: "pass" }),
      syntheticFinding({ id: "substantial", ruleId: "token.application.substantial", axis: "token-application", severity: 1, status: "pass" }),
      syntheticFinding({ id: "strong", ruleId: "token.application.strong", axis: "token-application", severity: 2, status: "pass" }),
      syntheticFinding({ id: "min", ruleId: "token.application.minimum", axis: "token-application", severity: 4, status: "pass" }),
      syntheticFinding({ id: "excellent", ruleId: "token.application.excellent", axis: "token-application", severity: 1, status: "fail" }),
    ]).find((axis) => axis.axis === "token-application");
    const a = axisScores([
      syntheticFinding({ id: "started", ruleId: "token.application.started", axis: "token-application", severity: 1, status: "pass" }),
      syntheticFinding({ id: "substantial", ruleId: "token.application.substantial", axis: "token-application", severity: 1, status: "pass" }),
      syntheticFinding({ id: "strong", ruleId: "token.application.strong", axis: "token-application", severity: 2, status: "pass" }),
      syntheticFinding({ id: "min", ruleId: "token.application.minimum", axis: "token-application", severity: 4, status: "pass" }),
      syntheticFinding({ id: "excellent", ruleId: "token.application.excellent", axis: "token-application", severity: 1, status: "pass" }),
    ]).find((axis) => axis.axis === "token-application");
    expect(progress?.score).toBe(11.1);
    expect(b?.score).toBe(88.9);
    expect(a?.score).toBe(100);
  });

  it("lets weighted scoring decide B readiness while preserving the A token cap", () => {
    const grade = { score: 96, letter: "A" as const };
    expect(capGradeForTokenCoverage({ score: 84, letter: "B" }, 44)).toEqual({ score: 84, letter: "B" });
    expect(capGradeForTokenCoverage(grade, 94.9)).toMatchObject({ score: 89.9, letter: "B" });
    expect(capGradeForTokenCoverage(grade, 95)).toEqual(grade);
  });

  it("keeps node-linked punch-list details from double-deducting aggregate rules", () => {
    const score = axisScores([
      syntheticFinding({ id: "critical", ruleId: "naming.default-critical", axis: "layer-naming", severity: 4, status: "pass" }),
      syntheticFinding({ id: "healthy", ruleId: "naming.default-healthy", axis: "layer-naming", severity: 2, status: "fail" }),
      syntheticFinding({ id: "unique", ruleId: "naming.source-unique", axis: "layer-naming", severity: 2, status: "pass" }),
      syntheticFinding({ id: "node", ruleId: "naming.default-node", axis: "layer-naming", severity: 1, status: "fail", scoreImpact: false }),
    ]).find((axis) => axis.axis === "layer-naming");
    expect(score?.score).toBe(75);
  });

  it("caps an otherwise A report at B when Code Connect is missing", () => {
    const scores = AXES.map((axis) => ({ axis, score: 100, passedWeight: 1, applicableWeight: 1, multiplier: (["token-application", "layer-naming", "pipeline-readiness"] as string[]).includes(axis) ? 2 as const : 1 as const, statusCounts: { pass: 1, fail: 0, "needs-review": 0, waived: 0, "not-applicable": 0 } }));
    expect(gradeFromAxes(scores, true)).toEqual({ score: 89.9, letter: "B", uncappedScore: 100, capReason: "Missing verified Code Connect evidence caps readiness at B." });
  });

  it("uses each source frame's worst axis rather than averaging it away", () => {
    const perfect = axisScores(AXES.map((axis, index) => syntheticFinding({ id: `p${index}`, ruleId: `rule.p${index}`, axis })));
    const weak = perfect.map((score) => score.axis === "pipeline-readiness" ? { ...score, score: 0 } : score);
    expect(worstAxisScores([{ axisScores: perfect }, { axisScores: weak }]).find((axis) => axis.axis === "pipeline-readiness")?.score).toBe(0);
  });
});
