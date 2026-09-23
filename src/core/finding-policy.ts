import type { ConfigurablePolicyId, Finding, FindingCategory, ReadinessProfile } from "./contracts";

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

const CONFIGURABLE_RULES: Readonly<Record<string, ConfigurablePolicyId>> = {
  "naming.default-critical": "layer-naming",
  "naming.default-healthy": "layer-naming",
  "naming.default-node": "layer-naming",
  "naming.whitespace": "layer-naming",
  "naming.component-property": "component-property-grammar",
  "naming.component-value": "component-value-grammar",
  "naming.pattern-alias": "canonical-component-names",
  "naming.pattern-canonical": "canonical-component-names",
  "naming.pattern-contextual": "canonical-component-names",
  "naming.source-unique": "source-name-uniqueness",
  "naming.pattern-novel": "catalog-vocabulary",
  "component.description": "component-descriptions",
  "component.documentation": "component-descriptions",
  "component.detached-design": "detached-designs",
  "component.instances-attached": "detached-designs",
  "structure.spacer-layer": "spacer-layers",
};

export function configurablePolicyIdForFinding(finding: Pick<Finding, "ruleId">): ConfigurablePolicyId | undefined {
  return CONFIGURABLE_RULES[finding.ruleId];
}

/** Apply per-profile convention modes while leaving locked safety rules untouched. */
export function applyFindingPolicy(finding: Finding, profile: ReadinessProfile): Finding {
  const base = classifyFinding(finding);
  const policyId = CONFIGURABLE_RULES[base.ruleId];
  if (!policyId) return base;
  const mode = profile.ruleModes[policyId];
  const measured = { ...base.evidence.measured, policyMode: mode };
  if (mode === "required") {
    return {
      ...finding,
      category: "requirement",
      ...(finding.ruleId === "naming.pattern-novel" ? { scoreImpact: true } : {}),
      evidence: { ...finding.evidence, measured },
    };
  }
  if (mode === "off") {
    return {
      ...base,
      status: "not-applicable",
      category: "recommendation",
      scoreImpact: false,
      hardBlocker: false,
      message: `${base.title} is disabled in Audit Setup.`,
      evidence: { ...base.evidence, measured },
    };
  }
  return {
    ...base,
    category: base.ruleId === "naming.pattern-novel" ? "governance" : "recommendation",
    scoreImpact: false,
    hardBlocker: false,
    status: base.status === "fail" ? "needs-review" : base.status,
    evidence: { ...base.evidence, measured },
  };
}

/** An off convention emits one transparent N/A summary per source and policy. */
export function collapseDisabledPolicyFindings(findings: readonly Finding[]): Finding[] {
  const output: Finding[] = [];
  const summaries = new Map<string, Finding>();
  for (const finding of findings) {
    const policyId = configurablePolicyIdForFinding(finding);
    if (!policyId || finding.evidence.measured.policyMode !== "off") {
      output.push(finding);
      continue;
    }
    const key = `${finding.rootId}:${policyId}`;
    const existing = summaries.get(key);
    if (existing) {
      const occurrenceCount = Number(existing.evidence.measured.occurrenceCount ?? 1) + 1;
      existing.evidence.measured = { ...existing.evidence.measured, occurrenceCount };
      continue;
    }
    const summary: Finding = {
      ...finding,
      title: `${policyId.replace(/-/g, " ")} disabled`,
      message: `This team-convention rule is off in Audit Setup and is excluded from grade and readiness.`,
      evidence: { ...finding.evidence, measured: { policyMode: "off", policyId, occurrenceCount: Number(finding.evidence.measured.occurrenceCount ?? 1) } },
    };
    summaries.set(key, summary);
    output.push(summary);
  }
  return output;
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
