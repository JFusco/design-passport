import type { Finding, FindingCategory } from "./contracts";

const CATEGORIES: Readonly<Record<string, FindingCategory>> = {
  "accessibility.target-preferred": "recommendation",
  "token.application.typography-review": "recommendation",
  "token.application.unique-inference": "recommendation",
  "token.application.ambiguous-inference": "recommendation",
  "token.application.repeated-literal": "recommendation",
  "component.repeated-candidate": "recommendation",
  "naming.pattern-novel": "governance",
};

/** Apply only when producing a new report; never rewrite historical evidence. */
export function classifyFinding(finding: Finding): Finding {
  const category = CATEGORIES[finding.ruleId] ?? finding.category ?? "requirement";
  return {
    ...finding,
    category,
    ...(category === "requirement" ? {} : {
      scoreImpact: false,
      hardBlocker: false,
      status: finding.status === "fail" ? "needs-review" as const : finding.status,
    }),
  };
}

export function affectsScore(finding: Finding): boolean {
  return (finding.category === undefined || finding.category === "requirement") && finding.scoreImpact !== false;
}

export function blocksReadiness(finding: Finding): boolean {
  return (finding.category === undefined || finding.category === "requirement")
    && Boolean(finding.hardBlocker) && finding.status !== "pass" && finding.status !== "not-applicable";
}

export function isActionableFinding(finding: Finding): boolean {
  return finding.status !== "pass" && finding.status !== "not-applicable";
}

export function findingImpactLabel(finding: Finding): string {
  if (finding.category === "recommendation") return "Recommendation · does not affect grade";
  if (finding.category === "governance") return "Vocabulary governance · does not affect grade";
  if (finding.status === "not-applicable") return "Not applicable · excluded from grade";
  if (blocksReadiness(finding)) return "Readiness blocker";
  return affectsScore(finding) ? "Included in grading" : "Supporting evidence · no separate deduction";
}
