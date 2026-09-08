---
status: "implemented"
executed: true
evidence: [".github/workflows/quality.yml; .github/workflows/commitlint.yml; tests/release-tooling.test.ts; pnpm exec commitlint --version"]
source_tool: "repository"
source: "/private/tmp/design-passport-ci-gates-plan.md"
topics: ["design-passport-architecture", "figma-runtime-qa"]
digest: "17bd086b3d25153624176c4fec3a4e6c21e31e161b6b7e5ef38dcfb675782c58"
---

# Design Passport CI quality gates

1. Compare the complete GitHub workflow layer with `@verndale/ui-design-library`.
2. Add the pull-request quality workflow and shared commitlint configuration.
3. Validate the PR title and every commit in the pull-request range.
4. Exclude managed wiki branches from ordinary PR automation.
5. Add contract tests, documentation, wiki history, and run the complete gate.
