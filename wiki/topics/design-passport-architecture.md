---
topics: [design-readiness-standard, whole-file-design-knowledge, mutation-certification-safety, figma-runtime-qa, project-scoped-knowledge-loop]
---

# Design Passport architecture

## Decision

Design Passport is a private Figma plugin with five explicit boundaries:

1. The Figma adapter reads and mutates the live document.
2. The normalized whole-file graph is the adapter-independent knowledge contract.
3. The pure rule engine and mutation planner produce deterministic findings, grades, and typed operations.
4. The React UI presents state and sends validated commands; it does not contain grading or mutation policy.
5. Project, reference, and shared knowledge is evaluated only after the deterministic report; the networked local companion remains outside the plugin runtime.

The `ReadinessProfile`, `Finding`, `ChangePlan`, and `ReadinessReport` contracts are JSON Schema validated. This makes the graph and report reusable by a future REST or CI adapter without moving Figma runtime objects into the rule engine. Scan commands carry only scope and refresh intent; the sandbox-owned committed profile is the sole profile input to grading.

On conventional files, bootstrap deterministically infers a valid in-memory audit setup from page names, component-section boundaries, local Semantic collections, and standard breakpoints. Designers can therefore audit immediately without learning file-type or page-role configuration. Audit setup is absent from primary navigation and appears only as a secondary recovery/advanced surface.

That surface holds committed and editable values separately. Unsaved, invalid, or page-reconciled advanced drafts gate every profile-dependent action until the designer explicitly saves or discards them. Saving is the only setup persistence path and invalidates any earlier report; safe inference alone writes nothing to shared plugin data.

## Naming authority

`@verndale/ui-design-brain@1.17.0` is lockfile pinned and projected into a generated 80-pattern manifest. It controls canonical pattern names, plain aliases, contextual-alias review, and advisory pattern checklists. It does not replace WCAG or become a runtime network dependency.

## Runtime boundary

The production build is an inlined React document plus an ES2020 plugin bundle. The manifest is private, network-denied, dynamic-page aware, and supports Figma Design plus audit-only Dev Mode. Untrusted layer text, Markdown, and URLs are never evaluated; raw layer text is not persisted.

## Release governance

The repository pins `@verndale/ai-commit@2.7.0` and `@verndale/ai-pr@1.3.5`. Husky owns the active Git hook path. The pre-commit hook preserves the advisory context-wiki lifecycle, commit messages pass the shared Verndale policy, and pre-push runs the complete `pnpm verify:ci` contract through `pnpm verify:push`.

GitHub independently repeats both gates. `commitlint.yml` validates the PR title and every commit between the PR base and head. `quality.yml` runs the complete non-fixing verifier for pull requests into `main`. The PR automation excludes `bot/wiki-*` branches so wiki reconciliation owns its own review flow. All workflows use Node 24.14.0 and pnpm 10.33.0, matching local development instead of introducing a second toolchain.

Secrets remain outside source control. `.env.example` documents local options, `.env` is ignored, and GitHub Actions receives its pull-request token through `PR_BOT_TOKEN`.

## Designer-feedback and producer contract, 2026-09-23

Plugin `0.4.0` and ruleset `1.0.0-beta.4` make audit evidence reconcilable without introducing a runtime service. Token coverage is a four-bucket ledger: direct bindings and evidenced inheritance count in the numerator, missing rendered source-owned values alone lower coverage, and ignored values remain visible outside the denominator. Current audits can page every live matching layer; report-v3 persistence keeps exact counts with bounded samples.

Profile schema v2 makes team conventions Required, Advisory, or Off. Advisory and Off modes cannot affect grade or readiness; accessibility, token correctness, evidence integrity, and certification safety remain locked. Profile-v1, report schemas 1–2, and certificate-v1 continue as historical input and are never silently rewritten.

The production manifest retains the organization-published plugin ID. `manifest.dev.json` has a separate Figma-assigned identity and a persistent Development warning. Both bundles embed plugin version, ruleset, Git SHA, and channel; report v3, certificate v2, bootstrap, UI, and exports retain the producer identity that actually created them. This preserves the no-network boundary while making stale, historical, development, and current production evidence distinguishable.

## Consequences

- Pure TypeScript operations can be unit tested without Figma.
- Figma writes stay reviewable and recoverable.
- Catalog and schema drift fail the verification command.
- Invalid commit messages and failed push verification stop their respective Git operations.
- There is no backend, telemetry, OAuth, webhook, or live `latest` lookup in version one.
- Project style guides remain file-bound and advisory; learning cannot publish without an exact-digest human decision.

See [the readiness standard](./design-readiness-standard.md), [whole-file knowledge](./whole-file-design-knowledge.md), [mutation and certification safety](./mutation-certification-safety.md), [the project-scoped knowledge loop](./project-scoped-knowledge-loop.md), and [runtime QA](./figma-runtime-qa.md).
