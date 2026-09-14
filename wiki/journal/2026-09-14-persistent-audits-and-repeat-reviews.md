---
date: 2026-09-14
topics: [persistent-audits]
plans: [2026-09-14-persistent-audits-and-faster-repeat-reviews-898685bc09.md]
---

# Persistent audits and repeat reviews

Implemented [JFusco/design-passport#21](https://github.com/JFusco/design-passport/issues/21) on an isolated branch from fetched main, preserving the original checkout's pending wiki edits. The issue has bug and enhancement labels.

Completed page, selection/component, and file-scope audits now save automatically to bounded compressed clientStorage. Reopening restores historical results and view preferences without a knowledge build. Current setup and session-only guidance remain separate from original result provenance. Historical export, including an unsaved result that later becomes stale or survives a setup change, stays available while mutation actions require verified context.

Validated base fragments reuse normalized capture after comparing bulk page data, metadata, variable values/modes, and dependency evidence. Opaque inference and external evidence are freshly read; global findings retain full-file semantics. Duplicate inference reads and repeated root resource calls were reduced, and dependency reads use bounded concurrency. Context writes are accepted only after the document-change revision accepts the build, and each flush shares one storage inventory instead of rescanning it for every fragment.

Page batches share verified context and save individual results. Cancellation keeps completed pages; file changes, expiry, or a failed save stop the batch. A failed save leaves its live report available for export rather than silently losing it to the next page.

Evidence includes plugin-level fresh-launch recovery, saved-target refresh, quota failure, file isolation, Dev Mode, delayed-restoration races, changed-build rejection, historical navigation errors during refresh, and batch cancellation tests. Storage tests cover concurrency and corruption. Adapter tests compare cached and forced-full findings/graphs across edited inputs. The headless browser harness verified the 500×720 UI, 65-page selection, export during refresh, warning visibility, and cancellation without overflow or runtime errors.

The sandbox codec regression exposed astral-Unicode corruption in fflate's fallback when browser text encoders are absent. Storage now uses portable UTF-8 for headers and payloads, with pinned fflate gzip compression; isolated-VM tests also reject malformed UTF-8.

The expanded acceptance review found and fixed two authority gaps: variable edits could bypass document-change tracking, and historical export could fail after a refreshed graph replaced the graph underlying the still-displayed report. Variable dependency epochs now cover direct and inferred aliases, missing IDs, collection modes, and approved library inventory at audit and mutation boundaries. Failed reads are distinguished from authoritative absence, including failures between enrollment and grading capture. The complete release verification passes 294 tests across 35 files, TypeScript, repository checks, and all production builds.

Native Figma testing on a 36-page library restored a saved B/87.8 result after closing/reopening. The user-provided larger library has 64 pages and 32,038 captured nodes. Its original-main, cold feature, and cached feature reports have identical findings and grades; the cached refresh reused 314 of 320 fragments. Another-plugin recovery, historical exports, interrupted batches, and retained view preferences passed. The complete real-file batch audited 56 eligible pages in 14 minutes 1.793 seconds, skipped eight pages without targets, and retained 54 reports under the 4 MB budget.

A disposable 65-page editable fixture verified captured component targets, deleted-node navigation, separate historical/current configuration hashes, 63 eligible-page completions, two empty-page skips, and file-specific Forget/Clear behavior. Cached and forced-full reports matched exactly after variable/component edits. A component-only edit rebuilt two dependent fragments/eight nodes while reusing 62 fragments/124 nodes. A real edit during page validation stopped publication and kept the prior saved result readable. The fixture was restored after testing. Single-run runtime observations are recorded separately from synthetic timing and do not establish a universal speedup.

Version 0.2.0 passes 294 tests across 35 files, TypeScript, schema/catalog/knowledge/wiki checks, production builds, independent authority review, and native acceptance. The user authorized commit, push, merge, organization-plugin publication, a post-publication smoke test, and the release announcement.
