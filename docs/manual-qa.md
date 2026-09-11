# Golden fixture and rollout QA

## Build the golden Figma fixture

Create one private test file with these pages and confirm them in the plugin profile:

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

- Run the organization-published **Design Passport** from Figma Resources and confirm light/dark UI in both Design and Dev Mode.
- Separately, import `manifest.json` only when smoke-testing an unreleased local build; confirm it launches from **Plugins → Development**.
- Confirm profile page roles are suggestions until saved and no page is moved or renamed.
- Run **Audit selection** separately with a frame, component, and component set; confirm each is accepted as an audit root. Try an empty selection, an unsupported root, and a mixed supported/unsupported selection; confirm the action is disabled with guidance to select only frames, components, or component sets.
- Start a cold selection audit and verify the target-first headline remains `Auditing selection (N)` while the secondary status explains that supporting file context is being prepared and only the selection will be graded. Confirm raw page names, node counts, knowledge-graph terminology, and a resetting determinate progress bar never appear. Switch tabs and confirm panel commands remain visibly locked while the audit runs, with Cancel still available during context preparation.
- Trigger success, notice, stale, and error notifications and confirm each uses the same horizontal inset and leaves a visible gap from the tab row, progress status, and adjacent panel content at desktop and narrow plugin widths.
- While that cold audit is preparing context, change both the Figma selection and current page. Confirm the in-flight audit remains bound to the original target count and names, and its results grade only those captured roots.
- Cancel during cold file-context preparation; confirm it returns to a neutral recoverable state, no partial graph can certify or export, and a later audit succeeds. Also cancel an automatic post-cleanup rescan and confirm the completed cleanup remains applied.
- Rerun the same selection while its complete graph is fresh; confirm the cached audit proceeds directly to target analysis, retains the captured selection, and does not rebuild file context.
- After a selection or current-page report becomes stale, change the live selection or current page before choosing **Refresh audit to certify** or **Rebuild context**. Confirm the refreshed report still names and grades the previously captured target.
- Inspect Context inventory for page roles, canonical/novel patterns, component use counts, responsive families, token collections, and repeated structures.
- Use every finding’s node link across multiple pages.
- Confirm default-name percentages against a manual count.
- Confirm B at 85% token coverage and A at 95%.
- Confirm each hard blocker prevents readiness.
- Import valid, wrong-file, malformed, oversized, and hostile Code Connect parse JSON.
- Confirm no template or source path appears in the UI/report.
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

- cold scans keep the selected target prominent while supporting-context status updates during page traversal and large traversal;
- cancellation remains responsive during supporting-context traversal;
- selection scans use the complete cached graph when it is fresh and skip context rebuilding;
- changing the selection or current page mid-scan never retargets the in-flight audit;
- document changes invalidate the cache;
- invisible instance children remain skipped.

## Pilot

Run the golden fixture first, then one design-system file, one current product file, and one legacy file. Review false positives with the design-system owner before changing `RULESET_VERSION` from beta to `1.0.0`.

Catalog upgrades require an explicit `package.json` version change, lockfile review, `pnpm catalog:sync`, and review of the generated catalog diff. Never add a runtime `latest` lookup.
