---
topics: [design-passport-architecture, design-readiness-standard, whole-file-design-knowledge, figma-runtime-qa]
---

# Mutation and certification safety

## Cleanup policy

Findings are converted into typed, previewable operations and separated into automatic, guarded, and manual work. “Fix all available” may apply safe and guarded plans, but contextual naming, ambiguous token mappings, responsive restructuring, and high-risk component conversion remain individually confirmed or manual.

Structural work first requests the version-history checkpoint `Before Design Passport cleanup`. If unavailable, it requires explicit undo-only acknowledgement. Each approved risk group receives its own Figma undo boundary. Failed postconditions trigger immediate rollback.

Inferred Auto Layout is tested on a temporary clone. Child order must remain stable, no overlap or clipping may appear, and every measured geometry bound must remain within 0.5 px. The plugin never deletes content, moves pages, enables libraries, guesses semantic mappings, or destructively replaces detached instances.

Whole-library structural cleanup validates proposals component by component, commits every accepted proposal in its own undo group, rejects unsafe proposals without touching the source, and performs one fresh scan after the batch. Clone preflight runs before opening the source mutation transaction: a failed clone must never trigger undo, because doing so can unwind an earlier accepted component. Transient clone document-change events are ignored only locally; remote changes still invalidate the snapshot.

Repeated literals can open a semantic token wizard only after three matches. The designer must choose an existing local collection and a slash-separated semantic name. A unique compatible inferred variable may be guarded; multiple matches remain manual.

Before binding any variable to a text field, the mutation runtime loads every font used by the node's styled text segments and deduplicates those font requests. This allows large guarded binding batches to remain atomic instead of failing at the first unloaded mixed-font text node.

## Waivers

Waivers require an inline reason and remain score deductions. The Figma plugin sandbox did not reliably support `window.prompt`, so waiver capture is an explicit React form with blank-state validation, cancel, apply, and remove actions.

## Certification

Certification requires a fresh complete graph and a passing independent source-frame report. It writes a concise annotation, compact shared metadata, and a relaunch action containing grade, ruleset and catalog versions, timestamp, and snapshot hash. Full findings, sensitive content, and Code Connect source paths are not stored in shared plugin data.

Source-frame and reusable-component certification are separate actions. Source-frame certification retains the whole-scope readiness gate; component certification considers only actual `COMPONENT` and `COMPONENT_SET` roots from the fresh scan and stamps each independently passing A or B root. This lets a healthy component library be certified even when documentation or specimen frames keep the broader file report below B.

Every certification writes both the `AI source frame` marker and the `[Design Passport] Grade ...` annotation without duplicating the source marker. Compact certification metadata is stored on the same node. A needs-review item marked `scoreImpact: false` remains visible but cannot block readiness or certification; this is especially important for contrast that cannot be resolved until a transparent component is placed on a runtime surface.

For component sets, the set remains the sole independently graded and certified source root. Its certificate states how many direct variants the aggregate grade covers. Each direct child variant receives a separate coverage annotation naming the parent set and explicitly saying that the child was covered, not independently graded; child nodes do not receive copied certification metadata or an `AI source frame` marker. This prevents a parent B from being misrepresented as an independent B for every variant while making the traversal visible in Figma.

After cleanup, certification and exports always use the post-change rescan. See [runtime QA](./figma-runtime-qa.md) for the verified score improvement and relaunch path.
