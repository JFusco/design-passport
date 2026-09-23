---
status: "implemented"
executed: true
evidence: ["JFusco/design-passport#21; branch codex/persistent-audits-and-faster-repeat-reviews; src/plugin/audit-storage.ts; src/plugin/main.ts; src/figma/context-cache.ts; 294 tests across 35 files; pnpm verify; native 64-page/32,038-node parity and full batch; native 65-page editable-fixture acceptance; wiki/benchmarks/persistent-audits-acceptance.md"]
source_tool: "codex"
source: "codex:/Users/joe.fusco/.codex/sessions/2026/09/14/rollout-2026-09-14T13-19-23-01a0a0ee-3da9-7101-9c6f-3e991fdd368b.jsonl, codex:/Users/joe.fusco/.codex/sessions/2026/09/14/rollout-2026-09-14T13-44-24-01a0a105-2438-7b23-80c0-c7a0e0d39d97.jsonl"
topics: ["persistent-audits"]
digest: "898685bc09afe1b07465146858eb186375997f2a10fb919eae22f780fdbc1340"
---

# Persistent audits and faster repeat reviews

## Summary and repository setup

Save completed audits automatically, restore them immediately after reopening, and accelerate page and component reviews through validated context caching. Include a batch action for reviewing multiple pages.

Before implementation:

1. Create a GitHub issue in **JFusco/design-passport** titled **[Feature] Persistent audits and faster repeat reviews**, with the existing labels **bug** and **enhancement**. Include the designer feedback, this plan’s requirements, and acceptance criteria using the sections Summary, Context, Details, Expected Outcome, and Additional Notes. Check for an exact existing issue before creating a duplicate, then verify its labels.
2. Fetch the latest `origin/main` and create **`codex/persistent-audits-and-faster-repeat-reviews`** from it in an isolated worktree, preserving existing local changes.
3. Reference the issue in the implementation’s tracking documentation. Resolve issue-access failures before creating the dependent branch.

Use bounded local storage. Saved results remain available for browsing and export while an explicitly requested audit verifies the current design. Final grades, cleanup, and certification require verified context.

## Saved results and recovery

- Retain the latest completed result per file and target: page ID, canonical selection of node IDs, or file scope. Automatically reopen the last-viewed result, falling back to the most recently completed audit.
- Add a saved-audits picker showing target, date, and grade. Preserve the active tab, findings filters, and expanded finding; provide controls to forget a result or clear the file’s cache.
- Save the complete report, captured target, cleanup previews, knowledge summary, advisory insights, and original configuration/version provenance. Keep historical configuration separate from the current audit setup.
- Complete the save attempt before announcing audit completion. Failed or cancelled audits preserve the previous completed result. Storage failures leave the new result usable in memory and clearly marked “Not saved.”
- Restore results as historical, with their original timestamp. Browsing, node navigation, and historical export work immediately; cleanup, waivers, learning contributions, and certification require a successful refresh. Missing nodes produce a clear navigation message.
- Session reference packs remain session-only. Previously generated advisory insights remain visible as historical content.

Use compressed `Uint8Array` records with a pinned, sandbox-compatible JavaScript codec. Figma provides **5 MB total per plugin**, so use a conservative 4 MB working budget accounting for existing storage. Evict reusable context first, then least recently viewed reports. Write replacements successfully before removing their predecessors; use independently discoverable records so interruption or concurrent plugin instances cannot overwrite the entire inventory. [Figma clientStorage](https://developers.figma.com/docs/plugins/api/figma-clientStorage/)

Require `figma.fileKey` for persistent file identity. When unavailable, retain session behavior with an explicit save-status explanation.

## Faster, verified context reuse

- Instrument page loading, node capture, resources, components, variables, indexing, rule evaluation, compression, and storage. Record cache hits and rebuild reasons locally.
- Remove repeated inference reads, request documentation resources once per page, deduplicate variable/collection lookups, and use bounded concurrency for independent asynchronous reads.
- Persist normalized context in independently reusable fragments per top-level root, with shared page metadata. This lets an edited component invalidate its containing fragment while other fragments remain reusable.
- On a new audit after reopening, start change tracking and validate the whole file using per-page `JSON_REST_V1` exports plus necessary Plugin API supplements. Figma documents bulk export as a faster serialization path for large node trees. Raw exported text stays transient. [Figma export API](https://developers.figma.com/docs/plugins/api/ExportSettings/)
- Build dedicated cache fingerprints covering hierarchy, ancestor context, audit-relevant properties, plugin metadata, annotations, documentation resources, component relationships, and configuration/version compatibility. Do not use the existing report or knowledge hash as proof of cache validity.
- Validate variable dependencies using values, aliases, scopes, collection modes, resolved node modes, and relevant remote inventory. Unverifiable dependencies force fresh inference reads; unsupported export data falls back to ordinary capture for the affected fragment or page.
- Reuse only validated fragments, rebuild changed fragments, and recompute whole-file relationships before evaluating the captured target. Preserve whole-file token-evidence semantics so grades cannot depend on which component was audited first.
- Retain the existing freshness ceiling for cached enrichment. A matching timestamp or unchanged page list never establishes freshness after reopening. Changes during validation prevent publication of a current result.

Context persistence is opportunistic: cache eviction reduces acceleration but does not make saved reports unreadable. Do not promise that all 65 page reports and their entire context will fit simultaneously.

## Batch workflow and interfaces

- Add **Review pages** with a page checklist and Select all. Capture page IDs when starting, prepare verified context once, then generate and save a separate page-scoped report for each page.
- Show page-level progress and allow cancellation between pages. Preserve completed results, skip empty pages with an explanation, and stop if context changes or expires. Do not automatically resume interrupted batches on reopening.
- Introduce versioned saved-audit and context-cache types, explicit report freshness/save status, and plugin messages for saved-result selection, deletion, view-state updates, and page batches.
- Preserve the existing `ReadinessReport` format and current-report exports. Historical JSON exports use a separate versioned envelope identifying the enclosed report as historical; Markdown exports display the same status and timestamp.
- Update product copy and documentation to explain automatic local saving, retention limits, and explicit refresh behavior. No backend, authentication, or network permissions are added.

## Validation and delivery

- Test closing/reopening, running another plugin, switching files, individual components, page selections, profile changes, deleted targets, and restoration in Dev Mode.
- Test quota exhaustion, oversized records, corrupted or incompatible cache entries, interrupted replacement writes, concurrent records, and delayed startup responses. Previous completed results must survive unsuccessful replacements.
- Compare cached and forced-full findings and grades for unchanged files and edits to text, visibility, variants, annotations, hierarchy, bindings, variables, modes, and component dependencies.
- Test 65-page batches, cancellation, empty pages, and edits during execution. Verify unchanged fragments skip expensive capture and every published report uses complete verified context.
- Benchmark cold, unchanged reopen, component-edit, next-page, and batch workflows on representative Figma files. Require demonstrated improvement before claiming a speedup; synthetic timings alone are insufficient.
- Deliver recovery, capture optimizations, persistent validation, and batching as successive reviewable changes on the new branch. Run `pnpm verify`, update manual QA, and archive the executed plan with the required wiki updates while preserving existing unrelated edits.

False-positive rule changes remain a follow-up until the designers provide concrete examples. The recovered reports preserve the evidence needed to investigate them.
