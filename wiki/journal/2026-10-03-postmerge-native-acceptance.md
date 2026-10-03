---
title: Postmerge native acceptance for issue 53
topics: [persistent-audits]
plans: [2026-10-01-complete-design-passport-issue-53-native-acceptance-1953566c5f.md]
---

# Postmerge native acceptance for issue 53

[PR #54](https://github.com/JFusco/design-passport/pull/54) merged as
`382506b` after the user authorized it. Issue 53 was reopened because its
native acceptance remains partial. The repaired production source at
`5df347c` is byte-identical in the merged branch. The native harness identified
that revision, production code SHA-256
`c354921a03d232cffe200361e8a9a9e97c7d66e5cca32fecb19fd32848de1e4e`,
harness SHA-256
`9fa4b1b6aa6af036535a13295b3b45cfd9fce40e5ed13d6279433e78cb462709`,
the isolated development plugin, and a one-file write allowlist. The unlocked
native session, current page, 71 pages, and six intended source roots were
checked on the authorized disposable copy. Raw design exports remain private
in Downloads; earlier exports were retained. The original design file and
published plugin were untouched.

## Candidate runs

An initial fresh audit completed in 1,352,216 ms `reportVisibleElapsedMs`;
the handler completed in 1,353,333 ms. Three subsequent refresh audits
completed in 483,316, 487,076, and 497,153 ms report-visible time, with
handler durations of 557,851, 560,823, and 574,422 ms. These audits used
successive cache states and changing root names. They are neither matched
main–candidate pairs nor cold zero-reuse samples. No screen-saver interval
was observed or measured in these runs, and no active CPU-time claim follows.
All four handlers fulfilled, and every export reported zero dropped runs and
events.

The four ordinary production-button certifications all reached `certified`
for six roots with correlated fulfilled handlers. Runtime
`handlerElapsedMs` values were 157,877, 149,610, 138,499, and 140,811 ms.
The first certification had no controlled overlapping edit. These candidate
samples have no matched uninterrupted main series, so the median 60%
certification-speed target remains partial. UI receipt timestamps are not
substituted for handler timing.

## Concurrent designer renames

Before each of the last three certifications, read-only inspection exported
all six exact certificate strings, complete annotations, relaunch data, and
names. A separate Figma browser client changed one audited root through its
native layer name field. The interval from immediately before the rename
action to the field visibly showing the committed new name was independently
recorded inside the desktop plugin's final verification interval:

| Attempt | Final verification UTC | Visible rename interval UTC | Result |
| --- | --- | --- | --- |
| 1 | 03:39:12.606–03:40:24.697 | 03:39:46.425–03:39:48.012 | `certified`, handler 149,610 ms |
| 2 | 03:55:19.874–03:56:28.322 | 03:55:42.007–03:55:43.171 | `certified`, handler 138,499 ms |
| 3 | 04:11:23.707–04:12:33.339 | 04:11:47.312–04:11:48.673 | `certified`, handler 140,811 ms |

Each browser action interval had more than 20 seconds of margin before the
desktop verification finished. The desktop observer recorded no change
during any of the three commands. Its `knowledge-stale` event arrived 460,
465, and 303 ms after the corresponding handler completed. A final read-only
six-root comparison against the immediately preceding snapshot found six
changed certificate strings, six changed relaunch values, no annotation
changes, and the one designer rename preserved. Those are success-path
effects, not exact-prior rollback proof. No failed certification occurred in
these three attempts; the repaired compensation path and subsequent native
Undo ownership remain unproven.

The browser field's visible commit establishes a concurrent edit in that
client. It does not establish that the desktop plugin had received the
remote change before its last read. [Figma documents that `documentchange`
callbacks are asynchronous and batched](https://developers.figma.com/docs/plugins/api/properties/figma-on/).
The observed after-handler callbacks are consistent with that contract. No
documented delivery bound supports a fixed delay or a claimed source fix.
The whole-file verification, audit/save boundaries, hashes, and coverage were
left intact.

## Followup target-name verification

The production candidate now reads the six audited target names immediately
after each certification scene verification. A mismatch marks knowledge stale
and enters the existing exact-prior-metadata compensation path. This bounded
check supplements the asynchronous document-change callback; it does not
replace whole-file verification or change the audit/save boundary. Independent
source review identified a lookup race, which was repaired and covered by a
focused asynchronous test. Focused tests and typecheck passed.
The full `DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci` gate passed
508 unit tests and seven Chromium tests after a sandbox-only localhost bind
denial was resolved with local permission. Independent final review found no
source blocker to retaining this as partial protection.

A dirty exploratory native harness identified the working source and isolated
development plugin on the same disposable file with a one-file write
allowlist. A fresh six-root audit completed with a fulfilled 1,374,309 ms
handler and zero dropped records. An ordinary certification with no rename
certified six roots with a fulfilled 71,587 ms handler. Its second postwrite
scene verification lasted 37,755 ms. This control sample establishes timing
for a subsequent concurrent-rename attempt, not rollback proof or a clean
release check. The raw exports remain private and earlier exports remain
intact.

A subsequent refresh completed with a fulfilled 704,523 ms handler and zero
dropped records. Read-only inspection saved six exact prior certificate
strings, full annotations, relaunch data, and names. An ordinary production
certification began at 13:42:09 UTC. Its second scene verification ran from
13:42:41.431 to 13:43:12.327. A separate Figma client visibly committed a
native layer rename from 13:42:59.406 to 13:43:00.574, with more than 11
seconds of margin before verification ended. The command nevertheless emitted
`certified` for six roots at 13:43:12.638 and a correlated fulfilled handler
at 13:43:12.639 (`handlerElapsedMs` 62,578). The desktop observer saw no
change during the command; `knowledge-stale` arrived at 13:43:12.836. Exact
post-inspection found all six certificate strings and relaunch values changed,
four annotation sets changed, and the designer rename retained. This is a
repeatable cross-client freshness miss, not failed-command rollback proof.
The bounded live-name check did not see the remote rename before success.
The dirty-build native result is a release blocker for issue 53.

## Remaining acceptance

The earlier single matched retained/mixed pair was 2.93% slower on candidate;
the single cold zero-reuse pair was 8.41% faster. The user made the 20%
retained/mixed improvement advisory, but the three-pair audit matrix, reporter
reference, interrupted screen-saver cases, and semantic comparisons are still
unmeasured. The matched three-pair certification median, a failed-command
concurrent-rename rollback with exact prior metadata, and later native Undo
ownership also remain partial. Local fixture tests and the full CI gate
support the scoped implementation, not those native conclusions. The failed
native cross-client check requires a separate product decision before release.
