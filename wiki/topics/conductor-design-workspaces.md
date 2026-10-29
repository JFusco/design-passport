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
