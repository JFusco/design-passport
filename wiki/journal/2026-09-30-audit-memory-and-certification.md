---
title: Audit memory and certification verification
topics: [persistent-audits]
plans: [2026-09-30-reduce-audit-memory-use-and-certification-delay-e50b8ab0d1.md]
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

## Outstanding native acceptance

Native app control resumed after the Mac was unlocked. One current-main audit
completed, and the earlier clean candidate run reproduced an out-of-memory
failure. Neither result establishes a speedup or acceptance across cache
variants.
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
   force verification failure, and confirm native undo removes certification
   metadata while preserving the designer edit. Mocks prove rollback is
   requested; they cannot establish Figma's undo-group ownership.

Keep the PR open for review. Its `Closes #53` reference closes the issue only
when merged into the default branch. No merge or plugin publication is part
of this delivery.
