---
topics: [design-passport-architecture]
---

# Conductor design workspaces

The connected Conductor area prepares component workspaces in a manually linked deliverable file. COS owns authorization, screenshots, bounded generation, durable jobs, variants and discussion submissions. The plugin owns document inspection and native canvas edits. Contract v1 is pinned from COS; unsupported versions refuse connected actions while audits remain offline.

Each component/device workspace keeps the original Reference, generated Wireframe revisions and an editable Design frame separate. Stamped identities support recovery without relying on names. Reference and wireframe descendants are excluded from audit targets, including explicit selection. Canvas mutations use the existing command gate and invalidate audit knowledge.

Browser approval issues an owner-bound, eight-hour token for the plugin API only. Its bearer value stays in plugin clientStorage. Fixed environment origins, cookie-free transport and server-side policy checks protect each connected operation. Disconnect and existing profile revocation terminate access.

Explicit submission saves chosen Design links, a message and selected annotation snapshots into the same component's Design discussion. Workflow actions remain optional and version guarded. Native comment synchronization and automatic file creation are deferred. Generation and submission confer no approval or readiness.

## Delivery and verification

Implementation is in progress under [design-passport#94](https://github.com/JFusco/design-passport/issues/94) and [CEC-141](https://verndale.atlassian.net/browse/CEC-141). The native development plugin opens in the dedicated integration-test file. Connected pairing and the complete round trip still require live acceptance; local contract/transport/identity tests do not establish it.

COS ships its additive migration and compatible API/worker first with the organization capability disabled. A compatible plugin follows. Pilot activation, deployment and publication are separate release actions. Rollback disables connected work and preserves evidence, jobs, submissions, variants and Figma layers.

## Live acceptance: annotations and Functional Spec

Status: partially verified. These checks require the real development plugin, local Conductor and the dedicated [integration-test Figma file](https://www.figma.com/design/i9LwDeasLA8dKr02Bp0d8V). The Mac is unlocked. The development plugin has created a matching browser pairing and received scoped local approval. An isolated local database holds the test project, Joe’s verified local sign-in profile and all 12 project roles; external notification dispatch is disabled. After the deliverable link was configured, the authenticated context request succeeded. The manually uploaded Desktop screenshot was prepared in the native plugin and its receipt saved as applied. Reference, Wireframe r1 and Design exist on the Conductor workspaces page. The pilot wireframe received a manual padding and minimum control-height correction; the Design frame now contains edited native text and controlled annotation fixtures. Automated fixtures do not count as live acceptance. Hosted capability activation remains separate.

- [x] Create Reference, Wireframe and Design frames from a manually uploaded component screenshot. Capture the actual Figma canvas before and after editing the Design frame.
- [ ] Add two annotations on explicitly selected Design layers, a note on an unselected sibling, and a note on another component. Submit only one checked annotation. Confirm that only that annotation reaches this component's Design discussion and structured submission record; retain its submission ID, timestamp and source node link.
- [ ] Select only a parent frame and confirm that annotations on its unselected descendants are not silently collected. Confirm Reference/Wireframe and cross-component selections are refused.
- [ ] Generate a Functional Spec for that component. Inspect the admitted context and resulting draft: the selected note and Figma link must be available as source evidence, while unselected and other-component notes are absent. Verify a note that contradicts a saved BA decision becomes a clarification question instead of silently changing the requirement.
- [ ] Resume the deterministic interview and confirm it retains the admitted annotation snapshot through drafting. Excluding the annotation context layer must also exclude it from the deterministic snapshot.
- [ ] Save the spec, submit a newer annotation, then review the older saved spec. Inspect the review's source context and result: it uses the latest submission at or before that spec's save timestamp and excludes the newer note. This is a save-time cutoff, not an exact generation-source pin.
- [ ] Submit an explicitly empty annotation selection and generate again. Confirm earlier notes are not resurrected. Existing saved submission history and comments remain available.
- [ ] Capture Conductor's submitted Design discussion, Functional Spec context/draft and review alongside the actual Figma selection and submitted state. Label each screenshot by the real state demonstrated and record any provider or notification failure.

Annotation grounding reads one immutable component-scoped submission (at most 20 explicitly selected notes). Generation pins it in the admitted context; deterministic resumes retain that snapshot. Review uses the saved spec's timestamp as a cutoff. Notes remain untrusted evidence: citations and conflicts need BA review, and submission never grants approval. No file-wide annotation scan or native comment synchronization is involved.

## Optional handoffs and selected annotation proof

Designers can use the existing Add Design screenshot or frame-link flow and add notes directly in Conductor without Design Passport. The preparation dialog and plugin explain that authoring, submission and approval are separate actions. A missing plugin does not block the normal review workflow. Direct Figma preview/import still needs a valid server integration token; screenshot uploads are independent of that token.

The October 28 live submission saved exactly one checked CTA annotation in both the structured submission record and the component's Design discussion, with its Figma source link. Submission `2d242838-3c46-4cd8-98c9-81069c01d751` requested no transition. The unchecked note and unselected sibling were excluded; parent-only selection offered no descendant annotations and Reference selection was refused. The actual discussion screenshot is `/private/tmp/conductor-live-19-annotation-in-discussion.png`. The live Functional Spec preview included the selected note and preserved the BA goal; the actual interview surfaced the conflict as a question with source provenance. The first Functional Spec was saved and reloaded with the BA decision and annotation provenance intact. An explicitly empty second native submission removed old notes from new context; isolated database tests passed scope and historical-cutoff checks. A two-component native test and preview refresh remain unverified; see the [handoff journal](../journal/2026-10-28-conductor-handoffs.md).

## Pairing recovery

A cold local route compile exceeded the plugin request deadline while browser approval was pending. Poll timeouts now retain the same pairing code and retry only until its original deadline; stopping the connected area cancels polling. The fixed localhost development origin allows a bounded 120-second request for cold route compilation; hosted origins retain 30 seconds. Regression tests cover both limits, cold local completion, same-code retry and pairing deadline expiry. This does not recover a token whose one-time redemption response was lost.

## Native wireframe quality

The live r1 output exposed flattened 14px typography and clipped 1px controls. The unreleased shared contract now supports bounded font size, padding and gap. Generation checks readable line/control heights and padded Auto Layout budgets; native rendering distinguishes structural groups from image placeholders and reveals the result. Both draft consumers must be updated together; older consumers reject unfamiliar fields. A real local generation and plugin application produced r4 (node `33:22`), preserved the edited Design frame, and returned a persisted receipt. The screenshot `/private/tmp/conductor-live-15-wireframe-r4.png` and Figma readback verify the correction on this controlled hero fixture, not general screenshot fidelity. Annotation-to-saved-spec acceptance passed on the controlled fixture; preview refresh remains blocked by the server credential.

## Companion follow-up

Move selected companion audit/history and human-gated knowledge workflows into native Conductor in a separate issue. Preserve original Supabase and local history until verified exports, scope mapping, completeness and recovery checks pass. Keep grading in the plugin, immutable evidence and decisions distinct, and shared publication subject to an explicit human decision. Existing Code Connect mappings must retain actual implementation provenance.

## Send an existing frame to a chosen component

The independent-frame handoff is tracked in [issue 96](https://github.com/JFusco/design-passport/issues/96). It requires one saved Figma Design frame outside a Conductor-bound workspace. Choose **Send existing frame to Conductor**, then an accessible project, deliverable and feature/component. Project membership and the existing plugin policy are checked server-side; an organization administrator can choose projects across that organization. Search narrows bounded destination lists.

The design/variant name starts with the frame name and remains editable. Choose **Default appearance** or **Named variant** independently of the name. Only configured project device targets are offered. The actual Figma width must equal the configured width exactly; no custom width, rounding or automatic resizing is used. A second default for the same component and device target is refused; use a uniquely named variant instead. Existing designs remain unchanged.

A separate confirmation lists the full destination, Design tab, source frame, saved name, appearance, configured breakpoint, message and checked frame annotations. Only confirmation saves. A transaction writes a new design variant, Design discussion entry and immutable annotation evidence. It uses the existing preview and evidence processing and requests no workflow transition. The handoff does not establish approval or enable continuous synchronization. Uncertain saves retain their original request and variant identities for acknowledgement retries, including after the plugin is restarted. Bound Design frames continue using their existing destination flow.

## Connection lifecycle and retry isolation

Conductor is an allowed saved-audit tab; returning from an audit must not invalidate the result. Disconnect remains available throughout existing-frame selection, details and confirmation. Pending handoffs are scoped to the configured origin, owner and Figma file, retaining the original request and variant IDs through retry and legacy-record migration. A reset invalidates pending asynchronous work before another account can submit or display it. Destination changes clear confirmation but preserve entered design details and selected notes for review. Workspace refusals use neutral recovery copy; existing-frame refusals retain their specific width, name and appearance guidance.

## Bound submission recovery across sessions

A definite refusal releases only the matching bound draft so the designer can correct the message or selection. Unknown outcomes retain the original request for acknowledgement. Storage, requests, receipts and success/error presentation are fenced to the captured session and credential owner. Reopening releases an old in-flight latch; only the current operation can release its own submit/loading state. This preserves duplicate protection while an older transport request settles.

Independent review and recheck passed these boundaries with 149 focused tests on October 29. Repository-wide verification, hosted CI and native Figma acceptance remain separate evidence; see the [recovery journal](../journal/2026-10-29-bound-handoff-recovery.md).

## Design changes and durable pending-send resolution

[Issue 100](https://github.com/JFusco/design-passport/issues/100) adds **Send design changes** when the connected server advertises both `design_change` and `resolve_pending_send`. The designer writes a nonblank summary, reviews the exact destination, frame names, variant names, appearance, configured breakpoint and checked notes, then explicitly confirms. If nothing changed, cancel and use Design Notes. Bound frames update their original feature using optimistic variant versions; unbound frames create a new variant with exact width and Default/name uniqueness. First bound submissions display **New design link**. The action never advances workflow or approves a design; ordinary submissions retain their optional workflow actions.

Contract 1.0.0 preserves old payload hashes and exactly three fields in each `context.frames` entry. Optional intent and bound-frame width travel in submissions; sibling `frameDetails` carries display metadata. Pending payloads are loaded before reading the canvas. Dispatch metadata and resolution sidecars persist before transport; terminal acknowledgement persists before cleanup. Recovery is independent of selection and works after restart or frame deletion. Manual resolution confirms that it cannot undo an already saved design. A supporting server returns a saved receipt or records durable cancellation under the same authenticated organization/owner/request lock used by both save paths. Cancellation blocks future saves with that request identity. Receipt details remain hidden after project access removal.

This supersedes the broad refusal/retry guidance above: an older server releases editing only after a proven first-attempt refusal in the same live controller session. Restarted, uncertain or metadata-missing sends remain pending for receipt checks and a server upgrade. A timeout or 404 is never cancellation. Once resolution starts, no design retry is allowed. Storage, callbacks and presentation remain scoped to origin, owner, file and controller epoch.

Applicable roles from the pinned workflow stage retain Conductor inbox notices. Only active, currently authorized role holders who opted into Slack receive external design-change messages. Identity, role and content access are checked before planning and immediately before delivery. No project-channel, Teams, email or automatic comment-mention fan-out is used. Saved-design and Slack outcomes remain separate; outbox keys deduplicate plans and replay, while failed planning/delivery retries independently. Slack can duplicate an external message if it sends successfully and the process crashes before recording acknowledgement; the system does not promise exactly-once delivery.

The prepared Marin tutorial scripts, shot lists and draft captions are in `docs/tutorials/conductor/`. Final footage and synchronized captions belong to [issue 101](https://github.com/JFusco/design-passport/issues/101) after published-plugin and hosted acceptance. Keep connected capability disabled through a mixed-writer rollout. Release the server migration and cancellation guard, verify older writers have drained, then re-enable capability and release the plugin. Retain cancellation enforcement on rollback. See the [implementation journal](../journal/2026-10-29-design-change-handoff.md).

The owner approved one correction to the reviewed plan after implementation source review: the installed server workflow SDK cannot resume ERROR under the same execution ID. Failed notification planning uses deterministic recovery execution IDs while retaining the original saved submission, event/person outbox keys and failed history. This does not repeat a design save or grant a workflow action.

A separate focused October 29 follow-up resolves the saved-confirmation omission found in the first implementation recheck. Shared terminal acknowledgement is the single success presenter and includes the reviewed existing-frame name, Default/named appearance and exact width only for an accessible committed receipt. Cancelled and redacted results retain their safe messages. Parent-controller tests and resumed terminal acknowledgement cover both appearances. The focused run passed independent recheck and 153 tests. On the existing hosted staging build 113330, plugin-free Design Notes, screenshot upload and server Figma import also persisted after reload and rendered successfully, without a workflow transition. This does not verify the updated plugin/server candidate or final recording.
