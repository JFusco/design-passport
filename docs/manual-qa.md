# Golden fixture and rollout QA

## Build the golden Figma fixture

Create one private test file with these conventional pages. Design Passport should classify them automatically:

1. **Foundations**
   - Local primitive and semantic color/number variables.
   - Desktop, Tablet, and Mobile modes.
   - A few intentionally literal or ambiguously named variables.
2. **Components**
   - A clean canonical component set with descriptions, properties, and dev resources.
   - Plain alias names that can normalize automatically.
   - `CTA`, `Banner`, `Label`, and `Stepper` examples that require confirmation.
   - A detached instance, duplicate variants, generic properties, and three repeated non-component structures.
3. **Screens**
   - One clean family named `Hero / Desktop / 1440`, `Hero / Tablet / 768`, and `Hero / Mobile / 375`.
   - A colliding family, a wholly unbound tier, one no-signal frame, spacer layers, opaque groups, default names, and literal styling.
   - Solid-background contrast passes/failures, a gradient/image background, a 20×20 target, and a 40×40 target.

Mark intended source frames with a normal source annotation. Add named export assets and one unnamed/default export failure.

## Manual verification checklist

The primary designer journey is **choose a target → audit → review Findings → apply previewed cleanup → automatic rescan → resolve only the remaining human decisions in Figma → re-audit → certify when ready**. Audit setup is not a routine step in this journey.

- Run the organization-published **Design Passport** from Figma Resources and confirm light/dark UI in both Design and Dev Mode.
- Separately, import `manifest.json` only when smoke-testing an unreleased local build; confirm it launches from **Plugins → Development**.
- On first run with conventional page names, verify there is no Profile tab or setup gate and a Current page audit can start immediately. Confirm automatic classification does not move or rename a page.
- Open the secondary **Audit setup** link and verify the status is Ready, manual choices are collapsed under Advanced, and Product/Library terminology is absent from the normal audit journey.
- With an existing report, make one valid unsaved advanced setup edit and verify scans, context rebuild, cleanup, certification, learning contribution, and exports remain disabled while the prior report stays readable.
- Make the draft semantically invalid by switching to Product without a Screens page; verify the error appears inline, Save is disabled, and no global runtime error appears.
- Discard a configured draft and verify the committed settings and prior report remain available. In a file automatic classification cannot resolve, verify Audit setup opens with one recommended action when the suggestion is valid and otherwise explains the exact manual decision required.
- Try duplicate page roles, duplicate breakpoint names or widths, blank/whitespace names, and invalid widths; verify each problem is explained inline.
- Delete a mapped page, then attempt an audit; verify the mapping is removed, Audit setup opens with a typed recovery explanation, and explicit confirmation is required before the audit can run.
- Add, remove, or rename pages after a successful audit and verify topology changes invalidate or rebuild whole-file knowledge without persisting a draft.
- Load stored profiles created by version 0.1.0 with both values of its removed optional integration flag; verify unrelated page roles, token collections, and breakpoints survive and the new shape is persisted only after Save.
- Scan one selection and verify all pages load before analysis.
- Cancel during a large page; confirm the partial graph cannot certify.
- Inspect Context inventory for page roles, canonical/novel patterns, component use counts, responsive families, token collections, and repeated structures.
- Use every finding’s node link across multiple pages.
- Confirm default-name percentages against a manual count.
- Confirm B at 85% token coverage and A at 95%.
- Confirm each hard blocker prevents readiness.
- Preview and apply low-risk cleanup; verify one undo group and idempotent rescan.
- Apply inferred Auto Layout that stays within 0.5 px; verify success and clone cleanup.
- Try a 0.51 px geometry change or introduced overlap/clipping; verify rollback.
- Deny version-history access; verify structural work requires the undo-only acknowledgement.
- Create a semantic token from three repeated values in an existing local collection.
- Verify `Fix all` never performs unconfirmed component conversion or contextual alias resolution.
- Rescan after cleanup; verify report export uses only post-cleanup evidence.
- Certify a B/A source; inspect annotation, relaunch action, and compact shared data.
- Certify a component set with legacy child coverage notes; confirm one concise root note remains, unrelated child annotations survive, the removal count is reported, and a repeat certification removes zero.
- Expand the certified set in Modules; confirm direct variants and descendant finding counts remain visible and selecting a variant applies the exact Findings filter.
- Change code-relevant geometry/style/content; rebuild context and confirm the old certificate is stale.

## Disposable end-to-end stress fixture

- Create a temporary page containing one top-level frame with missing source annotation, literal style values, a whitespace-damaged name, a Figma-default layer name, a spacer layer, clipping, and aligned absolute-positioned children that Figma can infer as Auto Layout.
- Run Current page without opening Audit setup. Verify whole-file indexing completes and the findings include automatic, guarded, structural, and manual categories with node links.
- Apply safe and guarded cleanup. Verify each risk group is a separate undo group, the whole file rescans once, the automatic name/annotation findings clear, and the score improves.
- Apply inferred Auto Layout. Verify clone validation and a version-history checkpoint occur before the source changes, delayed temporary-clone events do not invalidate the rescan, and any newly measurable token fields appear as a follow-up guarded plan.
- Apply that follow-up and verify Cleanup reports no previewable plan while manual findings remain in Findings.
- Resolve the manual spacer and default-name findings directly in Figma. Verify the old report becomes stale, export/certification are disabled, and a new audit clears those findings.
- If the fixture reaches B/ready, certify twice and verify exactly one grade annotation, one source marker, and current ruleset/catalog/snapshot metadata remain.
- Delete the temporary page and verify the original page count and a normal current-page audit are restored. Never publish the development plugin during this test.

## Project guidance and knowledge-loop scenarios

- With no project pack, run an audit and verify standard Passport findings continue while Context says no style guide is connected.
- Import a valid `style-guide` pack in Design Mode; verify version and digest in Context and results, then restart the plugin and confirm the binding remains available to the file.
- Open a different Figma file and confirm the previous file's project guidance is never reused.
- Duplicate a bound file and verify the inherited fingerprint is rejected.
- In Dev Mode, confirm the pack is readable and its advisories render, but import, replace, and remove controls are unavailable.
- Attempt wrong-role, malformed, unsafe, digest-invalid, and >90 KB replacements; verify the prior valid binding remains active.
- Add a `reference` pack, verify its suggestions are labeled inspiration and do not survive a plugin restart.
- In an unsaved file with no stable key, verify a `style-guide` pack can be used for the session but cannot be connected permanently.
- Deep-compare exported report and certification fields before and after loading zero, one, and multiple advisory packs.
- Verify each applicable guidance card navigates to its target layer and is visually distinct from Passport findings.
- Preview a learning contribution; verify the designer sees normalized dates, short references, observation counts, and excluded-data categories without raw JSON. Cancel and confirm no file is exported.
- Inspect the exported machine-readable envelope during maintainer QA and verify it contains none of the excluded fields.
- Preview again, export, import it through the companion twice, and verify the second import adds zero unique contributions.
- Open Knowledge Review, edit generated wording, and verify the digest changes and an earlier approval no longer compiles.
- Exercise Approve, Reject, and Defer; verify only a current explicit approval enters a pack.
- Approve project-only guidance and verify it never enters the shared release. Explicitly approve a client-neutral candidate as shared and verify it enters the pinned team pack only after the repository build/review flow.
- Combine one, two, and 100 duplicate/unique envelopes; verify the interface reports only neutral `unique contributions`, supporting evidence, and contradictory evidence—never confidence, eligibility, ranking, `observed`, `corroborated`, or `conflicted` state.

## Performance checks

Automated fixtures exercise pure indexing at 10,000 and 50,000 nodes. In Figma, repeat with realistic instances and variables while confirming:

- progress updates at least once per page and during large traversal;
- cancellation remains responsive;
- selection scans use the complete cached graph when it is fresh;
- document changes invalidate the cache;
- invisible instance children remain skipped.

## Pilot

Run the golden fixture first, then one design-system file, one current product file, and one legacy file. Review false positives with the design-system owner before changing `RULESET_VERSION` from beta to `1.0.0`.

Catalog upgrades require an explicit `package.json` version change, lockfile review, `pnpm catalog:sync`, and review of the generated catalog diff. Never add a runtime `latest` lookup.
