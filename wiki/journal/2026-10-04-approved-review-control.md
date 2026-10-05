---
title: Reflect saved approvals in the review action
topics: [supabase-companion]
plans: [2026-10-04-reflect-current-approvals-in-the-companion-review-action-ddaf4fbd15.md]
issue: 'https://github.com/jfusco/design-passport/issues/75'
issues: ['https://github.com/jfusco/design-passport/issues/75']
---

# Reflect saved approvals in the review action

[Issue #75](https://github.com/JFusco/design-passport/issues/75) records the enabled Approve action on already approved candidates. The action previously checked unsaved edits and pending requests without checking the current decision. It now shows a disabled Approved button for the saved revision and scope with a current approval. Reject and Defer remain available, and saving changed wording or scope requires a new decision.

## Verification

All eight production browser tests passed. The review workflow covers approval after reload, unsaved scope and wording, changed-revision guidance withdrawal, reapproval, rejection and deferral. Lost-response replay starts from an awaiting candidate. The database decision history and replay contracts remain unchanged.

Separately, the published Figma plugin 0.5.0, build 26de3b6b94a5, imported the actual nine-item reviewed project pack through its file picker. The returned binding retained all 15 original style-guide facts and all nine approved facts exactly. A refreshed source-frame audit rendered all nine guidance items and exceptions. Its grade remained B, score 89.9/100 and finding count 1,797. This is native plugin evidence, separate from the disposable PGlite browser fixtures. No design repairs, additional companion evidence imports or shared release exports occurred.

`DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci` passed, including all 551 unit and integration tests, eight production browser tests, builds, typechecks, lint, wiki and skill checks. Next.js 16.3.6 Turbopack reported no compilation issues. The isolated agent-browser development attempt timed out in CDP accessibility reads and lost its Next browser session; that incomplete attempt is not a runtime approval-workflow pass. Production Playwright completed the workflow, accessibility and protected-access checks.

The local companion continues running on port 5181. The UI fix is delivered in an open pull request; it does not update that main checkout until merged.

## Risk and rollback

The change only suppresses redundant approval of the current saved revision. The existing server checks still enforce digest freshness and request identity. Revert the review control and regression assertions to roll back; preserve the database and its immutable decisions. The native pack retains the connected guide and the reviewed approved layer.

See [companion database persistence](../topics/supabase-companion.md) for the decision and backup contracts.
