---
topics: [whole-file-design-knowledge, design-passport-architecture, figma-runtime-qa]
plans: [2026-09-11-make-scoped-audits-look-scoped-7be69504d6.md]
---

# Scoped audits now look and behave scoped

## Change

Implemented [GitHub issue JFusco/design-passport#19](https://github.com/JFusco/design-passport/issues/19) on `codex/19-selection-audit-scope-clarity`. The selection action is now **Audit selection** and accepts only frames, components, and component sets. Empty, unsupported, and mixed selections are blocked with specific guidance.

Selection IDs and current-page IDs are captured before profile persistence, page loading, indexing, or target analysis. Progress keeps that captured target as the headline, describes whole-file work only as supporting context, omits raw page and traversal details, and no longer shows a resetting determinate bar. Overview summarizes the audited roots directly beneath the grade hero; detailed file inventory remains in Context. Status notifications share a standard inset and vertical gap so they do not collide with the tab row or panel content.

## Lifecycle safety

An explicit `audit-started` message makes the backend-captured target authoritative in the UI. A target becomes active only after a successful report, so a failed attempted scan cannot replace the target used by later automatic rescans. A dedicated validated refresh command reuses that committed target, preventing a later selection or page change from silently retargeting a manual context rebuild. Cancellation survives initial page loading and knowledge construction, marks incomplete knowledge stale before announcing cancellation, and uses neutral copy because cleanup may already have completed before an automatic rescan is cancelled.

All panel commands are inert and visibly subdued while an audit is in flight. The progress status and context-preparation Cancel action remain outside that boundary, preventing unrelated command-gate failures from making a running audit appear finished. Dynamic stale-state warnings are polite live status messages as well as visible certification gates.

## Evidence

- [Captured target and cancellation adapter](../../src/figma/adapter.ts)
- [Scan lifecycle orchestration](../../src/plugin/scan-lifecycle.ts)
- [Target-first audit UI helpers](../../src/ui/operations/audit-scope.ts)
- [Selection target regression tests](../../tests/target-capture.test.ts)
- [Backend lifecycle regression tests](../../tests/scan-lifecycle.test.ts)
- [Scoped UI regression tests](../../tests/ui-audit-scope.test.ts)
- Live Figma development-plugin QA in `UI Design Library` (`gXT4bIDrkgva2uSzY763oG`): empty, unsupported, mixed, frame, standalone component, component-set, multi-root selection, current-page, and source-frame scopes; target capture while changing page and selection; cold/cached execution; cancellation; command locking; and notification spacing
- The live result placement review exposed an audited-target summary below the full axis list; it was moved immediately beneath the grade hero and reverified with a real component audit
- `pnpm typecheck`
- 30 Vitest files and 182 tests
- UI and plugin production builds

## Durable decision

Audit scope and knowledge scope stay separate: complete-file knowledge supports accuracy and certification, while only the captured selection, page, or source-frame set is graded and foregrounded. See [Whole-file design knowledge](../topics/whole-file-design-knowledge.md) and [Figma runtime and release QA](../topics/figma-runtime-qa.md).
