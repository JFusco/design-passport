---
topics: [design-readiness-standard, whole-file-design-knowledge, mutation-certification-safety, figma-runtime-qa]
---

# Design Passport architecture

## Decision

Design Passport is a private Figma plugin with four explicit boundaries:

1. The Figma adapter reads and mutates the live document.
2. The normalized whole-file graph is the adapter-independent knowledge contract.
3. The pure rule engine and mutation planner produce deterministic findings, grades, and typed operations.
4. The React UI presents state and sends validated commands; it does not contain grading or mutation policy.

The `ReadinessProfile`, `Finding`, `ChangePlan`, and `ReadinessReport` contracts are JSON Schema validated. This makes the graph and report reusable by a future REST or CI adapter without moving Figma runtime objects into the rule engine.

## Naming authority

`@verndale/ui-design-brain@1.17.0` is lockfile pinned and projected into a generated 80-pattern manifest. It controls canonical pattern names, plain aliases, contextual-alias review, and advisory pattern checklists. It does not replace WCAG or become a runtime network dependency.

## Runtime boundary

The production build is an inlined React document plus an ES2020 plugin bundle. The manifest is private, network-denied, dynamic-page aware, and supports Figma Design plus audit-only Dev Mode. Untrusted layer text, Markdown, URLs, and Code Connect templates are never evaluated; sensitive source paths and raw layer text are not persisted.

## Consequences

- Pure TypeScript operations can be unit tested without Figma.
- Figma writes stay reviewable and recoverable.
- Catalog and schema drift fail the verification command.
- There is no backend, telemetry, OAuth, webhook, or live `latest` lookup in version one.

See [the readiness standard](./design-readiness-standard.md), [whole-file knowledge](./whole-file-design-knowledge.md), [mutation and certification safety](./mutation-certification-safety.md), and [runtime QA](./figma-runtime-qa.md).
