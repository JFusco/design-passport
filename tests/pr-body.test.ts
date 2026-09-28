import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { REQUIRED_CHECKS, validatePullRequestBody } = require("../scripts/validate_pr_body.cjs") as {
  REQUIRED_CHECKS: string[];
  validatePullRequestBody: (body: string) => string[];
};

function validBody(): string {
  return `## Summary

Standardize deterministic Git delivery for review.

## Linked issue

Closes #44

## Changes

- Add the canonical pull request contract.

## Verification

- pnpm run verify:ci passed locally.

## Risk and rollback

- Risk: Existing pull requests must adopt the required structure.
- Rollback: Revert the delivery-tooling commit.

## Checklist

${REQUIRED_CHECKS.map((item) => `- [x] ${item}`).join("\n")}
`;
}

describe("pull request body validation", () => {
  it("accepts the canonical body", () => {
    expect(validatePullRequestBody(validBody())).toEqual([]);
  });

  it("rejects missing issue closure", () => {
    expect(validatePullRequestBody(validBody().replace("Closes #44", "Related #44"))).toContain(
      "Linked issue must contain a GitHub closing reference such as `Closes #123`.",
    );
  });
});
