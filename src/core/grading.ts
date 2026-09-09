import { AXES, type Axis, type AxisScore, type Finding, type FindingStatus, type Grade, type GradeLetter } from "./contracts";
import { AXIS_MULTIPLIERS } from "./constants";

const STATUS_PRIORITY: Record<FindingStatus, number> = {
  fail: 5,
  "needs-review": 4,
  waived: 3,
  pass: 2,
  "not-applicable": 1,
};

function scoreGroups(findings: Finding[]): { passedWeight: number; applicableWeight: number } {
  const groups = new Map<string, Finding[]>();
  for (const item of findings.filter((finding) => finding.scoreImpact !== false)) {
    const key = `${item.rootId}:${item.ruleId}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  let passedWeight = 0;
  let applicableWeight = 0;
  for (const items of groups.values()) {
    const worst = [...items].sort((left, right) => STATUS_PRIORITY[right.status] - STATUS_PRIORITY[left.status] || right.severity - left.severity)[0];
    if (!worst || worst.status === "not-applicable") continue;
    applicableWeight += worst.severity;
    if (worst.status === "pass") passedWeight += worst.severity;
    // Waived and needs-review rules remain deductions by design.
  }
  return { passedWeight, applicableWeight };
}

export function axisScores(findings: Finding[]): AxisScore[] {
  return AXES.map((axis) => {
    const axisFindings = findings.filter((item) => item.axis === axis);
    const { passedWeight, applicableWeight } = scoreGroups(axisFindings);
    const statusCounts = Object.fromEntries(
      (["pass", "fail", "needs-review", "waived", "not-applicable"] as FindingStatus[])
        .map((status) => [status, axisFindings.filter((item) => item.status === status).length]),
    ) as Record<FindingStatus, number>;
    return {
      axis,
      score: applicableWeight === 0 ? 100 : Math.round((passedWeight / applicableWeight) * 1000) / 10,
      passedWeight,
      applicableWeight,
      multiplier: AXIS_MULTIPLIERS[axis],
      statusCounts,
    };
  });
}

export function letterForScore(score: number): GradeLetter {
  if (!Number.isFinite(score)) throw new Error("Grade score must be finite");
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function gradeFromAxes(scores: AxisScore[], missingCodeConnect: boolean): Grade {
  const axisNames = new Set(scores.map((axis) => axis.axis));
  if (scores.length !== AXES.length || axisNames.size !== AXES.length || AXES.some((axis) => !axisNames.has(axis))
    || scores.some((axis) => !Number.isFinite(axis.score) || axis.score < 0 || axis.score > 100 || axis.multiplier !== AXIS_MULTIPLIERS[axis.axis])) {
    throw new Error("Axis scores must contain every readiness axis exactly once with valid scores and multipliers");
  }
  const denominator = scores.reduce((sum, axis) => sum + axis.multiplier, 0);
  const uncappedScore = Math.round((scores.reduce((sum, axis) => sum + axis.score * axis.multiplier, 0) / denominator) * 10) / 10;
  if (missingCodeConnect && uncappedScore >= 90) {
    return { score: 89.9, letter: "B", uncappedScore, capReason: "Missing verified Code Connect evidence caps readiness at B." };
  }
  return { score: uncappedScore, letter: letterForScore(uncappedScore) };
}

export function capGradeForTokenCoverage(grade: Grade, coverage: number | undefined): Grade {
  if (coverage === undefined || !Number.isFinite(coverage) || coverage < 0 || coverage > 100) return grade;
  const uncappedScore = grade.uncappedScore ?? grade.score;
  if (coverage < 95 && grade.score >= 90) {
    return { score: 89.9, letter: "B", uncappedScore, capReason: "Token binding coverage below 95% caps readiness at B." };
  }
  return grade;
}

export function isAtLeastB(grade: Grade): boolean {
  return grade.letter === "A" || grade.letter === "B";
}

export function worstAxisScores(frames: Array<{ axisScores: AxisScore[] }>): AxisScore[] {
  if (frames.length === 0) throw new Error("At least one frame is required to derive limiting axis scores");
  return AXES.map((axis) => {
    const candidates = frames.map((frame) => frame.axisScores.find((score) => score.axis === axis)).filter((score): score is AxisScore => Boolean(score));
    return [...candidates].sort((left, right) => left.score - right.score)[0] ?? {
      axis,
      score: 100,
      passedWeight: 0,
      applicableWeight: 0,
      multiplier: AXIS_MULTIPLIERS[axis],
      statusCounts: { pass: 0, fail: 0, "needs-review": 0, waived: 0, "not-applicable": 0 },
    };
  });
}
