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

## Remaining acceptance

The earlier single matched retained/mixed pair was 2.93% slower on candidate;
the single cold zero-reuse pair was 8.41% faster. The user made the 20%
retained/mixed improvement advisory, but the three-pair audit matrix, reporter
reference, interrupted screen-saver cases, and semantic comparisons are still
unmeasured. The matched three-pair certification median, a failed-command
concurrent-rename rollback with exact prior metadata, and later native Undo
ownership also remain partial. Local fixture tests and the previous full CI
gate support the repair implementation, not those native conclusions. No
further source or harness change was justified by this run.
