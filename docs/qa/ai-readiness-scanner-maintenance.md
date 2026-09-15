# Scanner maintenance verification record

Tracking issue: [JFusco/design-passport#24](https://github.com/JFusco/design-passport/issues/24). Candidate branch: `codex/ai-readiness-scanner-maintenance`. Base: refreshed `origin/main` at `1fe3ce28b8464ce8d37397d4b0745e3a27fe14f2`.

Status: **candidate implementation, required native verification, guidance/learnings, regressions, and local release gates complete**. On 2026-09-15 the maintainer removed Colliers from the release matrix after its owner-disabled export/copy controls prevented a private test copy. Raw client evidence remains local; the repository contains sanitized outcomes and reproducible fixtures only.

## Build identity and test boundaries

The candidate is plugin `0.3.0`, report schema 2, and ruleset `1.0.0-beta.3`, built with Node `24.14.0` and pnpm `10.33.0`. The final native runs used production plugin SHA-256 `f573ce3584fda8d51c3c512f4857aff35ea4f9a48de3bca82f749fa45f90dfde`, production UI SHA-256 `103b383ed819ef8ec9a4b106e769c6ce059b73f9cb35bde2aa881d155a8ee2e6`, and harness identity `7a3f094f2888ad1e27ff442b602c3e66d4414a189c82d5808954ac4d7ce94b5f`.

The harness appends diagnostic controls to the exact production JavaScript and HTML bytes, records request-to-result and complete-handler timings, and blocks document writes outside explicit private file keys. Its separate Figma development identity keeps bounded client storage isolated from production and unrelated QA. Harness unit tests verify byte preservation and write boundaries; only recorded Figma runs count as native evidence.

Production libraries were opened read-only. Cleanup, token creation, certification, fixture creation, Forget/Clear, and guidance replacement ran only in private copies. No shared learning content was changed.

## Verified implementation behavior

The scanner now uses one property assessment for coverage, inferred bindings, repeated-value recommendations, token creation, and repair validation. It grades visible stroke weight and evidenced radii, ignores inert defaults, and accepts resolved text styles only for typography fields actually controlled by the style. Text-layer ownership, original units, mixed runs, unavailable styles, and local overrides are retained as separate evidence. Equal values remain insufficient to prove semantic identity.

Finding policy now separates requirements, recommendations, and governance from status, severity, confidence, and score impact. Advisory target-size guidance, optional tokenization, structural consolidation, and novel terminology cannot lower a grade or independently block readiness. Critical requirements and non-inflating waivers retain their existing role.

Text contrast resolves supported solid-paint stacks through opacity and ancestor composition without an assumed-white fallback. Isolated component definitions and placed instances have distinct rendering contexts. Boolean and variant properties provide explicit disabled evidence; generic inactive or muted naming does not. The scanner measures the interaction target, applies the 24×24 minimum with supported spacing exceptions, and keeps 44×44 as enhanced guidance.

Raw finding IDs remain stable. Occurrence-backed issue groups combine only proven common causes with the same rule, exact source/property, and rendering context. Direct instance-root inheritance is grouped only when ownership and the absence of overrides are established. Other nested similarities remain expandable related findings. Grouping does not change grades, duplicate repairs, or inflate learning contributions.

Localized verification extends the existing persistent fragment cache. It refreshes changed sources, affected ancestors, direct consumers, rendering/state evidence, and resource fingerprints, rebuilds derived indexes, and reruns the active audit rules. Unknown topology, resource/profile/version changes, failed dependency validation, and explicit full requests fall back to a complete rebuild. Publication and storage maintenance occur only after revision validation; cancellation or failure preserves the prior saved result.

Schema 2 readers and exporters coexist with saved schema 1 reports. Historical timestamps, plugin/ruleset versions, and provenance survive restoration and export. Incompatible context fragments become cache misses without deleting historical reports.

## Large-file performance and parity

Current main was measured through its actual development plugin before candidate work. On the private WilmerHale copy it completed a cold current-page audit in 289,127 ms and a validated-cache refresh in 239,509 ms. The baseline captured 32,231 nodes; its validated-cache path still reran whole-graph inference. The older pre-persistence timing was not reused.

The candidate captures additional visible instance-descendant rendering evidence and therefore performs more work during a complete rebuild. Its first successful full current-page run on the same private 64-page library completed in 600,153 ms. The final full rebuilds captured 58,021 evidence nodes in 8,010 fragments and remained within the Figma plugin process memory limit. Two earlier native attempts exposed memory exhaustion: first from unbounded instance-descendant expansion and then from retaining both old and rebuilt graphs during localized refresh. Bounded descendant capture and in-place fragment replacement corrected both failures; the final seven-run sequence completed without process termination.

Three controlled edits each affected no more than 10% of document nodes. Each incremental run was followed by a forced-full run at the same document revision. Complete-handler timings were:

| Pair | Incremental | Forced full | Speedup |
| --- | ---: | ---: | ---: |
| 1 | 154,059.5 ms | 398,240.1 ms | 2.585× |
| 2 | 155,385.8 ms | 397,652.8 ms | 2.559× |
| 3 | 149,392.9 ms | 400,836.9 ms | 2.683× |

The median speedup was **2.585×**, exceeding the required 2× target with preflight and post-save work included. For every pair, findings, axis coverage, frame results, grade, readiness, blockers, issue groups, repair operations, target, and knowledge evidence matched exactly after excluding timestamps and the report hash derived from them.

Full rebuilds are slower than current main because the candidate records substantially more rendering and state evidence. The release performance claim is the verified localized-refresh improvement, together with resolved memory failures and exact full-result parity.

## Real Figma matrix

| File and use | Audited target and result | Timing and evidence | Outcome |
| --- | --- | --- | --- |
| WilmerHale Library 2026, private copy | 64 pages; 12 captured roots on the Cover page; 58,021 evidence nodes; 408 findings; 155 issue groups; C/76.0 | One successful cold run plus three incremental/full pairs; source and bundle identities recorded in every export | Passed large-file correctness, memory safety, parity, and 2× median target. |
| Disposable acceptance fixture, private copy | Seven purpose-built roots on one QA page; 718 nodes; 260 findings; 125 issue groups; expected synthetic F/45.1 | 25,078.9 ms visible, 27,525.5 ms complete handler | Passed property, typography, accessibility, classification, grouping, and provenance assertions. |
| Cache-isolation fixture, private copy | Minimal independent page; D/56.4; 29 findings; 11 groups | 1,991 ms native run plus restart/Forget/Clear observations | Passed cross-file isolation and bounded-storage controls. |
| UI Design Library, original read-only | Button — Dark current page; three roots; 6,147 evidence nodes; 192 raw findings; B/89.9, ready | 76,696.3 ms visible, 78,954.5 ms complete handler | Passed independent production-library smoke with schema 2 and beta.3 identity. |
| UI Design Library Style Guide, original read-only | Cover current page; one root; 212 nodes; 29 raw findings; three issue groups; B/88.5, not ready | 5,939.8 ms visible, 7,904.3 ms complete handler | Passed style-guide production-file smoke and saved-result persistence. |
| UI Design Library and Style Guide, private copies | Identical captured selection across zero, one, multiple, and companion-generated advisory packs | All stable report fields matched at A/90.5, ready, zero blockers, 29 findings, six groups | Passed the mandatory guidance and learning round trip; see the dedicated record. |
| Colliers Design System | Published source opened read-only; its owner disables exporting, copying, and sharing, and Figma disables development plugins for the available view-only role. | Source view and exact permission state recorded | Excluded from the release matrix by maintainer direction on 2026-09-15. No scan result is claimed. |

## Scanner and surrounding regression

| Area | Executed coverage and result |
| --- | --- |
| Property rules | Native fixtures covered hidden and transparent strokes, inert and evidenced radii, clipping and masks, mixed corners and stroke sides, non-text inference, resolved and unavailable text styles, local overrides, original units, and equal-valued tokens. Assertions passed. |
| Accessibility | Native fixtures covered transparent/translucent ancestors, paint order, definition versus placed-instance contexts, explicit Boolean disabled state, muted but interactive state, conflicting evidence review, interaction-root geometry, 24px boundaries/spacing exceptions, and 44px guidance. Assertions passed. Unsupported rendering stayed non-scoring review. |
| Grouping and scoring | Native navigation exercised verified sources, affected layers, independent overrides/contexts, related findings, component and issue rechecks, and unchanged scoring. Stable IDs, waivers, JSON/Markdown occurrence data, and repair deduplication passed automated comparison. |
| Setup and target capture | Automatic setup, valid/invalid drafts, deleted mappings, page/selection changes during work, and refresh of the originally captured target passed lifecycle tests and native inspection. Invalid targeted input failed without replacing the saved result. |
| Cleanup | Native preview/apply, individual and bulk operations, repeated apply, undo groups, navigation, token creation, certification, and temporary-clone cleanup passed in allowlisted copies. Exact automated fault injection covers 0.5px acceptance and rollback at 0.51px, overlap, and clipping. Those three negative geometries were not forced manually in the native file. |
| Saved audits and batches | Restart restoration, v1 historical browsing/export, forbidden historical actions, failed replacement preservation, deleted targets, complete batches, interrupted batches retaining completed pages, storage eviction, Forget/Clear file isolation, missing identity, and Dev Mode passed native or exact lifecycle tests. |
| Freshness and certification | Variable values, aliases, modes, style properties, bindings, rendering/state fingerprints, resource drift without events, concurrent revision changes, stale/repeated certification, and weakest-source readiness passed. Native certification was idempotent and became stale after a controlled edit until recheck. |
| Consumers | JSON and Markdown schema 2 output, original schema 1 historical provenance, version-aware UI readers, companion aggregation, project/team guidance validators, and non-certifying multi-file behavior passed. |

Page-batch testing completed multiple pages, restored saved results, cancelled an in-progress batch, and retained its finished pages. Cleanup and token creation rescans published only after the current revision was verified. Forget and Clear affected only the active private file; another private fixture retained its saved audit and cache.

## Guidance and learnings

The complete Figma → contribution → companion review → compiled project guidance → Figma reimport loop passed with isolated knowledge. It covered valid-pack persistence, copied-file and malformed replacement rejection, session-reference expiry, Dev Mode read-only behavior, zero/one/multiple-pack grade equality, sanitized contribution cancel/export, duplicate and timestamp-only import deduplication, neutral supporting/contradictory counts, edit/approve/reject/defer decisions, stale-digest rejection, project-default scope, explicit isolated shared approval, exception preservation, and native reimport.

See [Scanner guidance and companion verification](./scanner-guidance-companion-verification.md) for the detailed evidence. Repository knowledge hashes were unchanged after the run.

## Automated and local release gate

The latest complete test run passed 443 tests in 45 files. New focused tests cover property applicability, target sizing, interaction state, rendering backgrounds, finding policy/groups, recheck dependency closure, native evidence comparison, historical storage, guidance replacement, exception round trips, companion deduplication, and candidate harness guards.

The complete `pnpm verify` release gate passed with Node `24.14.0` and pnpm `10.33.0`: catalog, generated-schema, knowledge, wiki, TypeScript, 443 tests in 45 files, and the production plugin/UI/companion builds all passed. `git diff --check` also passed. The rebuilt plugin and UI hashes remained `f573ce3584fda8d51c3c512f4857aff35ea4f9a48de3bca82f749fa45f90dfde` and `103b383ed819ef8ec9a4b106e769c6ce059b73f9cb35bde2aa881d155a8ee2e6`, exactly matching the native-tested bytes. The final companion bundle hash is `0217be5ab1f55a5f3ec665fca4643d361112227bc226a257766a77e20af609d0`; it rebuilt the isolated review store and loaded the expected browser state.

Documentation-only changes after that run are checked through wiki integrity and `git diff --check`.

The candidate is ready for the governed commit, push, and pull-request workflow. Merge remains conditional on all checks for the latest PR head. Glean and Slack updates follow verified merged-main smoke testing.
