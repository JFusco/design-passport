---
title: Persistent audits and repeat reviews
---

# Persistent audits and repeat reviews

Tracking: [JFusco/design-passport#21](https://github.com/JFusco/design-passport/issues/21), labeled bug and enhancement. Implementation branch: `codex/persistent-audits-and-faster-repeat-reviews`, isolated from the original checkout and based on fetched `origin/main`.

## Durable results

Completed reports save before terminal success. Versioned compressed records are independently discoverable per stable file key and captured target, so a plugin restart can restore historical findings without loading the file graph. Replacement writes precede pruning; cancellation and operational save errors keep the preceding completed result. View preferences contain no mutation confirmations or form drafts.

The local working budget is 4 MB including existing storage. Recomputable context is evicted before least recently viewed reports. There is no backend or telemetry. Missing file identity and oversized results remain explicitly session-only or not saved, with export available. Session reference packs are not restored as active guidance.

## Trust and reuse

Historical results carry original report/configuration provenance and cannot authorize cleanup, waivers, contributions, or certification. Historical export uses a separate JSON envelope and labeled Markdown; the current report contract is unchanged. Updating or invalidating setup preserves the completed snapshot, including unsaved results, while invalidating its verification.

Persisted base snapshots are partitioned by top-level root. Bulk REST-format page exports and live supplements establish fragment equality; the existing knowledge/report hash is not a cache-validation key. Opaque inference, documentation resources, component relationships, and variable evidence are refreshed. Global relationships and findings are rebuilt from a complete verified graph. Fragment writes are staged until the document-change revision accepts the attempt.

Variable edits do not reliably emit document-change events. A retained dependency epoch therefore checks local variables, collection modes, aliases, inferred remote dependencies, and approved library inventory at reuse, publication, and mutation boundaries. Missing IDs remain tracked so later availability invalidates the context; a failed API read cannot establish unchanged absence. Changes before publication preserve the preceding report, while changes during a completed snapshot's save mark the displayed result stale.

Page batches capture their targets once and share verified context. Each completed page is saved; empty pages are counted separately. Cancellation preserves completed pages, while changed or expired context stops further analysis. Interrupted batches do not resume automatically.

## Evidence and limitations

Automated suites cover storage quota/corruption/replacement, plugin restart without capture, file isolation and Dev Mode, captured refresh targets, stale-build rejection, historical exports, and multi-page cancellation. Adapter fixtures compare cached and forced-full graph/report output and verify capture is skipped for matching fragments. Browser harness checks exercise the compact UI independently of Figma.

Native Figma testing on 36- and 64-page libraries confirmed automatic saving and restoration of timestamps, tabs, filters, expanded evidence, and historical mutation restrictions. Running another plugin and closing during an unfinished batch preserved preceding completed results. On the 64-page, 32,038-node file, original main and cached capture produced identical findings and grades; 314 of 320 fragments were reused. Its full batch audited 56 eligible pages, skipped eight, and retained 54 results under the bounded budget.

The 65-page editable fixture completed 63 eligible pages and skipped two. Variable/component edits produced identical cached and forced-full reports; a component-only edit rebuilt two dependent fragments while reusing 62. Editing during validation prevented publication. Forget and file-specific Clear preserved another file's saved report, and all fixture mutations were restored. Synthetic timing excludes Figma property/API bridge costs and does not justify an overall speedup claim. The manual QA document links the acceptance matrix and runtime measurements.

False-positive rubric changes are outside this change until concrete designer examples are provided.

## Bounded capture and certification

[Issue #53](https://github.com/JFusco/design-passport/issues/53) bounds pending
context by the shared storage budget minus all non-context records. Each
fragment is encoded when captured; only compressed candidates are retained.
Once a candidate exceeds the remaining allowance, later fragments are not
produced or encoded. One candidate can exceed the allowance temporarily while
its size is determined. Publication still requires an accepted build and
rechecks capacity without evicting reports. Cache reads clone each node once.
The staging inventory starts with the first new fragment, so full captures
without caching and all-hit retained captures skip unused inventory reads.

Incremental refreshes retain one resource verifier with a union of variable
dependency digests and style evidence, rather than a chain of earlier readers.
Dependencies from untouched fragments remain checked. Old inference snapshots
are cleared when reuse is unavailable and released as fragments are replaced.
Each synchronous traversal reads a parent's child array once. Live evidence
is still refreshed at the existing asynchronous boundaries; this optimization
does not reuse evidence across a yield.

Certification resolves all targets first and runs exactly two full checks,
each including resources and whole-file scene signatures, around synchronous
writes. Cheap readiness and revision checks remain. The UI blocks duplicate
certification and competing actions until a terminal response, including when
a stale notice arrives during verification. Failed writes request native undo.
Cancellation ends the busy state. The pressed button and a polite status
message remain accessible; tab view preferences can still be saved locally.
Historical export buttons stay disabled during certification even after a
stale notice, then become available when certification finishes.

The [delivery journal](../journal/2026-09-30-audit-memory-and-certification.md)
separates automated evidence from outstanding native Figma checks. Console
diagnostics identify producer, phase, duration, counts, and staging bytes;
they contain no design content and are not plugin heap measurements.
The development-only QA harness records certification results and runtime
handler timing, exact prior metadata, and bounded document-change observations.
Its observer cannot bypass production handling if registration is unavailable.
UI receipt timing and batched change callbacks do not prove native elapsed time
or edit placement. Short-viewport collapse checks run in standalone Chromium;
native certification timing and concurrent-edit undo require their own evidence.

One repaired-harness native pair retained the same whole-file knowledge and
normalized report while candidate audit time was 2.93% slower than main in
retained/mixed context. A separate zero-reuse cold pair was 8.41% faster.
These are individual samples, so the 20% audit-speed and repeated-matrix
gates remain open. Candidate source-frame certification succeeded natively
for six roots with a correlated 60,816 ms runtime handler duration. Main also
certified six roots in 238,003 ms, but the Mac locked during that attempt, so
the pair cannot establish the uninterrupted 60% target. Concurrent-edit
rollback remains unverified. The
[journal](../journal/2026-09-30-audit-memory-and-certification.md) records
the measurements and their limits.
The six-root exact prior-metadata snapshot was exported before a later
rollback attempt; the Mac locked during its fresh audit, before any native
designer rename.

## Repository automation

Since 2026-09-25, drafts and changes limited to wiki content or its generated graph use lightweight validation while ready product, workflow, script, documentation, and skill changes retain the full browser-backed suite. Wiki maintenance runs Mondays, audits missed merges in batches, updates bot pull requests through REST, and rejects duplicate or malformed frontmatter across the full wiki before writing history ([issue #35](https://github.com/JFusco/design-passport/issues/35)).
