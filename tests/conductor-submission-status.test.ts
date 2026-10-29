import { expect, it } from "vitest";
import { submissionStatusMessage } from "../src/plugin/conductor-submission-status";
import type { SubmissionResult } from "../src/core/conductor-contracts";
const result = { submissionId: "submission", commentId: "comment", variantIds: ["variant"], transition: "not_requested", notification: "disabled", warnings: ["Design saved; preview refresh is unavailable."] } satisfies SubmissionResult;
it("reports saved content, unchanged workflow, disabled delivery and partial failure separately", () => {
  const message = submissionStatusMessage(result);
  expect(message).toContain("Design discussion");
  expect(message).toContain("workflow state is unchanged");
  expect(message).toContain("External notifications are disabled");
  expect(message).toContain(result.warnings[0]);
  expect(message).not.toContain("delivery is pending");
});
it.each(["pending", "sent", "failed"] as const)("reports the actual %s notification outcome", (notification) => {
  const message = submissionStatusMessage({ ...result, notification, transition: "refused", warnings: [] });
  expect(message).toContain("workflow action was not applied");
  expect(message).toContain(notification === "pending" ? "delivery is pending" : notification === "sent" ? "Notifications were sent" : "delivery failed");
});
