# Persistent audit runtime validation

Measured on September 14, 2026 with the Figma desktop plugin runtime. Tracking: [JFusco/design-passport#21](https://github.com/JFusco/design-passport/issues/21). The comparison baseline is a pristine archive of `origin/main` at `a7c42ef`. Figma resolved duplicate development IDs to the feature build, so the baseline uses a separate Figma-assigned development ID. Permissions and document setup are unchanged; profile hashes must match before comparing exports. Private report contents remain outside the repository.

## Native recovery smoke

A page audit on a 36-page design library completed and saved a B/87.8 report with 83 actionable findings. Closing and reopening restored the original timestamp, Findings tab, and expanded contrast finding without a new audit. Waiver controls were disabled on the historical result. Timing observations were too coarse to report an exact restoration duration.

## Larger library

The user-provided larger library contains 64 pages and 32,038 captured nodes. It is view-only, so tests run in Dev Mode without changing design content, configuration, or certification. The fixed page target contains 13 audited roots. The initial report is B/80.8 with 1,371 total findings, including 1,073 actionable findings, and saved successfully.

The following are native plugin console durations for the initial cold run. Context storage is outside the adapter's context-build total; its compression duration overlaps the storage duration and must not be added again.

| Phase | Cold duration |
| --- | ---: |
| Context build | 426,047 ms |
| Validation, within context build | 134,391 ms |
| Inference, within context build | 152,202 ms |
| Base capture, within context build | 23,795 ms |
| Documentation resources, within context build | 34,481 ms |
| Derived indexing, within context build | 37,544 ms |
| Optional context compression/storage | 41,087 ms |
| Compression, within storage | 40,626 ms |
| Target evaluation | 1,626 ms |
| Report save | 2,015 ms |

The cold run captured 320 fragments and reused none. Context compression produced 2,168,637 bytes from 35,885,852 raw bytes. Cache read/write failures were zero. End-to-end UI completion was first observed at 503.8 seconds after the click; the last incomplete observation was 457.7 seconds, so neither observation is an exact completion duration.

Closing and reopening the plugin restored the Modules view, all 13 modules, 1,073 actionable findings, the B/80.8 grade, and the original timestamp without a new audit. Historical export was enabled. The UI was still loading at a 1.288-second observation and was restored by the 10.207-second observation; these are observation bounds, not an exact restoration duration.

## Explicit refresh after reopening

The unchanged-file refresh reused 314 of 320 fragments (31,683 of 32,038 nodes). It still refreshed inference for every node and rebuilt whole-file relationships. Six fragments were recaptured. Cache read/write failures were zero.

| Phase | Cached refresh |
| --- | ---: |
| Context build | 417,276 ms |
| Validation, within context build | 165,014 ms |
| Inference, within context build | 151,233 ms |
| Base capture, within context build | 241 ms |
| Documentation resources, within context build | 36,115 ms |
| Derived indexing, within context build | 37,114 ms |
| Context storage | 588 ms |
| Compression / decompression | 401 / 25,700 ms |
| Target evaluation | 1,751 ms |
| Report save | 2,062 ms |

Exact JSON comparison against the cold run found zero added, removed, or changed findings: all 1,371 findings, frames, axes, profile hash, captured target, and B/80.8 grade matched. Only the completion timestamp and report snapshot hash differed. UI completion was observed between 378.706 and 437.204 seconds after the click.

These measurements demonstrate fragment reuse and report parity, but the verified context build improved only modestly in this single pair. Validation and inference remain the dominant costs. They are not evidence for an instant refreshed audit or a general speedup over main. No medians or repeated-run claim is made.

## Next page and interrupted batches

Reviewing the next page in the same session performed no context rebuild. Its one-target D/69.2 report contained 352 findings (326 actionable); target evaluation took 404 ms and report persistence 451 ms. The completed, saved UI was observed by 1.912 seconds.

A Select all batch captured all 64 page IDs and reused current-session context. Cancellation stopped it after 11 saved reports and three skipped pages with no audit targets. The saved-audits picker retained all 11 results after reopening, and the batch did not resume automatically. A second two-page batch was closed during whole-file validation at zero completed pages; reopening restored the preceding saved result and did not resume work.

Historical Findings state also survived another close/reopen: active tab, Component hygiene axis filter, Show passing, and expanded evidence. Historical node navigation selected the intended node without an audit. JSON and Markdown exports retained the original timestamp and explicitly identified the report as historical; JSON used the separate version-1 envelope and original plugin/knowledge provenance.

## Original-main comparison

The original-main development plugin completed the same 13-target page audit with B/80.8 and 1,371 findings. Exact comparison found identical findings, frames, axes, grades, profile hash, readiness, and applied changes. The completion timestamp, report hash, and whole-file knowledge hash differed; the captured scope and root IDs matched. Both runs used the same document profile. The isolated baseline namespace had no waiver or private guidance differences affecting the compared report.

| Build | Click to report's generation timestamp | Saved UI completion observation |
| --- | ---: | --- |
| Original main | 518.978 s | Between 505.008 and 545.167 s |
| Feature, cold context | 471.851 s | Between 457.7 and 503.8 s |
| Feature, cached explicit refresh | 418.910 s | Between 378.706 and 437.204 s |

The timestamp metric ends before report persistence and UI rendering; feature report saving added approximately two seconds. It is distinct from end-to-end completion. This single comparison measured roughly 19% less time to report generation for the cached refresh than main. It does not establish a median, apply to every file, or imply that all pages finished in that time.

Running the original-main plugin also exercised the real another-plugin workflow. Reopening the feature plugin afterward restored the preceding historical result and all 11 saved report entries without starting a scan.

## Complete 64-page batch

The final 0.2.0 candidate captured all 64 page IDs, built verified whole-file context once, audited 56 eligible pages, and skipped eight pages with no audit targets. The last report was generated 841.793 seconds (14 minutes 1.793 seconds) after the batch started and saved 663 ms later. The Mac locked after the last readable progress observation, so this report timestamp is used instead of an end-to-end UI observation.

The shared context build took 410,017 ms. It reused 319 of 320 fragments and 31,967 of 32,038 nodes, recapturing one fragment with 71 nodes. Inference still refreshed all 32,038 nodes. Validation took 160,937 ms, inference 146,841 ms, documentation resources 34,990 ms, and derived indexing 36,826 ms. Decompression took 24,745 ms; no new context compression or storage was needed. Cache read/write failures were zero.

Every eligible page reported a successful save. The 4 MB budget retained 54 of the 56 reports, evicting the two earliest least-recently-viewed reports. This is the planned bounded-storage behavior, and the completion copy explicitly refers to the local storage limit. The batch does not promise simultaneous retention of every large-file report.

The batch duration is a measured workflow result, not a like-for-like comparison with repeated manual runs in the original plugin, which already reused fresh same-session context. It must not be multiplied or presented as a universal speedup.

## Editable-fixture validation

A separate Verndale fixture contains 65 pages, 63 nonempty targets, two empty pages, local variables and modes, a component set, and a dependent instance. In an isolated final-0.2.0 plugin namespace, Review pages audited all 63 eligible pages and skipped two in 26.356 seconds to the last report; the UI completed by the 36.151-second observation. All 63 reports fit in that namespace. This synthetic timing is functional stress evidence only and is not comparable to the client-file measurements above.

Changing a local variable, component label, propagated instance text, and annotation while Passport was closed produced a D/66.9 report with 23 actionable findings, compared with the prior historical C/76.0 report with 20. A cache-cleared forced-full run produced an exactly matching report after excluding only timestamps and generated snapshot identifiers: zero finding records were added, removed, or changed between the cached and full paths.

A subsequent component-only label edit rebuilt the component-set and dependent-instance roots: two fragments/eight nodes captured while 62 fragments/124 nodes were reused. Its cache-cleared forced-full report again matched the cached findings, grade, axes, frames, profile, and target exactly. Because the shared local-variable and alias digest can affect whole-file token evidence, a variable edit intentionally invalidates every fragment; this preserves correctness at the cost of less reuse for that case.

During a separate reopened validation, moving a fixture frame from x=100 to x=101 while progress advanced from 21 to 49 of 65 pages prevented publication and displayed the changed-design error. The preceding saved report remained historical and browsable. Forget removed one selected result; Clear this file removed the other fixture reports and context without touching a saved report in a separate control file. All fixture mutations were restored after testing.
