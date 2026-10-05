---
topics: [persistent-audits, figma-runtime-qa]
plans: [2026-10-04-reuse-validated-session-snapshots-for-53-232f64d68f.md]
issue: 'https://github.com/jfusco/design-passport/issues/67'
issues:
  [
    'https://github.com/jfusco/design-passport/issues/67',
    'https://github.com/jfusco/design-passport/issues/53',
  ]
---

# Reuse validated session snapshots during audit refresh

## Change and rationale

[Issue 67](https://github.com/JFusco/design-passport/issues/67) isolates the
in-session refresh fix from the remaining native matrix in
[issue 53](https://github.com/JFusco/design-passport/issues/53). A preceding
read-only native refresh recaptured 76,504 nodes in 144,654 ms while most
persisted fragments could not fit beside retained audits. That observation
motivated the fix; it is not a matched performance baseline.

Base capture now consults the accepted session's existing inference snapshots
before disk. It requires an explicit change journal, the validated fragment
fingerprint, identical ordered node IDs, and no dirty fragment nodes. Reuse
clones through the existing base sanitizer. Live resource, text-style,
instance, inference-eligibility and whole-scene verification still run. Missing
or unsupported validation and forced-full capture retain the conservative
capture path. The existing per-fragment release and successful-build publication
lifecycle remain; no second graph, persisted schema, quota, audit scope or
production UI is added.

## Native evidence tooling

The comparator has an explicit cross-build mode. It verifies original report
hashes and complete clean build identities, requires the same harness, and
validates each report's producer SHA against its recorded source revision.
Only the expected producer SHA difference and ordinary generation timestamp
identity are excluded. Strict comparison remains the default.

The development-only storage checkpoint reads exact-file audit/context/view
records. Restore requires the configured actual Figma-assigned isolated plugin
identity, the authorized file and an idle handler. Ordered scoped keys, a
content digest, entry count and shared 4 MB budget are checked before replacing
isolated QA records; other keys and original storage are preserved. Readback
must match exactly. An original-identity reader may export existing records
but cannot restore them. Both measured builds use an empty document-write
allowlist and record checkpoint identity on timed runs.

## Verification and limits

Focused fixtures cover empty disk cache, mixed reuse/fallback/capture, changed
inputs, forced-full capture, cancellation and clone independence. They compare
complete graph material, hashes, report findings/groups/grades/readiness and
repair plans with forced-full capture. Live resource and text-style evidence
and newly uncovered inference fields are refreshed; subsequent changes fail
resource verification. Separate harness/storage/comparator fixtures exercise
identity, file, idle, quota, digest, original-hash and producer boundaries.

Native verification initially stopped before any matched timed refresh. Figma
assigned the isolated development ID through its New plugin flow; the source
reader was imported. Native computer use then reported the Mac locked, and the
user unlocked it manually. Failed startup and access attempts are retained
privately, together with prior immutable native exports.

After manual unlock, the source reader confirmed the authorized file and
blocked document writes. A first isolated baseline warm-up completed with
matching producer identity and no dropped records, but reused no disk context.
It exposed a QA checkpoint defect: JSON serialization converted native binary
packets to plain objects and overstated their storage cost. This warm-up is
excluded from performance evidence. Original storage was never restored or
cleared, and the failed checkpoint and diagnostics remain private.

The correction uses tagged base64 for native binary packets, decoded-byte
accounting and a new QA-only checkpoint schema. It rejects old JSON checkpoints
instead of guessing their types. Only the aggregate byte pressure of unrelated
records is exported; isolated restore reproduces it with a task-owned exact-file
reserve while preserving actual unrelated data. Real compressed audit/context
round-trips, binary padding/empty values and pressure readback have regression
coverage. Native measurements restarted with the corrected common checkpoint;
no speed acceptance is inferred from the discarded warm-up.

A fresh native read-only export preserved 49 exact-file records, including
45 compressed context packets, and recorded 3,627,272 bytes of unrelated
quota pressure. Its native total is 3,969,161 bytes, below the unchanged
4 MB budget. The original namespace remained untouched. The corrected
helper passed 95 focused tests and the full `verify:ci` check: 542 unit tests,
five Chromium tests, repository integrity, types, lint and builds.

## Matched native measurements

Three unchanged in-session pairs completed against baseline source
`c5625aa39005b6ed1898aabc9930ea46e8ba6833` and candidate source
`9981a7122a82239a16aacdcab9902e9b00ba2106`. Both byte-verified production
bundles used the same QA harness SHA-256
`6dc402c6fe81461fca82015f8a010d00d72dd1d48b9ffde6c31c1d87fa2394b7`
and the same actual Figma-assigned isolated identity. Native inspection verified
the authorized file and blocked writes in every new session.

The common checkpoint `h53:1219fa65c7e609` was restored before each warm-up
and again immediately before every timed refresh: 49 records, 3,969,161 native
bytes including 3,627,272 bytes of reproduced quota pressure. Four open sessions
were warmed once each. Candidate measurements 1 and 2 shared one session;
baseline measurements 2 and 3 shared another. Build order alternated
baseline/candidate, candidate/baseline, baseline/candidate. Warm-up timings are
excluded. A later warm-up showed disagreement between its two timing clocks;
that receipt and a read-only observation timeout remain private. All six timed
wall-clock durations corroborated their handler timers within 45 ms.

| Pair | Order | Baseline complete handler | Candidate complete handler | Improvement |
| --- | --- | ---: | ---: | ---: |
| 1 | Baseline, candidate | 646.762 s | 615.856 s | 4.8% |
| 2 | Candidate, baseline | 639.530 s | 625.334 s | 2.2% |
| 3 | Baseline, candidate | 767.323 s | 582.260 s | 24.1% |

The baseline median is **646.762 s** and candidate median **615.856 s**,
a **4.8%** improvement (candidate/baseline **0.952214**). The required ceiling
under the original plan is **517.410 s** (80% of baseline).
**The original 20% native performance gate failed.**
The faster third pair does not replace the required median calculation, and
the original quantitative result is preserved.

After reviewing these results, the user explicitly changed 20% from a release
requirement to an advisory optimization goal. Exact semantic parity, freshness
boundaries, native error-free evidence and repository checks remain required.
Those checks passed for this scoped change, so the modest measured improvement
does not block making PR [68](https://github.com/JFusco/design-passport/pull/68)
ready for review. The archived plan remains immutable and records the original
requirements; this decision updates the current acceptance policy. Neither
the revised goal nor review readiness authorizes merging or publication.

Every pair passed explicit cross-build comparison: original report hashes and
both build identities validated; complete reports, repair plans, knowledge
snapshot hashes and checkpoint receipts matched, permitting only the expected
producer SHA and ordinary generation timestamp identity differences. There
were no native command or captured console errors and no dropped evidence
records in any measured interval.

Each candidate refresh reused 1,241 session fragments containing 47,606 nodes
and captured the remaining 4,570 fragments containing 34,282 nodes. Each
baseline reused 45 persisted fragments containing 5,333 nodes and captured
76,555 nodes. These counters establish actual session reuse; they do not
establish the 20% end-to-end speed goal. No freshness guard, live evidence
step, scope, storage policy or production UI was weakened to change the gate.
The idle plugin was closed after saving evidence; QA storage and raw exports
remain available privately. Later delivery changes update documentation only;
the measured candidate source remains pinned to `9981a7122a82`.

## Repository checks

Final `DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci` after the native
measurements and advisory-goal decision passed: 542 unit tests, five Chromium
tests, repository integrity, types, lint and companion/plugin builds. The
canonical PR body and whitespace checks also passed.

The initial implementation's `DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci`
passed: catalog/schema,
knowledge/wiki/skill checks, types, companion lint, 536 unit tests, five
Chromium tests and companion/plugin builds. The initial sandboxed Chromium
attempt could not bind the local test port; the passing rerun used authorized
local-server access. A new style fixture's mock typing and global inference
scope were corrected before the passing check. No fixture result is native
performance evidence.

Graphify 0.9.36 refreshed the code map to 1,040 nodes and 3,188 edges. Source
inspection confirms the new adapter import and sanitized-base call represented
by the two added edges. Wiki discovery, graph rebuild and integrity passed;
the unrelated unmatched plan candidate was left untouched. The scoped security
review found no high-confidence vulnerabilities in session reuse, checkpoint
input validation, identity/file/idle guards and cross-build evidence integrity.

## Delivery boundaries

The follow-up pull request closes issue 67 only. Issue 53 remains open for
restart, cold-cache, screen-saver and out-of-memory verification. Certification
remains retired. No document edits, original history clearing, Figma publication,
merge or screen-saver-specific behavior are part of this change.
