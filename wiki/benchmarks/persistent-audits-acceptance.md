# Persistent audit acceptance evidence

Tracking: [JFusco/design-passport#21](https://github.com/JFusco/design-passport/issues/21). Tested on September 14, 2026. Native checks use the real Figma desktop runtime; fault-injection tests use the production storage and plugin message handlers with controlled API failures. Private exports and test-file identifiers are kept outside the repository.

## Recovery and interruption

| Scenario | Evidence | Result |
| --- | --- | --- |
| Close and reopen after saving | Native 36-page library and user-provided 64-page library | Original grades, findings, timestamps, and saved views restored without an audit |
| Findings preferences | Native 64-page library | Tab, axis filter, Show passing, and expanded evidence survived restart |
| Historical navigation | Native 64-page library | Selected the original finding node without refreshing |
| Historical JSON and Markdown | Native exports inspected | Original timestamp, historical status, and versioned JSON provenance preserved |
| Historical mutation restrictions | Native Dev Mode and backend command tests | Cleanup, waivers, contributions, and certification require verified context |
| Cancel a page batch | Native 64-page library | Eleven completed reports remained selectable after cancellation and reopening |
| Complete page batch | Native 64-page library and 65-page editable fixture, final 0.2.0 candidate | Real file audited and saved 56 eligible pages after one context build and skipped eight pages without targets; fixture audited 63 and skipped two |
| Bounded batch retention | Native 64-page library | 54 of 56 reports retained under the 4 MB budget; two oldest reports evicted without save failures |
| Forget and clear controls | Native editable fixture plus separate control file | Forget removed only the selected result; clearing one file removed its reports and context while the control file's saved report reopened unchanged |
| Close during validation | Native two-page batch | Previous completed report restored; interrupted work did not resume |
| Run another plugin | Native original-main plugin between feature launches | All eleven saved reports and the preceding view restored |
| Different file | Native disposable fixture opened after larger library | No library report appeared in the fixture |
| Captured component-set selection | Native editable fixture | Changing the canvas selection before closing did not retarget the saved report |
| Save new audit setup | Native editable fixture and exported hashes | Old report and original configuration hash remained historical; fresh report used the new configuration hash |
| Delete a finding node | Native fixture-only deletion | Saved evidence remained readable; navigation explained that the node no longer existed |
| Delayed startup recovery | Plugin and UI tests | Late restore responses cannot replace a newly requested audit |
| Failed replacement save | Plugin and storage fault injection | New result remains usable in memory; preceding completed result survives |
| Missing stable file identity | Plugin tests | Explicit session-only status; no shared file fallback or batch loss |

## Cache validation

| Scenario | Evidence | Result |
| --- | --- | --- |
| Unchanged reopen and explicit refresh | Native 64-page, 32,038-node library | Reused 314/320 fragments and 31,683 nodes; all 1,371 findings and grades matched cold capture |
| Next-page review | Native larger library | Reused current-session context; saved completion observed by 1.912 seconds |
| Variable and component edit | Native 65-page editable fixture | Cached and forced-full reports matched exactly after timestamp/hash normalization; edited result changed from C76.0/20 actionable findings to D66.9/23 |
| Component-only selective reuse | Native 65-page editable fixture | Rebuilt two dependent fragments/eight nodes and reused 62 fragments/124 nodes; cached and forced-full findings and grades matched exactly |
| Edit during validation | Native 65-page editable fixture | A real position edit while validation advanced from 21 to 49 pages stopped publication, retained the prior historical result, and reported the changed-build error |
| Text, visibility, style, variants, annotations, metadata, bindings, hierarchy edits | Cached versus forced-full adapter tests | Matching complete graphs and reports; affected fragments recaptured |
| Documentation, inference, component dependencies | Adapter tests | Refreshed external evidence even when normalized fragments match |
| Variable values, aliases, modes, collection dependencies | Adapter and plugin tests | Changed dependencies invalidate reuse even without a document-change event |
| Variables change before/during saving or between batch pages | Plugin integration tests | Unpublished attempts preserve their predecessor; completed snapshots become stale; batches stop |
| Inferred remote dependencies appear or change | Adapter tests | Missing IDs remain tracked; metadata is enrolled before grading reads |
| Failed variable, collection, and library reads | Fault-injection tests | Read errors cannot establish unchanged absence or authorize a current result |
| Unavailable bulk export or incompatible/corrupted fragments | Adapter tests | Ordinary capture fallback; saved reports remain independent |
| Sandbox compression | Bundled production codec in isolated VM | Unicode round-trip without browser/Node codecs; malformed UTF-8 rejected |

## Release gate

The full large-file batch, 65-page editable-fixture acceptance, final verification, and independent authority review pass. Review found and fixed same-session variable invalidation, failed dependency-read handling, and a historical-export race; the release candidate verifies dependency epochs at reuse, publication, batch, and mutation boundaries. The editable fixture was restored to its original 65-page, 63-nonempty/two-empty state after testing.

See [runtime measurements](persistent-audits.md) for durations and their observation limits. Single native runs establish the observed behavior, not a general performance guarantee. Storage remains bounded; context and older reports can be evicted, and large files are not promised unlimited simultaneous retention.
