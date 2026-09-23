---
status: "implemented"
executed: true
evidence: ["wiki/qa/ai-readiness-scanner-maintenance.md", "https://github.com/JFusco/design-passport/issues/24"]
source_tool: "codex"
source: "docs/plans/ai-readiness-scanner-maintenance.md"
topics: ["figma-runtime-qa"]
digest: "a3b4d3365c208e204362d6e8d778210057e46c6b95e9cb34ebf1794833d161c0"
---
# Make the AI Readiness Scanner faster and easier to act on

Tracking: JFusco/design-passport#24. Base: refreshed main `1fe3ce28b8464ce8d37397d4b0745e3a27fe14f2`. Branch: `codex/ai-readiness-scanner-maintenance`.

## Intended outcome

Improve rendered-property and typography evidence, accessibility accuracy, actionable source grouping and localized verification on top of the existing persistent audits. Preserve restart recovery, historical v1 reports, bounded storage, captured targets, and conservative certification. Retest the entire guidance and learning loop with isolated QA knowledge.

## Accepted implementation sequence

1. Build current main and capture cold and validated-cache baselines using actual Figma development plugin runs. Copy disposable fixtures privately and preserve production files and other QA work.
2. Share property applicability and binding assessment across coverage, inference, repeated literals, creation, and repair validation. Count resolved text styles only for fields they control; preserve units, overrides, mixed runs and unavailable-style review. Capture visible instance descendants without duplicating source debt.
3. Centralize requirement/recommendation/governance policy. Advisory categories do not score or block; genuine critical requirements and non-inflating waivers remain. Correct target sizing, disabled evidence and supported solid-paint contrast; unknown rendering/applicability remains non-scoring review.
4. Preserve finding IDs and add occurrence-backed verified source groups. Keep uncertain relationships as related findings. Expose source navigation, affected layers, categories, score effect and issue/component rechecks.
5. Extend the existing fragment cache and resource/change validation. Rebuild derived indexes and active pure rules, protect replacement publication against edits/cancellation, and provide explicit full rebuild fallback. Include geometry, style/variable resources, aliases/modes, bindings, rendering and state in freshness evidence.
6. Emit report schema v2 and ruleset `1.0.0-beta.3`; retain v1 historical rendering/export/provenance and invalidate incompatible context fragments without deleting reports.
7. Verify real files, surrounding regressions, current-main performance and mandatory guidance/learning round trip. Archive execution, update wiki, rebuild/check its graph, and pass complete `pnpm verify` with Node 24.14.0 and pnpm 10.33.0.
8. Only after all local gates pass, use governed commit/push, reuse the branch workflow's PR with `Closes #24`, and squash merge the verified head only when Quality, commit lint, wiki, PR creation and all applicable checks/reviews are green. Verify merged main with build/smoke, dispatched Quality and wiki synchronization.

## Required real-file matrix

- WilmerHale Library 2026: designer-feedback reproduction, complete-file context and large-file timings.
- Colliers Design System: independent library regression.
- Private copies of disposable acceptance/cache-isolation fixtures: controlled property/style/state edits, cleanup, failure recovery, batches, storage isolation and certification.
- UI Design Library and its Style Guide: real project-guidance lifecycle and companion round trip, with mutations confined to private copies.

Each case records file identity/revision, audited roots, source/bundle identity, expected/actual outcomes, timings and screenshots or exports. Raw client exports remain local; only sanitized results and reproducible QA fixtures enter the repository. Incremental/full results must match at the same revision for findings, coverage, grade, readiness, repairs and batch results, excluding timestamps. Target: at least 2× median improvement for localized edits affecting at most 10% of nodes, including preflight.

## Required surrounding regression

Cover property relevance/styles/units/overrides; contrast/background/state/target boundaries; source grouping and stable waivers; automatic setup and draft/target capture; cleanup preview/apply/undo/idempotency and version-history denial; 0.5px acceptance and 0.51px/overlap/clipping rollback and clone cleanup; historical exports/restoration/failed replacement/deleted targets/interrupted batches/eviction/Forget/Clear/missing identity/Dev Mode; resource changes without events/concurrent edits/batch transitions/stale and repeated certificates/weakest-source readiness; JSON/Markdown/v1/v2/companion non-certifying aggregation.

## Mandatory guidance and learning gate

Exercise both actual Figma UI and running companion with isolated knowledge data:

- No pack; valid project guide import, origin/version/digest/navigation/restart/file isolation; reject copied bindings and malformed/wrong-role/unsafe/oversized/bad-digest replacement while retaining valid predecessor.
- Session references remain inspiration and disappear on restart. Dev Mode reads guidance but cannot replace/remove project packs.
- Identical document audits with zero/one/multiple packs retain findings, grades, blockers, readiness and certification, also after incremental refresh and saved restoration.
- Fresh-only sanitized contribution preview/export, exclusions, and cancel without export; no raw text/URLs/file keys in contribution envelopes.
- Duplicate/timestamp-only import deduplication; neutral unique-contribution support/contradiction counts; grouped findings cannot inflate evidence.
- Edit/approve/reject/defer with append-only decisions bound to exact candidate digests; editing invalidates earlier approval.
- Project-only default and isolation; explicit shared approvals confined to the isolated QA store; reimport compiled guidance and verify domain/origin/applicability/caveats and unchanged grading.

No QA learning may enter the real shared release. A missing real-file case, failed gate, unverified performance target, or failed current workflow prevents claiming completion.
