---
topics: [project-scoped-knowledge-loop, design-passport-architecture, figma-runtime-qa]
plans: [2026-09-11-shared-design-passport-knowledge-loop-a55aa1a3eb.md]
---

# Project-scoped knowledge loop and live Figma validation

## Change

Implemented GitHub issue `JFusco/design-passport#15` on `codex/15-shared-design-knowledge`. Design Passport now supports project-specific Figma style-guide packs, private file-bound connections, session-only references, source-qualified advisory guidance, sanitized opt-in learning exports, exact-group draft generation, append-only maintainer decisions, deterministic project/shared pack compilation, and non-certifying multi-file review wrappers.

Added strict versioned schemas without changing `ReadinessProfileV1`, `DesignKnowledgeGraphV1`, `ReadinessReportV1`, or `CertificationSummaryV1`. Advisory inputs stay outside the rule evaluator and grading pipeline. The plugin remains network-denied; only the local companion uses the Figma REST API.

The designer UI uses file pickers, plain-language summaries, short references, normalized local dates, and explicit privacy omissions instead of exposing JSON or raw IDs. The local Knowledge Review UI was redesigned around a compact queue and one focused draft with generated wording, publication scope, evidence counts, exceptions, a decision note, and Approve/Reject/Defer actions.

## Live validation and fixes

Created the separate [UI Design Library Style Guide](https://www.figma.com/design/vHNBRj4l821qXqH7XIATR2/UI-Design-Library-Style-Guide) for the existing UI Design Library while keeping canonical foundations in the source library. Live ingestion produced 15 sanitized facts across all six advisory domains.

Figma Desktop testing found and fixed a missing `TextEncoder` assumption in the plugin sandbox, an inline-script newline parsing failure in Knowledge Review, excessive non-actionable learning drafts, raw-JSON designer affordances, unfriendly dates/identifiers, stale decision-scope display, verb-form decision badges, and the missing session-only style-guide fallback for files without a stable key.

Established-project, new/no-guide, session reference, Design/Dev Mode, invalid replacement, restart persistence, cross-file isolation, contribution preview/cancel/export, duplicate import, candidate edit invalidation, project/shared approval, rejection, deferral, and batch ingestion paths were exercised. The final exact Button regression remained B/89.9 and ready with project guidance loaded; the full 36-page graph contained 4,896 nodes and remained a separate broader audit scope.

## Evidence

- [Knowledge-loop implementation](../../src/core/knowledge-loop.ts)
- [Local companion](../../src/companion/main.ts)
- [Designer context UI](../../src/ui/components/ContextPanel.tsx)
- [Designer guidance UI](../../src/ui/components/Guidance.tsx)
- [Knowledge-loop documentation](../../docs/knowledge-loop.md)
- `pnpm typecheck`
- 27 Vitest files and 157 tests
- Live Figma target `gXT4bIDrkgva2uSzY763oG`
- Live style guide `vHNBRj4l821qXqH7XIATR2`

## Durable decision

Project conventions never become shared through recurrence alone, and no advisory changes a grade. Every project or shared publication requires a current human decision bound to the exact candidate digest. See [Project-scoped knowledge loop](../topics/project-scoped-knowledge-loop.md) and [Figma runtime and release QA](../topics/figma-runtime-qa.md).
