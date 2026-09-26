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

## Repository automation

Since 2026-09-25, drafts and changes limited to wiki content or its generated graph use lightweight validation while ready product, workflow, script, documentation, and skill changes retain the full browser-backed suite. Wiki maintenance runs Mondays, audits missed merges in batches, updates bot pull requests through REST, and rejects duplicate or malformed frontmatter across the full wiki before writing history ([issue #35](https://github.com/JFusco/design-passport/issues/35)).
