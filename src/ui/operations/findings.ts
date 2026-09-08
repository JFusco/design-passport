import type { Axis, Finding } from "../../core/contracts";

const STATUS_PRIORITY: Record<Finding["status"], number> = {
  fail: 4,
  "needs-review": 3,
  waived: 2,
  pass: 1,
  "not-applicable": 0,
};

export function findingsForReview(
  findings: readonly Finding[],
  options: { showPassing: boolean; axis: Axis | "all" },
): Finding[] {
  return findings
    .filter((finding) => {
      if (!options.showPassing && (finding.status === "pass" || finding.status === "not-applicable")) return false;
      return options.axis === "all" || finding.axis === options.axis;
    })
    .sort((left, right) => Number(Boolean(right.hardBlocker)) - Number(Boolean(left.hardBlocker))
      || STATUS_PRIORITY[right.status] - STATUS_PRIORITY[left.status]
      || right.severity - left.severity
      || left.axis.localeCompare(right.axis)
      || left.nodePath.localeCompare(right.nodePath)
      || left.id.localeCompare(right.id));
}
