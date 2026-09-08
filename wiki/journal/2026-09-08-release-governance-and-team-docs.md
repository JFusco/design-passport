---
topics: [design-passport-architecture, figma-runtime-qa]
plans: [2026-09-08-design-passport-release-governance-6f6b19e922.md]
---

# Release governance and team-documentation consistency

## Change

Added the shared Verndale commit and pull-request tooling, activated Husky, and matched the `@verndale/ui-design-library` hook shape. Commits now pass the managed commit-message policy, the existing advisory wiki lifecycle remains on pre-commit, and every push runs the repository's complete verification contract.

The five Design Passport artifacts in Glean project 17 were also reconciled to one restrained editorial heading hierarchy. Their visible sequence and document identities now read `01 — Start Here`, `02 — Why Design Passport`, `03 — How to Use Design Passport`, `04 — Readiness Standard`, and `05 — Technical Reference`. Existing runbook and technical-map section numbering was preserved.

## Rationale

The plugin's certificate is useful only when its own delivery path is equally deterministic. Reusing the established Verndale hook contract prevents local pushes from bypassing catalog, schema, wiki, TypeScript, test, or build checks. Consistent team-document headings make the operating guide feel like one system rather than five unrelated generated artifacts.

## Evidence

- `@verndale/ai-commit@2.7.0` and `@verndale/ai-pr@1.3.5` are exact development dependencies.
- `.husky/pre-push` delegates to `pnpm verify:push`; `.husky/pre-commit` preserves the managed wiki lifecycle.
- `tests/release-tooling.test.ts` locks the package-level release contract.
- Glean project 17 was visually checked after all five artifact edits.
- Final command and hook results are recorded in the delivery commit and pull request.

## Durable decision

See [Design Passport architecture](../topics/design-passport-architecture.md) for the release-governance boundary and [Figma runtime and release QA](../topics/figma-runtime-qa.md) for the runtime verification contract.
