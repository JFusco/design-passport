---
topics: [persistent-audits, figma-runtime-qa]
plans: [2026-10-04-reuse-validated-session-snapshots-for-53-232f64d68f.md]
issue: 'https://github.com/JFusco/design-passport/issues/67'
issues: ['https://github.com/JFusco/design-passport/issues/67', 'https://github.com/JFusco/design-passport/issues/53']
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

Native verification remains pending. Figma assigned the isolated development ID
through its New plugin flow; the source reader was imported. No matched timed
refreshes have started. Native computer use then reported the Mac locked; the
user was asked to unlock manually. The 20% median complete-handler gate and
native cross-build semantic parity remain unproven. Failed startup and access
attempts are retained privately, together with prior immutable native exports.

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
coverage. All native measurements must restart with the corrected common
checkpoint; no speed acceptance is inferred from the discarded warm-up.

A fresh native read-only export preserved 49 exact-file records, including
45 compressed context packets, and recorded 3,627,272 bytes of unrelated
quota pressure. Its native total is 3,969,161 bytes, below the unchanged
4 MB budget. The original namespace remained untouched. The corrected
helper passed 95 focused tests and the full `verify:ci` check: 542 unit tests,
five Chromium tests, repository integrity, types, lint and builds.

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
