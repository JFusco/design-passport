---
status: "implemented"
executed: true
evidence: ["JFusco/design-passport#75; apps/companion/app/review/ReviewController.tsx; tests/e2e/companion.spec.ts"]
source_tool: "codex"
source: "JFusco/design-passport#75"
topics: ["supabase-companion"]
digest: "ddaf4fbd15e4efff7005387f71ed1901b5ac9da6ce4428b518a094035fbd95f2"
---

# Reflect current approvals in the companion review action

## Goal

Fix the enabled Approve action on an already approved saved revision. Verify the actual reviewed project pack in the published Figma plugin without losing connected style-guide facts.

## Implementation

1. Derive the approved action from the current digest-bound decision, publication scope and saved editor state.
2. Show a disabled Approved button for that revision and guard repeat approval in the event handler. Keep Reject and Defer available.
3. Extend the production browser workflow to verify reloads, unsaved scope/wording, changed revisions, guidance withdrawal, reapproval and decision transitions. Select an awaiting candidate for lost-response replay coverage.
4. Import the nine-item downloaded pack through the published Figma UI, compare the resulting 24 facts with both input packs, and verify nine rendered guidance items and exceptions. Refresh the same audit and record native results separately from fixtures.
5. Record the implementation and verification in the wiki, run the required checks, and deliver issue #75 in an open pull request.

## Boundaries

No database schema change, additional real evidence import, design repair, shared release export, merge or issue closure. Preserve decision history and the existing companion dev server.
