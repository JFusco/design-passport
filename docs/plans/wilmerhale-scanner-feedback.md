# Plan: make the scanner useful during design-system maintenance

Date: 2026-09-14  
Status: Proposed; implementation has not started.  
Basis: The designer's seven-part WilmerHale feedback, current source and tests, and official WCAG/Figma references. The designer's Figma file and installed plugin build have not been inspected.

Planning validation: 57 existing tests passed across property eligibility, variable compatibility, background resolution, interaction state, scan lifecycle, session state, grading and UI operations. Wiki integrity also passed. These establish the current baseline; they do not validate the proposed changes or reproduce the designer's file.

The intended outcome is a shorter, clearer **find → understand → fix → verify** loop. A designer should see actionable problems in rendered properties, understand where each problem originates, make one appropriate source change, and verify it without rebuilding unrelated file context.

Treat scan performance and finding quality as parallel workstreams. Begin measuring incremental refresh immediately while shipping bounded correctness improvements. Source grouping depends on reliable property ownership; targeted issue rechecks depend on both grouping identity and reliable refresh.

## What the feedback reveals in the current implementation

| Designer feedback | Current behavior | Work needed |
| --- | --- | --- |
| 1. Repeated full scans | An unchanged session graph can be reused, but document changes mark the whole graph dirty. Refresh Audit and post-fix scans force a rebuild. | Track changes and their dependencies; refresh the existing complete graph; add explicit component/issue rechecks and full rescan. |
| 2. Irrelevant properties | Coverage already excludes unbound zero numeric defaults and requires a visible stroke for stroke weight. Inference uses a separate path; radius lacks rendered relevance checks. | One property assessment shared by scoring, suggestions, and repair validation. Account for opacity, clipping/masks, and property ownership. |
| 3. Letter spacing | Explicit fields recorded as bound already suppress ambiguity. Inference does not enforce TEXT ownership. Applied text-style evidence is absent. | Attribute to the actual text owner; inspect existing binding and style before candidates; show semantic evidence. |
| 4 and 7. Repetition and source clarity | Findings have audit-root and occurrence IDs, but no property-level source/override relationship. Grading already groups by root and rule. | Group proven common causes for presentation while retaining occurrences and independent source grades. Explain one source fix and its demonstrated impact. |
| 5. Failures versus advice | 24 and 44 are separate rules, but preferred 44 and novel terminology still deduct as `needs-review`. Non-scoring inference can still display as `fail`. | Separate result category, score effect, release-blocking policy, and confidence throughout UI and exports. |
| 6. Contrast context | Transparent ancestors and some disabled states are already handled. Translucent composition and placed-instance context are incomplete. Boolean disabled properties are not captured; generic `inactive` can exempt too broadly. | Resolve evidenced backgrounds; capture actual state evidence; tighten exemptions. Current code measures text contrast only, so reproduce the reported icon/border behavior before defining a new detector. |
| 7. Duplicate candidates | Detection uses structural signatures, rather than rendered visual comparison. Candidates can lower the grade without proven common purpose. | Treat similarity as advisory evidence; require semantic compatibility and human confirmation for consolidation. |

Source anchors: [scan lifecycle](../../src/plugin/main.ts), [property eligibility](../../src/core/operations/node-fields.ts), [token rules](../../src/core/rules/token.ts), [adapter](../../src/figma/adapter.ts), [accessibility](../../src/core/rules/accessibility.ts), [interaction state](../../src/core/operations/interaction-state.ts), [finding contract](../../src/core/contracts.ts), [grading](../../src/core/grading.ts), [naming](../../src/core/rules/naming.ts), [repeated candidates](../../src/core/rules/component.ts), and [finding presentation](../../src/ui/operations/findings.ts).

## 1. Establish a reproducible baseline

Identify the plugin build used for the feedback, then reproduce a small set of representative findings in that build and the current build. If the original file is unavailable, create minimal fixtures and leave file-specific claims explicitly unverified. Existing partial protections mean the feedback could include older behavior, different Figma payloads, or misleading presentation.

Capture one case each for irrelevant stroke/radius, letter-spacing inference on non-text nodes, equal-valued semantic typography variables, inherited versus overridden instances, transparent/translucent backgrounds, disabled Boolean/variant properties, and different-purpose repeated structures. Include light/dark modes and nested components where relevant.

Measure cold scan and fix-to-result latency for a rename, token binding, component edit, and structural edit. Record page preparation, node snapshots, instance/style/variable resolution, index derivation, rules, and UI delivery, plus nodes revisited and Figma calls. Keep measurements local; existing synthetic index tests do not establish real scan performance.

**Exit:** a reproduction matrix distinguishes confirmed defects, existing protection, and unverified reports; baseline measurements support a realistic performance budget. This does not block corrections already demonstrated by source inspection.

## 2. Correct property relevance and typography intent

Create a shared property assessment that answers: does this node own the property, does it affect the rendered or functional design, what evidence already represents its semantic intent, and is further tokenization required or optional?

- Stroke weight requires an effective visible stroke, including paint/node visibility and opacity and relevant thickness. Inspect individual sides when aggregate values are mixed.
- Radius requires an affected surface, stroke, clipping, mask, or other supported rendered effect. Capture the missing mask/per-corner facts needed to decide; unresolved cases should not become invented failures.
- Preserve the existing absence of penalties for inert zero defaults. Bound irrelevant fields must also be excluded, so attaching metadata to an inert property cannot improve coverage.
- Enforce actual TEXT ownership for typography. Figma inference reported on a frame or instance is insufficient evidence that it owns letter spacing.
- Apply the assessment consistently to coverage, unique/ambiguous inference, repeated literal suggestions, token creation, and mutation preconditions. Keep optional zero-value typography advice possible without treating it as debt.

For typography, use this evidence order: **appropriate explicit binding → applied text style and overrides → compatible semantic candidates → unresolved choice**. Capture style ID/name and field-level binding provenance, caching style resolution per style. Retain token identity, collection/mode and units; equal numeric values, including zero, do not establish equal meaning. A style name alone does not prove a field is correctly tokenized.

Show current text style, current binding, value/unit, candidate token names, and the precise reason a choice is needed. Explicit appropriate bindings suppress ambiguity. Mixed text runs or unavailable library styles produce a scoped, non-scoring review until their evidence can be resolved; do not fabricate a uniform style or replace it automatically.

**Exit:** inert fields create no debt or repair action; binding them cannot improve grades; typography findings and actions target only actual text owners; two zero-valued semantic tokens do not trigger ambiguity when an appropriate binding or style resolves intent.

## 3. Separate correctness, recommendations, and governance

Make finding category explicit and independent of severity/status. Define score and certification effects per rule, then use that policy in Overview, Findings, Cleanup, JSON, Markdown, and readiness gates.

| Category | Treatment |
| --- | --- |
| Measured requirement | Scores when applicability and failure are established; blocks only under explicit readiness policy. |
| Evidence needed | Explains the missing evidence. Unknown rendering or unproven WCAG applicability is non-scoring; existing critical readiness reviews retain their explicitly documented policy. |
| Recommendation | Optional improvement; no score deduction or release block. |
| Vocabulary governance | Catalog review or intentional project terminology; no score deduction or release block solely for novelty. |
| Exempt / not applicable | Excluded from scoring with a reason available in detail. |

Immediately correct the preferred target-size and novel-term policies. Keep ordinary default-name and other demonstrable naming failures separate from vocabulary novelty. Put optional inferred tokenization and repeated-structure consolidation under recommendations. Do not merely change badge color while leaving deductions or failure counts intact. Preserve the existing non-inflating waiver behavior for actual failures.

WCAG 2.2 AA SC 2.5.8 uses **24×24 CSS pixels with exceptions**, including spacing. Measure the supported interaction area rather than a decorative icon's bounds. Evaluate spacing when geometry and neighboring targets are known; where target semantics or exceptions cannot be established from Figma, report review rather than a definitive conformance failure. [W3C: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

The 44×44 criterion is SC 2.5.5, Level AAA, and can remain preferred guidance under this AA audit. Link the preferred finding to the correct criterion. [W3C: Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html).

Version the changed ruleset and update affected contracts/schema validators and consumers together. Compare old/new reports and explain intentional score changes; existing certificates must not imply they were issued under the new rules.

**Exit:** recommendation-only or novel-term-only differences do not change grade or readiness in either direction; 24–43 px targets have no preferred-size deduction; sub-24 targets are not automatically called WCAG failures without applicability/exception evidence.

## 4. Evaluate contrast in the evidenced rendering context

Consolidate background resolution so the adapter and rule engine cannot disagree or introduce competing white fallbacks. Resolve supported solid paint stacks through transparent/translucent ancestors to an evidenced opaque backdrop, accounting for opacity and paint order. Keep the source path and effective color in finding evidence. Unsupported gradients, images, blends, masks, or overlapping content produce a non-scoring review with the reason.

Distinguish a reusable definition from a placed instance. A component-set authoring surface is not proof of a consumer background. A transparent instance placed on a known screen surface can use that surface. The same source text on different backdrops may require separate contrast findings.

Capture both Boolean component properties and variant properties. Use explicit disabled/enabled evidence, a clear disabled variant, or an explicitly confirmed project state mapping. Generic `inactive`, `unavailable`, muted appearance, `selected=false`, and `checked=false` do not by themselves prove that interaction is disabled. Conflicting state evidence should require review, not silently exempt a control. Show where the exemption originated.

Inactive UI components are exempt under the text and non-text contrast criteria. Apply the text exemption now and share its state resolver with any future non-text rule. The current implementation has no icon/border contrast detector: establish whether the designer saw propagated text findings or another build before expanding scope. [W3C: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

**Exit:** known dark backdrops survive transparent wrappers; supported translucent stacks produce correct colors; isolated definitions remain unresolved when appropriate; genuinely disabled descendants are exempt; still-interactive unselected/unchecked controls remain subject to contrast checks.

## 5. Present one actionable problem per proven source cause

Extend evidence to distinguish audit root, occurrence node, actual source node/property, inheritance path, override status, and relevant rendering context. Validate Figma's available correspondence/override APIs during implementation; when source ownership cannot be proved, keep the occurrence separate and label the uncertainty.

Build a grouped presentation over the underlying findings. Group by rule, proven source property, and relevant context. Do not group solely by matching names, values, component-set membership, or structural similarity. Direct variants may be independently authored; shared set membership does not establish one fix. Local overrides and different contrast backgrounds remain separate.

A primary finding should answer:

- What is wrong and why it matters.
- The source component and exact layer/property to change.
- The current style/binding or measured rendering evidence.
- How many scanned occurrences inherit that property, with variants/instances expandable.
- Whether this is scored, advisory, or exempt.
- **Go to source**, **Show affected layers**, and **Recheck this issue**.

Example copy, only when inheritance is proved: “This unbound property originates in Button / Label. Twelve scanned occurrences inherit it. Bind the source property here, then recheck.” Distinguish observed occurrences from predicted resolved findings; do not promise that a source edit fixes overrides or unscanned external consumers.

Overview should count actionable issues separately from affected occurrences. Preserve raw occurrence evidence, navigation, filters, and export traceability. Existing grading already deduplicates by source root and rule, so presentation grouping should not change grades. Recompute each affected source's grade after a fix, preserving the weakest-source readiness gate. Existing occurrence IDs/waivers remain stable; group identity is additive. Repeated fixes must not create duplicate mutation operations.

For component consolidation, use structure as a candidate signal alongside semantic purpose, component properties and designer-confirmed pattern evidence. Visually similar objects with different roles remain independent. Recommendations never automatically merge components or guess semantic intent.

**Exit:** one inherited property appears as one actionable group; overrides and distinct causes stay separate; grouping leaves grades unchanged; source navigation reaches the correct property owner; exports retain all occurrence evidence.

## 6. Refresh the complete session context incrementally

Start the measurement and event-coverage spike alongside steps 2–4. Ship incrementality in layers; persistent reuse across plugin restarts is a later milestone within this plan.

**A. Reuse the session graph after supported changes.** Replace the global dirty-only state with an accumulated change journal and a reasoned full-rebuild fallback. Track changed IDs/properties, additions/deletions, old/new parents and dependency invalidation. Begin with known plugin mutations, then support designer and collaborator edits. Unknown topology/profile/library changes can initially trigger a full rebuild.

Refresh affected snapshots and reverse dependencies: main components → inherited instances; styles/variables/modes → consumers; backgrounds → descendant text; changes → sibling naming groups, responsive families and repeated-structure indexes. Initially rerun pure rules for the active audit against the refreshed complete graph. Avoiding repeated Figma traversal is the first performance target; caching individual rule results comes later if measurements justify it.

Figma batches document events and does not emit descendant changes for every main-component or style update. The change stream therefore requires dependency expansion and explicit verification of variable/library coverage; a changed-node-only strategy is insufficient. [Figma: documentchange behavior](https://developers.figma.com/docs/plugins/api/properties/figma-on/).

Build a candidate graph/report and commit them together only when the tracked revision is still current. Reconcile delayed mutation events without ignoring real user edits on the same nodes. Cancellation, failed reads, or concurrent edits preserve the last report with an accurate stale state. Maintain complete coverage, profile/ruleset/catalog compatibility and graph/report hash checks; simply resetting the existing 15-minute timestamp cannot establish freshness.

**B. Add targeted verification.** Offer **Recheck changes** as the normal warm action, **Recheck this component**, **Recheck this issue**, and **Rescan entire file**. A targeted action refreshes its owner and all affected dependencies, replaces obsolete findings, preserves the original captured audit scope, and explains resolved/remaining issues. Do not derive full-file readiness from a single passing check. If other changes remain unreconciled, global results stay stale.

**C. Evaluate persisted context.** After session refresh parity is established, measure serialization size/startup benefit and define a local cache with file identity, schema/ruleset/catalog/profile versions, bounded size and eviction. Preserve the project's data-minimization policy; do not store full graphs as shared document plugin data. Changes while the plugin is closed have no continuous event history, so restored context requires reconciliation before becoming current. If reliable reconciliation still requires a full scan, communicate that limitation; the session improvement remains useful. Keep explicit full rescan and cache invalidation available.

**Exit:** supported small edits avoid whole-file resnapshotting, and incremental versus forced full scans of the same revision produce equivalent findings, coverage, grades, readiness and proposed repairs, ignoring timestamps. Establish median and tail latency targets from the baseline on the same file/hardware; report the observed improvement rather than promising an arbitrary number of seconds.

## Delivery order and validation

1. **Baseline and design contracts:** reproduction matrix, performance counters, property/source evidence and score-category decisions. Small investigative slice; confirm Figma event and source correspondence limitations.
2. **Trust improvements:** property ownership/relevance, typography evidence, recommendation/governance score corrections. Deliver independently of caching. Include a ruleset migration and before/after report comparison.
3. **Rendering correctness:** background composition and state evidence, including actual adapter-to-rule tests for Boolean disabled properties.
4. **Clear source findings:** provenance, grouping, impact/navigation and export presentation. Run session-refresh work in parallel; both feed targeted recheck UX.
5. **Fast verification:** supported incremental snapshot refresh, dependency reconciliation, targeted actions and full-rescan fallback. Expand supported changes only after parity tests pass.
6. **Persistent reuse and designer acceptance:** validate restart reconciliation before enabling it; retest the complete maintenance loop on WilmerHale or an equivalent large system.

Regression coverage must follow real Figma-like adapter payloads through rules, reports and repair plans. Helper-only fixtures would miss the current Boolean-property and non-text inference gaps. The core matrix includes:

- Hidden/zero-opacity strokes, inert radii, clipping/masks, per-corner/per-side mixed values, and no grade improvement from inert bindings.
- Non-text typography inference, same-value tokens, style bindings/overrides, mixed runs, and missing remote style evidence.
- Transparent/translucent ancestors, isolated definitions versus placed instances, multiple modes, unsupported backgrounds, genuine disabled states and interactive alternatives.
- 24/44 boundaries, spacing exceptions, unknown target areas, and advisory-only changes with identical grade/readiness.
- Common-source inheritance, local overrides, independent variants, contextual contrast differences, and different-purpose structural matches.
- Rename, bindings, style/variable edits, component propagation, create/delete/reparent, undo/redo, remote edits, page/profile changes, cancellation, concurrent refresh edits, expiry and restart reconciliation.

Run the appropriate targeted tests for each delivery and the repository's `pnpm verify` gate for implementation releases. Validate the built plugin in Figma, not only synthetic graph benchmarks. Success means the designer can identify a source problem, see its actual impact, fix it, and obtain a trustworthy recheck with measurably less waiting and list noise.

For each executed delivery, archive its actual plan and add journal/topic updates under `wiki/` according to `wiki/MECHANICS.md`, then rebuild and check the wiki. This document remains a proposal until that work is performed.
