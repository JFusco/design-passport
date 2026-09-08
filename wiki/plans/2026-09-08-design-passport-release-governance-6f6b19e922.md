---
status: "implemented"
executed: true
evidence: [".husky/pre-push; .husky/commit-msg; tests/release-tooling.test.ts; Glean project 17 artifact verification"]
source_tool: "repository"
source: "/private/tmp/design-passport-release-governance-plan.md"
topics: ["design-passport-architecture", "figma-runtime-qa"]
digest: "6f6b19e9221ea0872403a665389c0517565ab279b208bc0ca3e10b6a78773ca0"
---

# Design Passport release governance

1. Install and initialize the pinned `@verndale/ai-commit` and `@verndale/ai-pr` packages.
2. Preserve the repository wiki lifecycle while moving the active Git hook path to Husky.
3. Match the `@verndale/ui-design-library` pre-push quality gate and run the complete verifier before every push.
4. Add contract coverage and team-facing setup documentation.
5. Normalize the five Glean project 17 artifacts to one heading hierarchy and correct stale document identities.
6. Verify the hooks, repository, Glean artifacts, commit, push, and existing pull request.
