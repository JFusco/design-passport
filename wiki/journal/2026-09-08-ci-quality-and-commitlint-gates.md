---
topics: [design-passport-architecture, figma-runtime-qa]
plans: [2026-09-08-design-passport-ci-quality-gates-17bd086b3d.md]
---

# CI quality and commit-message gates

## Correction

The first release-governance pass mirrored the `@verndale/ui-design-library` Husky hooks but did not mirror its GitHub Actions quality and commitlint workflows. That left server-side enforcement weaker than local enforcement. This follow-up closes that gap explicitly.

## Change

- Added `quality.yml` to run the complete non-fixing `pnpm verify:ci` contract for pull requests into `main`.
- Added `commitlint.yml` to validate both the pull-request title and every commit between the PR base and head.
- Added `commitlint.config.cjs` as the shared `@verndale/ai-commit` policy entry point.
- Hoisted the transitive `@commitlint/cli` binary through `pnpm-workspace.yaml`, matching the reference repository and making clean CI installs deterministic.
- Excluded `bot/wiki-*` branches from ordinary PR automation so the managed wiki workflows retain ownership of those branches.
- Expanded the TypeScript release-tooling contract test to cover both workflows and the hoist requirement.

## Evidence

- Reference implementation: `@verndale/ui-design-library/.github/workflows/quality.yml`, `commitlint.yml`, `pr.yml`, `commitlint.config.cjs`, and `pnpm-workspace.yaml`.
- Local clean dependency recreation exposes `@commitlint/cli@20.5.3`.
- `tests/release-tooling.test.ts` verifies the workflow commands, PR-range inputs, shared policy, and wiki-branch exclusion.
- Final local and GitHub Actions results are recorded in the delivery commit and pull request.

## Durable decision

See [Design Passport architecture](../topics/design-passport-architecture.md) for the complete local-plus-CI release boundary and [Figma runtime and release QA](../topics/figma-runtime-qa.md) for verification expectations.
