---
title: Audit memory and certification verification
topics: [persistent-audits]
plans: [2026-09-30-reduce-audit-memory-use-and-certification-delay-e50b8ab0d1.md, 2026-10-01-complete-design-passport-issue-53-native-acceptance-1953566c5f.md]
---

# Audit memory and certification verification

[Issue #53](https://github.com/JFusco/design-passport/issues/53) covers a reported
out-of-memory audit and roughly five-minute source-frame certification. The
screenshot identifies production build `b85721625f58`; the implementation base
is `8a07fe8`. Both include the whole-file scene-signature check. The reported
file has 71 pages and the linked page has 761 nodes. Deleting a saved report
retains context, so the primary reproduction includes cache reads and misses.

## Changes and decisions

- Remove one redundant cache-read clone and replace whole-build raw staging
  with bounded encoded staging. Stop producing optional fragments after quota
  saturation; recheck quota when publishing. Preserve cancelled-build discard,
  report protection, file isolation, and existing cache formats.
- Retain one verifier over the union of variable dependencies and style
  evidence. Preserve the original library verifier and all scene signatures.
  Keep the local inventory fingerprint so additions during capture still
  invalidate the previous graph.
  Release inference snapshots that cannot support the next build.
- Resolve every certification target and variant before the first full check.
  Write synchronously and run a second full check before the final undo commit.
  Mark writes as started before a setter can fail partway through. Preserve
  annotations, readiness rules, and existing native rollback.
- Use local busy state and a ref guard for duplicate clicks. Keep the pressed
  button busy through stale notices and nonterminal errors. No progress
  protocol, screen-wake handler, cache migration, or audit-scope change was added.
- Extend console diagnostics for restore, REST export, fingerprints, resources,
  scene signatures, storage inventory, and staged bytes. Audit/save checks
  remain at their existing asynchronous boundaries.

## Review repair

- A cancelled certification now ends the local busy state, so another action
  can start without reopening the plugin. The busy button remains available to
  assistive technology on Overview, and the polite status region announces
  certification. Other panels keep competing actions blocked during the check.
- Saved-audit tab changes continue to reach local view storage while
  certification is pending. They do not mutate the design.
- Context staging now inventories storage when the first fragment is offered.
  Forced full builds and builds whose fragments are all cache hits skip that
  inventory; a build with fragments still checks capacity at staging and again
  before publication.
- Certification intentionally checks readiness before its first full resource
  verification. A report below grade B receives the readiness error first.
  The ready-report integration fixture exercises an unannounced variable edit
  through the real adapter, including the stale notice and absence of writes.
- Historical export buttons stay disabled if a stale notice arrives during
  certification. After the terminal response, they become available again;
  the browser case checks both states and one JSON export request.

## Local verification

Command tests exercise two resource inventories and two complete signature
walks for both one and three certification targets. Adapter tests exercise 20
refreshes with one local-variable inventory per subsequent check and retain
remote/style dependencies from untouched fragments. Storage tests cover
saturation, zero allowance, rejected staging, and capacity changes before
publication. Existing equivalence and cancellation tests remain required.

Browser tests run the actual React UI against fixture messages and exercise
same-task double clicks, blocked refresh, stale and nonterminal notices, and
success/error/profile-invalidation completion. These are UI tests, not native
Figma evidence. `DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci` passed:
497 tests in 50 files, five browser tests, type checks, lint, generated-data
checks, wiki/skill checks, and companion/plugin builds.

After the review repairs, the restricted implementer sandbox passed 500
Vitest tests in 50 files, type checks, lint, and the companion build, but
denied Playwright's local server bind and a direct Chromium launch. A later
host-side `DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci` passed on the
repaired tree: 500 Vitest tests, seven Chromium tests including five plugin
certification cases, generated-data and wiki/skill checks, type checks,
lint, and companion/plugin builds. The wiki graph was regenerated before
that full run.

The test server accepts `DESIGN_PASSPORT_E2E_PORT` so verification can run on
5190 without interrupting QA Operations on 5180. Default behavior stays on
5180. This override affects only the Playwright test server and test origin.

The security review found no high-confidence vulnerabilities in the changed
local persistence and freshness paths. No credentials, upload handling,
companion access policy, network destination, or stored schema changed.
Native undo ownership during a concurrent designer edit still needs evidence.
The new loading copy is `Certifying…`, reviewed with writing-guidelines.

## Native follow-up in progress

On a disposable copy of the reported 71-page file, the clean `307c6925feee`
development build reached the final page fingerprint, then showed Figma's
`out of memory` error. The Mac locked during the run, but the audit continued
after unlock. This reproduces the reported failure; it does not establish the
cause or a memory improvement. A production-channel current-main QA harness
from `8a07fe8f480a` completed a current-page audit on the same copy. Its
exported native evidence records 71 checked pages, 81,888 captured nodes,
5,811 captured fragments, a 956,586 ms context build, and 1,290,138 ms until
the report was visible. The report was B (82.1), ready, with 484 findings and
knowledge snapshot `h53:1a60b81de9cdfa`. This is one baseline run, not a
controlled retained/mixed/cold comparison. The raw evidence stays outside
the repository.

The clean pushed-branch `645bd0504558` production QA harness completed on the
same page without the earlier memory error. Its first run reused 1,241
fragments (47,606 nodes), so it is a mixed-cache observation and cannot be
compared with the main run as a cold timing pair. It captured 4,570 fragments,
completed context building in 977,200 ms, and showed the report in 1,268,187
ms. The B (82.1) ready report has the same knowledge hash, 484 findings, and
113 issue groups. Excluding producer, generation time, and their derived report
hash, every report field matches main; all 42 repair plans match exactly. A
separate branch run after clearing rebuildable context and restarting the
plugin completed with zero reused fragments and 81,888 captured nodes. Its
context build took 1,082,480 ms and its report became visible in 1,383,876
ms, 7.3% slower than the single main baseline end to end. This one pair is
within the plan's 10% cold-audit limit; it is not a three-run acceptance
sample. The normalized report and all 42 plans match main again. The branch
context-build phase alone was 13.2% slower, which remains worth investigating
if repeated runs show the same pattern.

A later fresh-session run with retained storage reused 1,225 fragments and
47,313 nodes on both builds. The clean branch showed its report in 1,251,243
ms; current main showed it in 1,233,680 ms. The branch was 1.4% slower in
this matched pair, so the planned 20% retained/mixed audit speedup is not
demonstrated. Both saved B (82.1) ready reports with 484 findings and 42
plans. The cache is quota-limited and captured the other 4,586 fragments in
each run; neither run represents a fully retained file.

The matched branch export attributes 260,375 ms (20.81% of report-visible
time) to four whole-file scene-signature passes; the corresponding resource
checks total 1,291 ms. Scene walks account for 89.57% of the labeled report
evaluation phase and 96.04% of report persistence. Graph finalization took
112,620 ms (9.00%). These measurements identify costs in the earlier native
run. They do not measure the later child-array change or justify removing
freshness checks.

On the disposable copy, the current-main source-frame certification then
reported success for all six targets. The QA event timeline records its
`certified` response at 02:21:09 UTC. The main UI did not show a local busy
state or disable its button during the request. Repeat clicks produced
`Cannot start certify; certify is still running`, and later produced a stale
context error that displaced the success notice. Because the first click was
not timestamped by the QA harness, this is native UI and completion evidence,
not a certification speed baseline. The branch's visible `Certifying…` state
and duplicate-click guard address this confusing main-build behavior in local
browser tests, but native branch certification and concurrent-edit undo are
still unverified.

Follow-up changes keep the full file scope and hashes intact. Large-file
phase markers now distinguish resource collection, instance resolution,
variable resolution, graph metrics, and finalization. Repeated-structure and
responsive grouping append to existing arrays instead of copying each group
on every member. Certification also shows its status in the existing visible
info banner, including when the pressed button has scrolled out of view.
The local full `verify:ci` gate passed after these changes: 500 Vitest tests,
seven Chromium tests, type checks, lint, generated-data and wiki checks, and
builds. The native checks below test report equivalence and one cold and
retained timing pair. Full performance and rollback acceptance remain open.

## 2026-10-01 measurement and harness follow-up

The synchronous capture traversal now reads each parent's child array once.
A probe executing the actual function against a 10,000-child fixture reduced
getter reads from 10,001 to one and preserved all 10,001 entries exactly.
Traversal order, visibility and ownership filters are unchanged. No evidence
is cached across an await; native speed impact remains unmeasured.

The development harness measures both production certification commands and
retains their certified result separately from handler fulfillment. It keeps
an overlapping measured command's rejection out of the active result. Read-only
inspection now captures exact prior certificate strings, full annotations and
relaunch data. A bounded, correlated document-change observer records up to
200 changes and discloses truncation. Registration failure is reported as
`observationUnavailable` and still enters production's own handler; observation
and cleanup add no writes or undo boundaries.

The QA collapse summary remains visible after scrolling and exporting at a
500 by 400 viewport. Standalone Chromium checks passed click, Enter and Space
toggling. This is browser fixture evidence, separate from native Figma proof.
The tested UI source SHA-256 was
`d5393153a9e170d9e8f346f3597b2bff82d8597a8d397ee1e82c7241a46b2d22`.

The native protocol compares correlated runtime `handlerElapsedMs`. UI receipt
intervals can compress or inflate elapsed time when messages are delayed: a
VM reproduction preserved a 60,000 ms runtime duration while showing only
100 ms between UI receipts. Document-change timestamps are callback observation
times; they cannot establish exact native-edit placement by themselves. The
protocol requires independent action timing and exact prior metadata restored
while the designer rename survives. `qa-edit` changes undo boundaries and is
excluded from that proof.

Independent recheck passed the original six repairs in run
`1361bb2e-3198-41ae-b71c-24e0c84157cd`, then identified the observer-registration
and timing-documentation follow-ups. Fresh run
`e659e850-8853-45e3-a29f-e748b1abb2cf` repaired and independently verified both.
The focused harness/context-cache suites passed 54 tests, and typecheck passed.
The full `DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci` gate then passed:
504 Vitest tests in 50 files, seven Chromium tests, type checks, lint,
generated-data/wiki/skill checks, and companion/plugin builds.
No production certification logic, persistent schema, hash format, credential
handling or original design file changed in this follow-up.

## Outstanding native acceptance

Earlier native sessions produced the audit comparisons and current-main
certification completion recorded above. The harness follow-up has local
source and browser evidence; native timing and concurrent-edit undo remain
pending. Native app access was unavailable at the last follow-up attempt.
The plan archive is partial until the following checks are complete:

1. Run the reporter build, current main, and candidate on the same machine and
   disposable file copy with the same audit setup. Enable DevTools Preserve
   log before opening the plugin. Record producer identity and the last started
   phase; do not use UI iframe heap as a plugin heap measurement.
2. For retained, mixed, and cold cache, run the reported sequence with and
   without screen-saver interruption. Require three consecutive successful
   candidate runs per variant. Record active time separately from wall time,
   visibility changes, node counts, cache hits/misses, and fragment sizes.
3. Compare graph hashes, findings, grades, readiness, and repair plans against
   full capture. Time resource checks, scene walks, exports/fingerprints,
   storage inventories, total audit, and total certification separately.
4. Targets versus current main: at least 60% lower certification time, at least
   20% lower retained/mixed audit time, and no more than 10% slower cold audits.
   Set a scene-walk timing target from the measured baseline. These targets
   are unverified.
5. Edit as a designer during final asynchronous certification verification,
   force verification failure, and confirm native undo restores every exact
   prior certificate string, annotation and relaunch value while preserving
   the designer edit. The disposable copy already has six prior certificates;
   empty metadata is not the baseline. Mocks prove rollback is requested;
   they cannot establish Figma's undo-group ownership.

Keep the PR open for review. Its `Closes #53` reference closes the issue only
when merged into the default branch. No merge or plugin publication is part
of this delivery.

## 2026-10-01 repaired-harness native continuation

The repaired QA harness was generated from clean production bundles at main
`8a07fe8f480a` and candidate `da3b0c2eb2c7`. Both retained the production
bytes, used the same isolated development plugin ID, and allowed document
writes only in the disposable Colliers copy. Read-only inspection confirmed
the expected page and all six source roots. Their exact existing certificate
strings, complete annotations, and relaunch data were exported privately
before the runs; the original Colliers file was not opened or changed.

One new native retained/mixed pair completed with correlated handlers. Main
showed the report in 692,257 ms and candidate in 712,542 ms: candidate was
2.93% slower, missing the 20% faster target. Main reused 1,221 fragments;
candidate reused 1,226, so the cache states were close but not identical.
Both had the same whole-file knowledge hash, B 83.2 readiness, 484 report
findings, 107 groups, and 36 plans. After validating each original report
hash, normalized reports matched when producer and generation identity were
excluded; plans matched exactly. The stock comparator correctly rejected
cross-build identity, so its release-parity flag was not used as proof.

After clearing rebuildable context and restarting each plugin, a cold pair
reused zero fragments and captured all 81,888 nodes on both builds. Main
showed the report in 796,036 ms and candidate in 729,099 ms, an 8.41%
improvement for this one pair. Their normalized reports and plans matched.
This single result is within the 10% cold-regression limit; it does not
satisfy the repeated matrix. The candidate retained/mixed run spent
570,880 ms building context, including 180,733 ms in validation and
169,896 ms in inference. Four complete scene checks took 133,987 ms.
Removing those checks would violate the freshness boundary and would still
fall short of the approximately 159,000 ms needed for the 20% target.
No new optimization is justified by this evidence alone.

| Native run (production build) | Reused fragments / nodes | Terminal and handler | Timing origin | Dropped events / runs |
| --- | ---: | --- | --- | ---: |
| Main retained/mixed (`8a07fe8`) | 1,221 / 46,607 | completed / fulfilled | `qa-send` | 0 / 0 |
| Candidate retained/mixed (`da3b0c2`) | 1,226 / 47,320 | completed / fulfilled | `qa-send` | 0 / 0 |
| Main cold (`8a07fe8`) | 0 / 0 | completed / fulfilled | `qa-send` | 0 / 0 |
| Candidate cold (`da3b0c2`) | 0 / 0 | completed / fulfilled | `qa-send` | 0 / 0 |
| Main fresh audit before certification (`8a07fe8`) | 0 / 0 | completed / fulfilled | `qa-send` | 0 / 0 |
| Candidate source-frame certification (`da3b0c2`) | n/a | certified (6) / fulfilled | `qa-handler-start` | 0 / 0 |
| Main source-frame certification (`8a07fe8`) | n/a | certified (6) / fulfilled | `qa-handler-start` | 0 / 0 |

The main audit before certification showed its report in 688,189 ms.
Audit comparison uses `reportVisibleElapsedMs`; certification comparison
uses runtime `handlerElapsedMs`. Each export was taken after correlated
handler completion. The Mac lock was observed as denied UI access, but its
onset and end were not directly timed or accompanied by visibility evidence.
No active-time estimate can be derived from those wall intervals, and none
of these attempts counts as a controlled screen-saver case.

The candidate then certified six source frames through the ordinary
production button. The exported `certified` terminal event and correlated
handler completion recorded runtime `handlerElapsedMs` of 60,816 ms. The
iframe receipt interval was only 157 ms, confirming that it is unsuitable
for this timing comparison. The document-change observer was available but
recorded no callback during that successful command; this cannot prove a
concurrent designer edit. A fresh main audit also completed and its ordinary
production button certified all six roots with a correlated runtime duration
of 238,003 ms. The Mac locked during that attempt, and the screen-saver
interval could not be bounded. The observed candidate/main ratio is 0.256,
but this is not an uninterrupted matched pair or a controlled screen-saver
case. Three matched successful certification pairs, the audit matrix, and
exact native rollback remain open.

For a later rollback attempt, the repaired candidate harness exported a new
read-only inspection of all six source roots. It captured each exact prior
certificate string, complete annotation objects, relaunch data, and name;
all six carried existing certificates from the successful native runs. A
fresh candidate current-page audit started, but the Mac locked while it was
building whole-file context. Native access could not be restored without a
manual unlock, so completion was not observed and no designer rename or
rollback assertion was made from this attempt. The private inspection export
and every earlier native export were retained.

## 2026-10-02 unlocked native continuation

After the Mac was unlocked, the interrupted candidate audit was observed to
have completed with a fulfilled handler. The lock interval remains unbounded,
so its 1,284,169 ms report-visible time is not an uninterrupted benchmark.
Read-only inspection confirmed the same six source roots in the disposable
copy. The exact prior certificate strings, full annotations, relaunch values,
and names survived the lock and a later prewrite failure.

A fresh candidate audit completed in 1,627,649 ms of report-visible time.
Its knowledge was built at 02:25:57 UTC; ordinary certification started at
02:40:21 UTC and crossed the 15-minute freshness limit during the first
whole-file verification. It failed before writing after 93,681 ms of runtime
`handlerElapsedMs`. A postfailure read-only inspection matched all six prior
metadata and names exactly. This proves absence of a prewrite mutation, not
concurrent-edit rollback.

An ordinary candidate recheck completed in 1,410,495 ms of report-visible
time and built fresh knowledge. The next two production-button certification
requests reached `certified` for all six roots with correlated fulfilled
handlers in 152,343 and 148,564 ms of runtime `handlerElapsedMs`. A mistaken
native rename targeted an enclosing section only after final verification
ended; the section name was restored through Figma's layer UI. No audited root
was renamed in that attempt.

Another candidate recheck completed in 1,003,585 ms of report-visible time.
Its certification reached `certified` for six roots in 142,565 ms. A click on
the selected audited root occurred while the second scene check was visible,
but the layer-name editor appeared only after certification finished; no
rename was committed. A further production-button request from the same
knowledge reached `certified` in 144,334 ms. During its second scene check,
the desktop layer and properties controls did not accept an edit; the root
name remained unchanged. These attempts do not establish rollback.

A later fresh candidate audit completed with a fulfilled handler in
1,291,342 ms of report-visible time. Its knowledge was built at 04:05:31 UTC.
All six root IDs were checked by explicit read-only inspection before each
ordinary production-button certification. Two requests then reached
`certified` for six roots with correlated runtime durations of 141,864 and
142,342 ms. Each exported run had zero dropped records. They are candidate
timing samples; a matched uninterrupted main series is still required.

The repaired main harness was then imported and its production revision,
bundle hash, QA harness hash, isolated development plugin ID, and single-copy
write allowlist were verified. Six explicit root inspections matched the
expected file and page before its fresh current-page audit began at
04:24:33 UTC. The UI reached 70 of 71 supporting pages. Figma was accessible
at 04:39:33 UTC, but native control reported the Mac locked at 04:40:33 UTC.
The lock start is bounded by those observations. The audit finished at
04:46:47 UTC with a completed report and fulfilled handler; its
`reportVisibleElapsedMs` was 1,332,062 ms, and the export had zero dropped
records. Knowledge was built at 04:39:28 UTC. Native access was still locked
at 04:57:31 UTC and was first observed restored at 20:05:07 UTC, so the lock
end is only bounded by that broad interval. Certification knowledge had long
expired. This is a completed interrupted audit, not an uninterrupted speed
sample. Its active-time estimate is unresolvable from these observations and
must not be described as CPU time. No unlock bypass was attempted.

After the next manual unlock, six explicit root inspections again matched
the disposable file and target page. A fresh main audit started at
20:06:20 UTC and completed at 20:30:20 UTC with a fulfilled handler, a
1,437,840 ms report-visible interval, and zero dropped evidence records.
Its knowledge was built at 20:22:31 UTC. The production certification
control was offscreen behind the expanded QA pane; attempts to activate it
did not produce a certification command. An export at 20:38 UTC confirmed
that only the two main audits were recorded. The UI then marked the audit
historical because its knowledge expired. No certification outcome or timing
is inferred from the attempted click.

The QA pane was collapsed and the ordinary production `Refresh audit`
control was located in the saved report. That refresh began at 20:40:11 UTC
and reached 65 of 71 supporting pages. Native control reported the Mac
locked again before its terminal state could be observed. This refresh is
pending, and it does not count as a completed timing or certification sample.
The user was asked for another manual unlock; no bypass was attempted.

The user relaxed the 20% retained/mixed audit improvement from a hard stop
for further native work. The measured 2.93% regression remains the observed
result, with no safe evidence-backed narrow repair identified. The repeated
audit matrix and its speed threshold remain unsupported; this change in
priority does not turn the speed gate into a pass.

The completed exported requests have terminal outcomes and correlated handler
completion with zero dropped runs and events. Audit comparisons use
`reportVisibleElapsedMs` from `qa-send`, while ordinary certification uses
runtime `handlerElapsedMs` from `qa-handler-start`. These extra candidate
certifications lack matched uninterrupted main runs, so they cannot establish
the median 60% speed target. Raw exports and exact design metadata remain
private.

## 2026-10-03 native rollback defect and scoped repair

The previously pending main refresh completed at 21:00:32 UTC with a
fulfilled handler, zero dropped records, and 1,215,456 ms report-visible
time. Native access was locked during it, so it is not an uninterrupted
speed sample. A fresh main audit completed at 23:54:24 UTC in 1,461,798 ms;
knowledge was built at 23:45:40 UTC. Ordinary certification started at
23:54:56 UTC and failed stale at 00:01:05 UTC after 364,130 ms of runtime.
The knowledge expired during verification. There was no certified outcome.

Two QA fixture pages were inadvertently created in the authorized disposable
copy during delayed UI interaction. Both were removed through Figma's native
page menu. A subsequent read-only export confirmed 71 pages and the expected
target page. Both the incident and cleanup exports are retained privately.

A fresh candidate audit completed at 00:43:21 UTC in 1,770,567 ms
report-visible time, with zero dropped records. The editor and developer
tools were active, so it is not a matched speed benchmark. Ordinary
certification succeeded for all six roots in 76,765 ms runtime. Read-only
inspection immediately afterward captured each new certificate string,
complete annotation objects, relaunch data, and name.

The next ordinary candidate certification started at 00:48:13 UTC and failed
stale at 00:49:20 UTC after 66,798 ms runtime. Its second scene verification
ran from 00:48:48.047 to 00:49:20.434 UTC. A designer rename was initiated
near the end of that interval and later appeared in the native layer list and
read-only inspection. The UI did not show the committed layer name within a
bounded interval before verification finished, so exact interleaving is
unproven. There was no `certified` terminal outcome. All six postfailure
certificate strings, full annotations, and relaunch values matched the older
pre-first-certification snapshot, not the immediate prior snapshot. The
rename survived. This is a native exact-prior rollback failure even though
the failed command's bounded document-change observer reported no changes.

The failure identified `figma.triggerUndo()` reversing an earlier successful
certification after awaited whole-file verification. The scoped repair takes
exact prewrite snapshots of owned metadata for roots and variant annotations,
then compensates those fields directly on failure. It leaves names intact
and preserves concurrent changes to non-certification annotations and other
relaunch entries. It adds no catch-path undo commit. Focused tests passed
(48 in two files); an independent read-only review found no remaining code
blocker. `DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci` passed 505 unit
tests in 50 files and seven Chromium tests after the sandbox's local bind
restriction required an escalated rerun. Native proof of this repaired
behavior and subsequent Undo ownership is still pending. All raw exports
remain private; fixture evidence is not native proof.
