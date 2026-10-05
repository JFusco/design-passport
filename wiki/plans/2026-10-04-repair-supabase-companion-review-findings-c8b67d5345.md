---
status: "implemented"
executed: true
evidence: ["JFusco/design-passport#71; 551 repository tests and eight production browser tests pass; Codex recheck 96799c01-709e-4342-bb4f-b39759f5ac79 verifies all four accepted findings"]
source_tool: "codex"
source: "/tmp/design-passport-71-repair-plan.md"
topics: ["supabase-companion"]
digest: "c8b67d53455af5e531260df59e1abd05e3a547bd2c5aaaccbd099f2d851d39ba"
---

# Repair Supabase companion review findings

Apply only the four accepted findings from the independent review of
Design Passport PR #71, preserving immutable findings and existing exports.

The designated Codex implementer owns implementation edits. The coordinator
verifies the unchanged repair target and delivers through issue #70 / PR #71.

## FIND-001

Narrow the 'unavailable' mapping in databaseError to real connectivity or server-availability failures: SQLSTATE classes 08, 53 and 57P0x, plus Node network errno codes such as ECONNREFUSED, ETIMEDOUT, ECONNRESET and ENOTFOUND, and Postgres.js CONNECT_TIMEOUT/CONNECTION_CLOSED. Map other errors to a non-retryable CompanionError with a safe message, e.g. code 'invalid-input' and status 422, so importBatch reports those files as invalid and pages and routes show a non-outage message. In the rollback test, make the injected failure connectivity-class or expect the new non-retryable status; atomic rollback is still demonstrated either way.

Acceptance: A unit test that injects a plain Error (or a 23514 check violation) inside a write transaction gets a non-'unavailable' CompanionError, and the batch result lists that file as invalid rather than retryable. GET /api/audits/------------------------------------ returns 404 or 400, not 503. A simulated connection failure (closed socket or refused port) still returns 'unavailable'/503 and is listed as retryable. pnpm run verify:ci passes.

## FIND-002

Derive project guidance packs only for scopes represented by current candidates, as the previous implementation did. Include those scopes even when their approved-candidate list is empty so withdrawals still replace guidance with an empty pack. Preserve audit-only projects and their exact scopes.

Acceptance: Import a valid audit under a 200-character project scope, then successfully import learning, revise a candidate and record a decision in another project. The audit and its exact scope remain preserved without synthesized learning. Withdrawing the other project's final approval still stores an empty replacement guidance pack. Run the repository regressions and required verification gate.

## FIND-003

Recheck the cached pool after the final awaited configuration read, immediately before constructing the Postgres.js client. Keep client construction and cache insertion synchronous, and add a focused concurrent-initialization regression.

Acceptance: With synthetic configuration and mocked filesystem/driver dependencies, hold the CA read until two concurrent database(root) calls have reached it. Both calls must return the same client, the driver factory must run once, and closeDatabases() must close that client once. Existing connection configuration and repository checks must continue passing.

## FIND-004

Disable the file picker while preview/import is working, or bind preview responses to their originating selection and discard stale responses. Clearing the retained project scope when files change also prevents the next selection from inheriting the previous explicit assignment.

Acceptance: Hold file A's preview response and attempt to select file B. Selection must remain disabled or A's response must be discarded. B must require its own preview and project choice before submission; read-back must show only the intended project assignment.

## Verification and delivery

Run the required repository checks and a fresh independent recheck. Preserve
the blocked Claude run; the user explicitly authorized a separate Codex recheck.
Record the repairs and evidence in the wiki, refresh the code map, run full CI,
commit and push the existing issue branch, validate the canonical PR, then merge
and confirm the linked issue is closed under the explicit delivery authorization.
Synchronize main. Do not import real exports or delete the delivery branch.
