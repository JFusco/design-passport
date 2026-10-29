import type { SubmissionResult } from "../core/conductor-contracts";

/** A saved submission and its follow-up deliveries have separate outcomes. */
export function submissionStatusMessage(result: SubmissionResult): string {
  const workflow = result.transition === "not_requested" ? "The workflow state is unchanged."
    : result.transition === "refused" ? "The workflow action was not applied. Review it in Conductor."
    : result.transition === "pending" ? "The workflow action is pending." : "The workflow action was applied.";
  const notification = result.notification === "disabled" ? "External notifications are disabled or no delivery is configured."
    : result.notification === "failed" ? "Notification delivery failed. Check Conductor before retrying."
    : result.notification === "sent" ? "Notifications were sent." : "Notification delivery is pending.";
  return `Design and selected notes saved in this component’s Design discussion. ${workflow} ${notification}${result.warnings?.length ? ` ${result.warnings.join(" ")}` : ""}`;
}

export function designChangeStatusMessage(result: SubmissionResult): string {
  const slack = result.notification === "pending" ? "Slack notification planning or delivery is pending."
    : result.notification === "failed" ? "Slack notification planning or delivery failed; Conductor will retry eligible work."
    : result.notification === "sent" ? "Slack messages were sent." : "Slack delivery is disabled or no eligible delivery remains.";
  return `Design changes saved in the feature’s Design discussion. Approval and workflow state are unchanged. ${slack}${result.warnings.length ? ` ${result.warnings.join(" ")}` : ""}`;
}
