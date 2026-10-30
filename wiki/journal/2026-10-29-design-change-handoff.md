---
topics: [conductor-design-workspaces]
plans: [2026-10-29-design-change-handoff-and-recovery-0991024dc3.md]
issue: 'https://github.com/jfusco/design-passport/issues/100'
issues: ['https://github.com/jfusco/design-passport/issues/100']
---

# Explicit design changes and safe pending-send recovery

[Issue 100](https://github.com/JFusco/design-passport/issues/100) implements an explicit designer-authored summary, exact destination/variant/breakpoint review, checked annotations and final confirmation. Bound changes update their original feature with optimistic versions; unbound changes create a new variant through the existing picker. The action makes no workflow move or approval. Both design-change and recovery capabilities are required before showing it.

Pending storage is inspected before the canvas. A focused controller owns dispatch metadata, resolution sidecars, same-session first-refusal proof for older servers, terminal acknowledgement and cleanup. Recovery works without selection after restart or deletion. A supporting server recovers the committed receipt or durably cancels the authenticated request. Unknown outcomes remain pending; timeouts and missing receipts never establish cancellation. Storage failures prevent transport, and a started resolution never falls back to sending the design. Manual uncertain resolution requires confirmation.

The contract remains 1.0.0. Legacy hashes and three-field context.frames entries remain compatible; sibling frameDetails carries presentation metadata. COS owns cancellation enforcement, notification planning and the Slack outbox. Current applicable roles retain inbox notices; external design-change messages go only to authorized role holders who opted into Slack. Notification planning and delivery retry independently of the saved design. Slack send/acknowledgement crashes can still duplicate an external message.

Prepared sources under `docs/tutorials/conductor/` contain the Marin walkthrough, seven silent task scripts, shot lists and draft SRT/VTT timing. [Issue 101](https://github.com/JFusco/design-passport/issues/101) owns final recording and media acceptance after the published plugin and hosted features ship and pass acceptance. No narration was purchased or generated, and no final footage or live Slack send is claimed.

Local `pnpm run verify:ci` passed: catalog/schema/knowledge/wiki/skills checks, both typechecks, companion lint, 706 unit tests, companion build, 15 browser tests and development plugin artifacts. A synthetic local browser fixture verified blank-summary refusal, complete change review, separate saved/Slack status and explicit pending-resolution confirmation. These results do not establish native Figma, published-plugin or hosted acceptance. Earlier sandbox socket refusals and an unchanged cold-import timeout were superseded by the full successful run; no test timeout was relaxed. Deploy the server cancellation guard first, drain older writers and retain the guard and immutable cancellation markers on rollback. Review and merging remain with the user.

Local source review found that the installed server workflow SDK cannot resume ERROR workflows under the same ID and retains failed step errors. The original plan assumed that recovery worked. The owner approved deterministic recovery workflow IDs, preserving the original saved submission, Slack event/person keys and failed workflow history. Reconciliation starts a compatible recovery execution rather than attempting an unsupported same-ID resume. A real executor test verifies this correction before release.

Security review traced the strict plugin DTOs, fixed-origin cookie-free transport, owner/file/session-scoped pending storage, authenticated cancellation identity, receipt authorization and Slack escaping/recipient checks. No high-confidence vulnerabilities were identified in that reviewed scope. No companion, upload or runtime credential behavior changed.
