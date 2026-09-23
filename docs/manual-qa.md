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

- Run the organization-published **Design Passport** from Figma Resources and confirm light/dark UI in both Design and Dev Mode. Confirm its footer identifies `Plugin 0.4.0 · Ruleset 1.0.0-beta.4 · <build SHA> · Production`.
- Separately, import `development/manifest.json` when smoke-testing an unreleased local build; confirm **Design Passport (Development)** launches from **Plugins → Development**, shows its persistent warning, uses a distinct plugin ID, and identifies the Development channel. Its own manifest directory prevents Figma from deduplicating it with a root-manifest registration. Never import the production manifest for local development.
- On first run with conventional page names, verify there is no Profile tab or setup gate and a Current page audit can start immediately. Confirm automatic classification does not move or rename a page.
- Open the secondary **Audit setup** link and verify the status is Ready, manual choices are collapsed under Advanced, and Product/Library terminology is absent from the normal audit journey.
- With an existing report, make one valid unsaved advanced setup edit and verify scans, context rebuild, cleanup, certification, learning contribution, and current-report exports remain disabled while the prior report stays readable. Restored historical reports remain exportable.
- Make the draft semantically invalid by switching to Product without a Screens page; verify the error appears inline, Save is disabled, and no global runtime error appears.
- Discard a configured draft and verify the committed settings and prior report remain available. In a file automatic classification cannot resolve, verify Audit setup opens with one recommended action when the suggestion is valid and otherwise explains the exact manual decision required.
- Try duplicate page roles, duplicate breakpoint names or widths, blank/whitespace names, and invalid widths; verify each problem is explained inline.
- Delete a mapped page, then attempt an audit; verify the mapping is removed, Audit setup opens with a typed recovery explanation, and explicit confirmation is required before the audit can run.
- Add, remove, or rename pages after a successful audit and verify topology changes invalidate or rebuild whole-file knowledge without persisting a draft.
- Load stored profiles created by version 0.1.0 with both values of its removed optional integration flag; verify unrelated page roles, token collections, and breakpoints survive and the new shape is persisted only after Save.
- Run **Audit selection** separately with a frame, component, and component set; confirm each is accepted as an audit root. Try an empty selection, an unsupported root, and a mixed supported/unsupported selection; confirm the action is disabled with guidance to select only frames, components, or component sets.
- Start a cold selection audit and verify the target-first headline remains `Auditing selection (N)` while the secondary status explains that supporting file context is being prepared and only the selection will be graded. Confirm raw page names, node counts, knowledge-graph terminology, and a resetting determinate progress bar never appear. Existing results remain browsable, while audit, mutation, and setup commands remain locked; Cancel stays available during context preparation.
- Trigger success, notice, stale, and error notifications and confirm each uses the same horizontal inset and leaves a visible gap from the tab row, progress status, and adjacent panel content at desktop and narrow plugin widths.
- While that cold audit is preparing context, change both the Figma selection and current page. Confirm the in-flight audit remains bound to the original target count and names, and its results grade only those captured roots.
- Cancel during cold file-context preparation; confirm it returns to a neutral recoverable state, no partial graph produces a current report or certification, and a later audit succeeds. Previous completed results remain available for historical export. Also cancel an automatic post-cleanup rescan and confirm the completed cleanup remains applied.
- Rerun the same selection while its complete graph is fresh; confirm the cached audit proceeds directly to target analysis, retains the captured selection, and does not rebuild file context.
- After a selection or current-page report becomes stale, change the live selection or current page before choosing **Refresh audit to certify** or **Rebuild context**. Confirm the refreshed report still names and grades the previously captured target.
- Inspect Context inventory for page roles, canonical/novel patterns, component use counts, responsive families, token collections, and repeated structures.
- Inspect the token-coverage ledger and reconcile the score to `bound + inherited + missing`; verify ignored evidence is excluded, a zero denominator says **Not applicable**, persisted groups cap samples at 50, and a current result pages through every live match.
- Verify invisible strokes, zero defaults, hidden layers, per-corner bindings, percentage/AUTO line height, percentage letter spacing, non-overridden instance values, and documentation scaffolding land in the expected ledger bucket.
- Verify `padding/xs`, `stack/md`, and `layout/gutter` are accepted as semantic names while literal names remain findings.
- On a mapped Components page, select an unmarked documentation wrapper and confirm the audit targets its nested top-level component sources with a scope notice. Confirm an `AI source frame` marker includes the wrapper and a product-screen selection remains exact.
- Exercise every team-convention mode. Required may affect grade/readiness; Advisory and Off must not. Off emits one not-applicable summary. Locked rules remain configurable only by code.
- Mark and clear an intentional standalone detachment; confirm acknowledgement is bound to that exact node ID. Verify token-bound, `FILL`, and growing empty spacers pass while a fixed unbound spacer is advisory. Missing external documentation links never create findings.
- With available variable collections but no approved collection, verify the setup finding explains that approval is missing and opens Audit Setup.
- Use every finding’s node link across multiple pages.
- Confirm default-name percentages against a manual count.
- Confirm B at 80% token coverage and A at 95%.
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
- Resolve the manual spacer and default-name findings directly in Figma. Verify the old report becomes stale, certification is disabled, historical export stays available, and a new audit clears those findings.
- If the fixture reaches B/ready, certify twice and verify exactly one grade annotation, one source marker, and current ruleset/catalog/snapshot metadata remain.
- Delete the temporary page and verify the original page count and a normal current-page audit are restored. Never publish the development plugin during this test.

## Project guidance and knowledge-loop scenarios

- With no project pack, run an audit and verify standard Passport findings continue while Context says no style guide is connected.
- Import a valid `style-guide` pack in Design Mode; verify version and digest in Context and results, then restart the plugin and confirm the binding remains available to the file.
- Open a different Figma file and confirm the previous file's project guidance is never reused.
- Duplicate a bound file and verify the inherited fingerprint is rejected.
- In Dev Mode, confirm the pack is readable and its advisories render, but import, replace, and remove controls are unavailable.
- Attempt wrong-role, malformed, unsafe, digest-invalid, and >90 KB replacements; verify the prior valid binding remains active.
- Add a `reference` pack and verify its suggestions are labeled inspiration. After restarting, the active session pack is gone; previously saved advisory insights remain visible only as historical content.
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

- cold scans keep the selected target prominent while supporting-context status updates during page traversal and large traversal;
- cancellation remains responsive during supporting-context traversal;
- selection scans use the complete cached graph when it is fresh and skip context rebuilding;
- changing the selection or current page mid-scan never retargets the in-flight audit;
- document changes invalidate the cache;
- invisible instance children remain skipped.

## Persistent audit and batch QA

- Complete a page audit and confirm Saved appears before closing. Open another plugin, close it, reopen Passport, and confirm the same timestamp, findings, grade, active tab, filters, and expanded finding return without a context build.
- Repeat with a component, component set, multi-node selection, and source-frame audit. Switch pages/selections before reopening and verify the saved captured target remains authoritative. A fresh audit of a different target must reset incompatible finding filters.
- Edit the design while Passport is closed. Reopen and verify the previous report remains readable as historical, cleanup/waivers/contributions/certification are disabled, and an explicit refresh verifies the current design before publishing a current report.
- While that refresh runs, navigate a historical finding and export historical JSON/Markdown. Navigate a deleted node and verify the error does not unlock mutation controls or stop the ongoing refresh.
- In Dev Mode and with invalid/unsaved current setup, historical navigation and export remain usable. JSON is a versioned historical envelope; Markdown prominently marks its timestamp and unverified current design. Current report exports retain their original contract.
- Change the profile or rule version and confirm supported saved reports retain original provenance. Save or invalidate setup after a failed report save and verify the unsaved report remains browsable and exportable as historical. Session reference packs clear on reopening; historical advisories remain visible and cannot be contributed without refresh.
- Open a different file and confirm no results cross file boundaries. Test absent fileKey, local quota failure, malformed records, unsuccessful replacement, and file-cache clearing. Verify explicit Not saved/session-only states and preservation of the last completed result after failed replacement.
- Run Review pages with a 65-page checklist, empty pages, and mixed page roles. Verify one context preparation, page-specific results, skip counts, and preservation of completed results on cancellation. Change the file during a batch and verify it stops without silently rebuilding or certifying old context.
- Fail a batch page's save and verify the batch stops immediately, that page remains open for export, and previous saved pages remain available. Session-only files cannot start a batch. If an unsaved single report becomes stale, its historical export remains available without another audit.

### Runtime performance measurement

Use a disposable golden fixture plus a representative large design-system file. Capture local `[Design Passport]` console timings and page/node counts for: first audit; another page in the same session; close/reopen plus explicit refresh; one component edit plus refresh; and a 65-page batch. Repeat three times and report medians alongside file size and runtime version. Separate report restoration time from verified-audit time.

Compare against the main-branch development build on the same unchanged file, and verify findings/grades match. Cached and forced-full adapter paths have automated parity checks; the synthetic `node scripts/benchmark-context-cache.mjs 65 30` command checks fragment reuse and prints timings without Figma bridge overhead. A synthetic cache hit is not proof of an overall speedup. Record real runtime measurements before making speed claims.

Recorded evidence for issue [JFusco/design-passport#21](https://github.com/JFusco/design-passport/issues/21): [acceptance scenarios](benchmarks/persistent-audits-acceptance.md) and [native runtime measurements](benchmarks/persistent-audits.md). These records distinguish automated fault injection, native behavior, and measured performance.

## Pilot

Run the golden fixture first, then one design-system file, one current product file, and one legacy file. Review false positives with the design-system owner before changing `RULESET_VERSION` from beta to `1.0.0`.

Catalog upgrades require an explicit `package.json` version change, lockfile review, `pnpm catalog:sync`, and review of the generated catalog diff. Never add a runtime `latest` lookup.

## Production release verification

- Preserve the previous verified production bundle before rebuilding. Run `pnpm verify`, record the Development controller/UI hashes, then run `pnpm build:release`; record production hashes and the exact embedded Git SHA, and confirm the files under `development/dist/` were not changed by the release build.
- Publish only through the existing organization plugin record. Do not publish **Design Passport (Development)**.
- With two non-publisher organization accounts, launch **Design Passport** from Resources without reinstalling and verify the announced Production identity, ruleset, and build SHA. Close and reopen any plugin window that was already running.
- Confirm a Development certificate is visibly non-production and cannot be mistaken for the published result. Restore report schemas 1–2, profile v1, and certificate v1 as historical evidence without rewriting them.
- If a release regression is found, republish the preserved prior verified bundle to the same production record and announce the rollback identity.
