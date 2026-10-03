---
topics: [design-passport-architecture, design-readiness-standard, whole-file-design-knowledge, figma-runtime-qa]
---

# Mutation safety and audit readiness

## Cleanup policy

Findings are converted into typed, previewable operations and separated into automatic, guarded, and manual work. “Fix all available” may apply safe and guarded plans, but contextual naming, ambiguous token mappings, responsive restructuring, and high-risk component conversion remain individually confirmed or manual.

Structural work first requests the version-history checkpoint `Before Design Passport cleanup`. If unavailable, it requires explicit undo-only acknowledgement. Each approved risk group receives its own Figma undo boundary. Failed postconditions trigger immediate rollback.

Inferred Auto Layout is tested on a temporary clone. Child order must remain stable, no overlap or clipping may appear, and every measured geometry bound must remain within 0.5 px. The plugin never deletes content, moves pages, enables libraries, guesses semantic mappings, or destructively replaces detached instances.

Whole-library structural cleanup validates proposals component by component, commits every accepted proposal in its own undo group, rejects unsafe proposals without touching the source, and performs one fresh scan after the batch. Clone preflight runs before opening the source mutation transaction: a failed clone must never trigger undo, because doing so can unwind an earlier accepted component. Both single-plan and batch structural paths require full recapture after mutation. Local plugin-data-only events are exempt; annotation, visual, remote, and unknown changes invalidate knowledge.

Repeated literals can open a semantic token wizard only after three matches. The designer must choose an existing local collection and a slash-separated semantic name. A unique compatible inferred variable may be guarded; multiple matches remain manual.

Before binding any variable to a text field, the mutation runtime loads every font used by the node's styled text segments and deduplicates those font requests. This allows large guarded binding batches to remain atomic instead of failing at the first unloaded mixed-font text node.

## Waivers

Waivers require an inline reason and remain score deductions. The Figma plugin sandbox did not reliably support `window.prompt`, so waiver capture is an explicit React form with blank-state validation, cancel, apply, and remove actions.

## Audit readiness and retired certification

As of plugin `0.5.0` / ruleset `1.0.0-beta.5`, designers aim for B or better and a ready result. There is no separate certification or approval action. Readiness still requires complete whole-file knowledge, no hard blockers, and no unresolved scoring-critical reviews. Every audited frame must pass; component sets remain one graded root with variant and descendant attribution.

The controller rejects old certification messages as unsupported. Historical `set-certification` operations remain in schemas, types, and planner ordering for readability. Execution rejects the entire operation list before clone preflight, checkpoints, Undo, transaction markers, or metadata writes. Batch execution scans every approved plan before its first operation or shared structural checkpoint.

Certificate summaries, raw capture inputs, and cached fragments retain their old shape. Certificate-prefix filtering still prevents legacy grade stamps from satisfying the source-annotation rule. Fresh grading no longer consumes certificates. Removing the formerly scored freshness rule can raise or lower new scores; grade thresholds, weights, coverage caps, policies, and waivers are unchanged.

No migration or cleanup runs. Stored report findings, grades, hashes, timestamps, and provenance remain unchanged. Certificate strings, source markers, grade notes, variant notes, and node relaunch maps stay intact. Removing the command from both manifests hides its buttons under [Figma's relaunch contract](https://developers.figma.com/docs/plugins/api/properties/nodes-setrelaunchdata/).

Unsaved or invalid audit setup still blocks audits, cleanup, contribution, and current exports. Historical exports remain available. Serialization, dirty-node tracking, resource verification, structural recapture, scan locks, and Dev Mode restrictions remain in force for surviving commands.

The [retirement journal](../journal/2026-10-03-retire-certification.md) records implementation and verification. Earlier certification records remain historical evidence. Merging and publication are separate; the published certification guard stays until a separately reviewed release replaces it.
