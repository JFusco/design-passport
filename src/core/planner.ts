import type { ChangeOperation, ChangePlan, Finding } from "./contracts";
import { operationForFinding, resolveOperationConflicts, riskForOperation } from "./operations/planning";
import { assertContract } from "./schema";
import { hashValue } from "./stable";

export function buildChangePlans(findings: Finding[]): ChangePlan[] {
  const entries = resolveOperationConflicts(findings.map((item) => ({ finding: item, operation: operationForFinding(item) }))
    .filter((entry): entry is { finding: Finding; operation: ChangeOperation } => Boolean(entry.operation)));
  const grouped = new Map<ChangePlan["risk"], typeof entries>();
  for (const entry of entries) {
    const risk = riskForOperation(entry.operation);
    grouped.set(risk, [...(grouped.get(risk) ?? []), entry]);
  }
  const plans: ChangePlan[] = [];
  for (const risk of ["low", "guarded", "structural"] as const) {
    const members = grouped.get(risk) ?? [];
    if (members.length === 0) continue;
    if (risk === "structural") {
      for (const member of members) plans.push(makePlan(risk, [member]));
    } else {
      plans.push(makePlan(risk, members));
    }
  }
  return plans;
}

function makePlan(risk: ChangePlan["risk"], members: Array<{ finding: Finding; operation: ChangeOperation }>): ChangePlan {
  const plan: ChangePlan = {
    id: `plan:${risk}:${hashValue(members.map((member) => member.finding.id))}`,
    findingIds: [...new Set(members.map((member) => member.finding.id))],
    risk,
    operations: members.map((member) => member.operation),
    expectedPostconditions: members.map((member) => `${member.operation.nodeId}:${member.operation.kind}`),
    rollbackBoundary: "risk-group",
  };
  assertContract("change-plan", plan);
  return plan;
}
