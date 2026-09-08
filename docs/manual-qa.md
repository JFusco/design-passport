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

- Import `manifest.json` in Figma Desktop and confirm light/dark UI.
- Confirm profile page roles are suggestions until saved and no page is moved or renamed.
- Scan one selection and verify all pages load before analysis.
- Cancel during a large page; confirm the partial graph cannot certify.
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
- Change code-relevant geometry/style/content; rebuild context and confirm the old certificate is stale.

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
