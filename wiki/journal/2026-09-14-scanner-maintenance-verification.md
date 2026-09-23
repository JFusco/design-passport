---
topics: [figma-runtime-qa]
plans: [2026-09-14-make-the-ai-readiness-scanner-faster-and-easier-to-act-on-a3b4d3365c.md]
issue: "https://github.com/jfusco/design-passport/issues/24"
issues: ["https://github.com/jfusco/design-passport/issues/24"]
---

# Scanner maintenance implementation and verification

The implementation for [JFusco/design-passport#24](https://github.com/JFusco/design-passport/issues/24) extends the persistent-audit and page-batch behavior merged before this work. It is based on refreshed main `1fe3ce28b8464ce8d37397d4b0745e3a27fe14f2` and developed in an isolated checkout on `codex/ai-readiness-scanner-maintenance` so unrelated local changes remain untouched.

The scanner now uses one rendered-property assessment across grading, inference, recommendations, token creation, and repair validation. Text-style evidence is field-specific and separate from variable bindings; inert strokes and radii do not inflate coverage. Rendering evidence resolves supported paint stacks and explicit disabled state, and unknown rendering or applicability remains non-scoring review. Finding policy separates requirements, recommendations, and governance, while occurrence-backed groups retain raw finding IDs and combine only verified common sources.

Localized verification extends the existing fragment cache instead of replacing it. It refreshes changed sources, relevant ancestors, direct consumers, resource fingerprints, and rendering/state evidence; then it rebuilds derived indexes and reruns the active pure rules. Unknown dependencies and structural or resource changes fall back to a full rebuild. Publication is revision-checked, and cancellation or failed replacement preserves the previous saved report. Schema 2 and ruleset `1.0.0-beta.3` coexist with version-aware historical schema 1 reports.

Native candidate runs use the exact production bundle behind an instrumented Figma development harness. The production code SHA-256 is `f573ce3584fda8d51c3c512f4857aff35ea4f9a48de3bca82f749fa45f90dfde`, the UI SHA-256 is `103b383ed819ef8ec9a4b106e769c6ce059b73f9cb35bde2aa881d155a8ee2e6`, and the harness identity is `7a3f094f2888ad1e27ff442b602c3e66d4414a189c82d5808954ac4d7ce94b5f`. All writes were confined to private copies, and raw client evidence remains local.

The WilmerHale private copy exposed two real memory failures: unbounded visible instance-descendant expansion and a localized refresh that held old and rebuilt graphs simultaneously. Bounded descendant capture and in-place fragment replacement corrected both. The final sequence processed 58,021 evidence nodes in 8,010 fragments without terminating the plugin. Three localized edits produced 2.585×, 2.559×, and 2.683× complete-handler speedups over forced-full scans at the same revision, for a median 2.585×. Findings, coverage, grades, readiness, repairs, targets, and batch results matched after excluding time-derived fields.

A native acceptance fixture passed 25 of 25 assertions across property relevance, typography styles and overrides, backgrounds, disabled states, interaction targets, classification, grouping, source provenance, and refresh behavior. Native UI regression also exercised cleanup, token creation, certification, saved-report restoration, page batches, historical exports, failure preservation, storage eviction, Forget/Clear isolation, and Dev Mode. Exact fault-injection tests cover the 0.5px cleanup boundary and rollback at 0.51px, overlap, and clipping; those three negative geometries were not manually forced in Figma.

The complete guidance and learning loop passed in the actual plugin UI and a running companion with isolated knowledge. It covered valid-pack persistence and file isolation, malformed and copied binding rejection, session-reference expiry, Dev Mode restrictions, zero/one/multiple-pack grading equality, contribution privacy, duplicate and timestamp-only import deduplication, append-only digest-bound decisions, project-default scope, one explicit isolated shared approval, exception preservation, and native reimport of compiled project guidance. Repository knowledge hashes remained unchanged.

Read-only production smoke scans completed on UI Design Library and its Style Guide. The former audited 6,147 evidence nodes and finished B/89.9 ready; the latter audited 212 nodes and finished B/88.5 not ready. The Colliers source was opened, but its owner disables exporting, copying, and sharing, and Figma disables development plugins for the available view-only role. A permitted desktop local-copy attempt ended at the same restriction. On 2026-09-15 the maintainer removed Colliers from the release matrix; no scan result is claimed for that file.

The complete local release gate passes with Node 24.14.0 and pnpm 10.33.0: 443 tests in 45 files, TypeScript, catalog/schema/knowledge/wiki checks, and all production builds. The rebuilt plugin and UI hashes match the native-tested bytes. The final companion bundle restored the isolated candidate and decision store and loaded the expected review queue in the browser.

The [scanner verification record](../qa/ai-readiness-scanner-maintenance.md) contains the sanitized performance and regression matrix. The [guidance and companion record](../qa/scanner-guidance-companion-verification.md) contains the full isolated lifecycle and round-trip evidence. The implementation is ready for the governed GitHub release workflow; Glean and Slack updates follow verified merged main.
