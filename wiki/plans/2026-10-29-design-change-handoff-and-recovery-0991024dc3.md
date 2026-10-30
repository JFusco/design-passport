---
status: "partial"
executed: true
evidence: ["src/plugin/conductor-pending-send.ts; src/plugin/conductor-change-controller.ts; tests/conductor-pending-send.test.ts; docs/tutorials/conductor/production-manifest.json; JFusco/design-passport#100"]
source_tool: "repository"
source: "/private/tmp/design-change-handoff-executed.md"
topics: ["conductor-design-workspaces"]
digest: "0991024dc312738974f679f4870b4679162cca8ceae946c17bf7fa88a77f8256"
---

# Design-change handoff and recovery

Implement explicit design-change submissions, safe pending-send recovery and Slack notifications. Prepare tutorial assets with Marin; final recording is tracked separately in issue 101. Companion integration is excluded.

1. Require a designer-authored summary and review of the exact project, deliverable, feature, frames, names, Default/named appearance, breakpoint and checked annotations. Revalidate the selection and destination before saving. Design changes perform no workflow transition or approval; ordinary submissions preserve optional workflow actions.
2. Preserve contract 1.0.0, legacy hashes and three-field context.frames. Add optional intent/width and sibling frameDetails. Require both design_change and resolve_pending_send capabilities before showing the new action.
3. Resolve pending sends through a committed receipt or durable cancellation. Share one authenticated organization/owner/request transaction lock across resolution and both save paths. Load pending storage before the canvas, persist dispatch and recovery metadata before transport, and acknowledge terminal outcomes before cleanup. Timeouts and missing receipts never establish cancellation.
4. Keep applicable workflow-role inbox notices. Notify only currently authorized role holders who opted into Slack; recheck before enqueue and delivery. Exclude project channels, Teams, email and automatic comment mentions. Deduplicate outbox plans, retry independently and report mixed outcomes accurately. Document the external-send/acknowledgement crash window.
5. Verify contract compatibility, widths, annotations, versions, replay, race ordering, rollback, lost responses, restart, storage failure, stale sessions, authorization, Slack failures and plugin-free alternatives. Update both owning wikis and run required repository gates. Open verified scoped PRs and stop before merge.
6. Prepare one Marin-narrated walkthrough and seven silent task scripts, shot lists and caption drafts with synthetic data. Record final footage only after the published plugin and hosted features pass acceptance. Release the server cancellation guard first, drain older writers and retain cancellation enforcement on rollback.

The independent plan review passed before implementation. Deployment, publication, activation, real Slack sends, narration costs and final recording retain separate authorization gates.
