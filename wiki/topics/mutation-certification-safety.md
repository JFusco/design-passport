---
topics: [design-passport-architecture, design-readiness-standard, whole-file-design-knowledge, figma-runtime-qa]
---

# Mutation and certification safety

## Cleanup policy

Findings are converted into typed, previewable operations and separated into automatic, guarded, and manual work. “Fix all available” may apply safe and guarded plans, but contextual naming, ambiguous token mappings, responsive restructuring, and high-risk component conversion remain individually confirmed or manual.

Structural work first requests the version-history checkpoint `Before Design Passport cleanup`. If unavailable, it requires explicit undo-only acknowledgement. Each approved risk group receives its own Figma undo boundary. Failed postconditions trigger immediate rollback.

Inferred Auto Layout is tested on a temporary clone. Child order must remain stable, no overlap or clipping may appear, and every measured geometry bound must remain within 0.5 px. The plugin never deletes content, moves pages, enables libraries, guesses semantic mappings, or destructively replaces detached instances.

Repeated literals can open a semantic token wizard only after three matches. The designer must choose an existing local collection and a slash-separated semantic name. A unique compatible inferred variable may be guarded; multiple matches remain manual.

## Waivers

Waivers require an inline reason and remain score deductions. The Figma plugin sandbox did not reliably support `window.prompt`, so waiver capture is an explicit React form with blank-state validation, cancel, apply, and remove actions.

## Certification

Certification requires a fresh complete graph and a passing independent source-frame report. It writes a concise annotation, compact shared metadata, and a relaunch action containing grade, ruleset and catalog versions, timestamp, and snapshot hash. Full findings, sensitive content, and Code Connect source paths are not stored in shared plugin data.

After cleanup, certification and exports always use the post-change rescan. See [runtime QA](./figma-runtime-qa.md) for the verified score improvement and relaunch path.
