---
topics: [design-readiness-standard, figma-runtime-qa, mutation-certification-safety, whole-file-design-knowledge]
plans: [2026-09-08-figma-ai-ready-plugin-b69ce15884.md]
---

# Live page and frame readiness stress test

## Change

Ran Design Passport end to end on both a selected Button — Light source frame and its full Figma page. Applied the plugin's low-risk and guarded cleanup plans, created designer-named semantic variables through the token wizard, rescanned from fresh whole-file knowledge, and certified all three passing page source frames.

The stress run exposed a false accessibility failure: disabled button labels were being measured against active-text contrast thresholds. The rule engine now derives inactive state from structured properties on placed instances or exact variant-name assignments on component definitions, follows component ancestry, and excludes only those inactive text and target layers. Parsing and ancestry live in a pure operation separate from accessibility scoring.

## Evidence

- Selected frame: D/68.9 and 262 findings before cleanup; B/82.6, ready, and certified after cleanup and the rule correction.
- Current page: C/77.0 and 527 findings before cleanup; B/81.8, ready, and 86 findings after 421 planned operations plus the 11-use semantic token binding. All three source frames independently passed at B with zero blockers.
- Token evidence: Documentation reached 199/225 bindings (88.4%), Main components 460/515 (89.3%), and Interaction states 583/638 (91.4%).
- Certification evidence: shared metadata and matching annotations were read back from source frame IDs `18:2`, `26:34`, and `347:3`; a final selected-frame audit remained B/81.8 and ready.
- Mutation safety: 197 selected-frame operations and 421 page operations were committed in risk-separated undo groups; no page moves, deletes, or unconfirmed structural conversions occurred.
- Automated verification: the focused post-hardening run passed 21 test files and 105 tests plus TypeScript and production builds; the final `pnpm verify:ci` remains the release gate.

## Rationale

The readiness result must reflect implementable active states without penalizing designs for WCAG-defined inactive controls. It must also expose the weakest source frame in page/file scans so broad averages cannot conceal an unready artifact.

## Whole-library component pass

Expanded the stress test to all 122 source targets in UI Design Library. The cleanup now validates inferred Auto Layout one component at a time and then performs one full rescan. The run applied 13,077 safe or guarded binding operations and accepted 39 of 75 structural proposals; the remaining 36 failed the 0.5 px geometry, overlap, or clipping postconditions and were left unchanged.

The run exposed and fixed a transaction-order defect: failed clone validation previously invoked undo before any source mutation, which could unwind a previously accepted component group. Clone validation now precedes the source transaction, every accepted structural plan retains an isolated undo boundary, and batch-local clone changes do not falsely stale the graph.

The calibration also found two rubric defects. An explicitly approved `Semantic ...` variable collection was not recognized as semantic unless each variable path matched a narrow name expression, and metadata scoring demanded 100% coverage. Collection semantics now count directly and metadata passes at 95%. The correction raised token-foundation quality from 62.5 to 100 while preserving the 85% token-application threshold for B.

The calibrated final report is D/58.9 at the weakest source target, with 23 B, 92 C, and 7 D targets. Of 30 distinct component or component-set roots, 2 are B, 25 are C, and 3 are D. Actionable findings fell from the 16,056 baseline to 2,103. The remaining dominant work requires design intent: 547 repeated-literal token decisions, 487 repeated-component boundary decisions, 235 novel naming decisions, 37 active contrast corrections, and 36 structurally unsafe inferred layouts. These findings were not waived or auto-mutated to manufacture a passing grade.

Automated verification passed 22 test files and 112 tests, TypeScript checks, and the production build. The exported evidence is `UI-Design-Library.ai-readiness.calibrated-final.json`.

## Page and component traceability pass

Added a dedicated Modules result view that groups every audited root beneath its Figma page and shows its independent grade, issue count, weakest axes, and most frequent rules. A module can navigate directly to the Figma node or open Findings already filtered to that page and root. Findings also gained explicit page and component filters, and JSON/Markdown exports now retain page name, page ID, root name, and root type. This preserves the full-file scan while making ownership and remediation source clear.

The live Search input component set was used as a focused proving ground. Eight generic internal node names were replaced with semantic names, the `state` property values were normalized to `empty` and `filled`, and six semantic typography/icon variables were created and applied without changing geometry. Its independent component-set result moved from D/61.9 to B/89.9.

The full-library follow-up successfully applied 1,970 guarded semantic bindings in a single undo group after the text mutation path was hardened to load styled fonts. Findings fell from 4,052 pre-application items to 1,817 after the fresh whole-file rescan. The temporary increase came from newly created exact-match semantic variables exposing safe binding opportunities throughout the file, not from a design regression.

The same run exposed rubric cliffs rather than design defects. Code Connect is now optional and non-scoring unless the profile explicitly requires it. Exact `state` and `variant` property names and readable human-facing variant values are accepted, while numbered defaults remain rejected. Geometry-only icon assemblies no longer count against Auto Layout coverage. Transparent components no longer inherit an invented white canvas for contrast measurement, compound disabled states are exempt, the B token target aligns to 80%, and sub-target token coverage is handled by the already-weighted token axis instead of a second hard C cap. The 95% A cap remains.

Automated verification after the calibration passed 22 test files and 118 tests, TypeScript checks, schema/catalog checks, wiki integrity, and production builds. The pre-calibration hierarchical export is `UI-Design-Library.ai-readiness.per-component-final.json`; it records the successful binding pass and supplies the measured baseline for the final rubric verification.

## Final component verification

The final component-boundary correction stops contrast background discovery at a transparent component, component-set, or instance boundary. This prevents an authoring canvas outside the reusable component from being mistaken for its guaranteed runtime surface. Focused tests cover both the unresolved transparent case and a solid surface inside the component boundary.

The last genuine component issue was three generic `Vector` names inside `Carousel / Multi-card peek`. They were renamed to `Next chevron` and `Previous chevron`; read-back confirmed that position and dimensions were unchanged.

The final fresh full-file scan graded all 32 actual `COMPONENT` and `COMPONENT_SET` roots at B or higher: 3 A, 29 B, and 0 below B. The lowest component is Toast at 81.0, followed by Badge at 81.3 and Datepicker at 81.4. The overall source-frame report remains D/58.9 because it intentionally includes documentation and specimen frames as separate modules; this no longer obscures the passing reusable-component result. The definitive export is `UI-Design-Library.ai-readiness.all-components-B-verified.json`, with 1,957 actionable review/failure items across all source frames.

Automated verification passed 23 test files and 120 tests, TypeScript checks, schema/catalog checks, wiki integrity, and production builds.

## Component annotation backfill

The passing component grades were initially present in the report but not visible as Figma annotations. Certification had only one whole-scope action, and the D-rated documentation/specimen scope correctly prevented that action even though all reusable components independently passed. The plugin now exposes a separate `Certify components` action for passing `COMPONENT` and `COMPONENT_SET` roots while preserving the stricter source-frame certification gate.

The first live component-certification attempt also revealed that non-scoring critical reviews were still treated as blockers. Readiness now ignores unresolved items only when they explicitly declare `scoreImpact: false`; the findings remain visible. This allowed transparent-runtime-surface contrast reviews to stay honest without blocking an otherwise passing component.

The live batch certified all 32 component roots. Programmatic read-back confirmed 32 `AI source frame` markers, 32 `[Design Passport] Grade ...` annotations, and 32 matching shared certification records, with 3 A and 29 B grades and no missing nodes or notes. Automated verification passed 23 test files and 122 tests, TypeScript checks, schema/catalog checks, wiki integrity, and the production build.
