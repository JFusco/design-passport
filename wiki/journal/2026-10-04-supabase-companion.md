---
title: Supabase companion persistence implementation
date: 2026-10-04
topics: [supabase-companion]
plans: [2026-10-04-provision-supabase-and-build-the-companion-to-qa-operations-standards-946bafe335.md, 2026-10-04-repair-supabase-companion-review-findings-c8b67d5345.md]
issue: 'https://github.com/jfusco/design-passport/issues/70'
issues: ['https://github.com/jfusco/design-passport/issues/70']
---

# Supabase companion persistence implementation

[Issue JFusco/design-passport#70](https://github.com/JFusco/design-passport/issues/70)
tracks the reviewed specification's database cutover. The worktree was clean,
`main` was current after a fast-forward pull, and the issue was saved/read back
before creating `codex/70-supabase-history`.

The two Supabase skills were copied unchanged from QA Operations commit
`c50b5c3344491d07e2a1792ea504f01c3cf3bc6e`, with relative Claude links, version/license
provenance, upstream MIT notice outside the hashed folders and exact reviewed hashes.
The adapted security skill now reviews database transactions and explicit exports;
its lock entry was refreshed. `pnpm skills:check` passes.

The selected workspace's managed observations and decisions contain no JSON files;
its candidates and committed shared entries are empty. Existing local exports were
preserved and were not uploaded. Database tests and browsers use synthetic fixtures.

The implementation adds the private schema, restricted application group, RLS,
immutable evidence/revisions/decisions, a verified-TLS Postgres.js repository, atomic
derivations and replay-safe decisions. Audit source wrappers remain distinct while
canonical report findings deduplicate. Project-scoped semantic identity matches
learning and audit imports in either order and surfaces ambiguity.

Protected history and original downloads retain local capability authentication,
Host checks and same-origin writes. Streamed upload caps precede parsing. A synthetic
v3 file-scope export with 100 roots and 3,200 findings measures 3,435,447 bytes. The
production proxy test retained complete payloads above its previous 10 MiB default
and rejected requests above 26,000,000 and 27,000,000 bytes, including chunked bodies,
without new imports.

The database is authoritative for current guidance. Only explicit knowledge build
writes the two committed shared release files. Backup exports read one consistent
snapshot, preserve compatible knowledge files plus original audits and full database
history, and write counts/digests in a completion manifest last. Interrupted backups
remain incomplete. Rollback preserves the Supabase project and restores a verified
compatible backup into the earlier companion.

Offline migration/repository tests pass for restricted permissions, mixed/duplicate
imports, wrapper preservation, project boundaries, stale approvals, preserved edits,
request reuse, rollback and backup round trips. Development Next introspection reports
no compilation or runtime errors; the audit-history browser accessibility probe has
no automated violations. `DESIGN_PASSPORT_E2E_PORT=5290 pnpm run verify:ci` passes:
52 repository files / 546 tests, 8 production browser tests, both production builds,
type checks, lint, catalog/schema/release consistency, wiki and skill checks.
A subsequent focused backup/release test also passes after adding interrupted-pair
repair coverage. Browser history verifies encoded learning IDs through both the
detail API and page. After recovering native audit file selection during hydration,
lint, production build and all 8 browser tests pass again. An additional development
probe confirmed compilation and file selection but lost its browser session before
completion; it is not counted as runtime acceptance. Its owned browser/server were
closed. No hosted secrets or real local exports enter these fixtures.

After the user explicitly authorized completing setup, the Supabase connector created
`design-passport` (`bqvppcuwfkjryfatxgfn`) in JFusco's Org with standard Postgres 17,
`us-east-1`. Free eligibility and the exact $0/month quote were rechecked at creation.
The connector cannot configure initial exposure, so the default Data API was disabled
and visibly verified before applying the application schema or importing evidence.
This provisioning route replaces the original browser password handoff; no new
password was entered through browser automation. QA Operations and its SQL draft
remain untouched.

The authenticated CLI linked only this verified project. The first migration passed
exact-SQL tests and an inspected dry run before application. Hosted default-grant
inspection found non-DML privileges remaining after Supabase's documented DML-only
revokes. A new forward migration removes all remaining migration-role public-schema
grants and the global default PUBLIC function grant. The applied first migration was
not rewritten. The second migration passed the same exact-SQL test/dry-run process.
Both remote versions match the committed migrations. Migration commands run
sequentially: overlapping CLI checks refreshed the same temporary migration login
and caused one read-only parity check to fail authentication; the sequential rerun
passed. Runtime credentials and application writes were unaffected.

An authorized private CLI procedure generated the runtime credential without showing
it, sent only its SCRAM verifier in a temporary private SQL file, then removed that
file. The login inherits the NOLOGIN application role with no elevated privileges.
The ignored root configuration retains existing unrelated values and uses mode 0600;
the downloaded project CA is also private. Migration authentication stays in the CLI
credential context and is filtered from companion children.

Hosted testing caught ignored startup timeout parameters. Runtime-role defaults now
match the reviewed limits, and every application transaction sets 15-second statement
and 2-second lock timeouts before queries. A regression check deliberately sets older
session defaults and verifies transaction bounds override them.

Synthetic hosted acceptance passes restricted identity, verified project CA and
hostname checks, imports, matching, duplicate retries, two production companion
process restarts, immutable-history and DDL denial, distinct real backend sessions,
advisory-lock contention, competing stale edits and committed-decision replay.
Rendered detail HTML and loaded browser scripts contain no runtime credential.
An unrelated CA is rejected before database authentication. All ten application
tables have RLS and migration ownership. Security advisors report no findings;
performance advisors report only INFO unused indexes, retained for the actual query
paths. A hosted project/date history EXPLAIN uses `audits_project_date` through an
index-only scan. No real exports were imported. The final acceptance rerun retains
`project:hosted-smoke-1ad5de17-9c78-49b7-826e-ce9f6d62cb99`; the earlier synthetic scope
also remains as recorded test evidence. The CLI exported a new private hosted backup;
manifest digests, mode 0700/0600, knowledge-reader counts and database-only audit/
revision history all passed verification. The final full CI rerun passes the same
546 repository tests and 8 production browsers after the timeout/default-grant fixes.

Security review traced uploads, local access, SQL transactions, protected downloads,
server-only configuration and backup writes. No high-confidence vulnerabilities were
identified in that scope. Hosted evidence is separate from the offline harness.

## Independent review and persistence repairs

[PR JFusco/design-passport#71](https://github.com/JFusco/design-passport/pull/71)
received its authorized implementation review after 18:20 Eastern. The initial
run passed CI but stopped before model review because duplicated fixture logs
exceeded its packet limit. A fresh run retained the full scope and sources while
suppressing fixture logging. Its reviewer and coordinator accepted three repairs;
the designated Codex implementer made them once. The revised host-local gate passed
551 repository tests and eight production browser tests. The writer's earlier
socket-denied checks remain failed environment evidence, distinct from that pass.

The first three repairs classify permanent validation/SQL failures as non-retryable
and preserve valid batch files, reject malformed audit UUIDs before SQL, derive
project guidance only for candidate scopes while still replacing withdrawn packs,
and reuse one client after concurrent awaited CA reads. A 200-character audit-only
scope remains intact without breaking learning mutations in another project.

The Claude recheck then hit its subscription limit. That frozen run remains blocked.
The user explicitly requested Codex and authorized final commit, push, merging and
linked issue closure. The deferred Claude job was cancelled. A separate fresh
read-only Codex recheck passed all three repairs and identified an audit-preview
race: the picker could replace files while an earlier preview later applied its
project choice. That completed review remains recorded as unresolved.

The designated Codex implementer then addressed that new, narrowly accepted finding:
file selection is disabled during preview/import, and a new selection clears the
previous project scope. Its production browser regression holds the real first
preview response, verifies selection stays fixed, and requires a fresh preview and
explicit scope for the next file. Database read-back verifies both assignments.

A local development probe with a disposable restricted PGlite database also passed
that flow. Next 16.3.6/Turbopack MCP reported no compilation or runtime errors;
agent-browser and React inspection showed the working/preview state transitions.
The invalid history cursor displayed the permanent-error message and dashboard link.
The owned browser/server and disposable workspace were closed afterward.

A final fresh read-only Codex recheck (`96799c01-709e-4342-bb4f-b39759f5ac79`)
verified all four accepted findings with no new actionable gaps. It checked all 52
present scoped source hashes and the full archived CI output digest. The reviewed
target is `b3d7f1cd81445edda3d1b68101674cb1e098a5947c29a53c012f9a676cf54644`.
The earlier blocked Claude and unresolved Codex runs remain unchanged.

The final exact `DESIGN_PASSPORT_E2E_PORT=5290 pnpm run verify:ci` passed all 551
tests across 52 files, eight production browser tests, both builds, type checks,
lint, catalog/schema/release consistency, wiki and skill checks. These repair checks
use local synthetic fixtures. Hosted TLS, restart persistence, real concurrency,
permissions, migrations, advisors and backup evidence above were recorded earlier;
they were not rerun by the independent reviewers. Real exports remain preserved
and unimported. The repository Graphify map was refreshed without model calls.

Plan discovery inspected 900 candidates and flagged one historical cross-repository
Actions-plan variant for association review. The final Actions plan already has an
implemented archive dated 2026-09-26; historical backfill is outside issue #70.
This delivery archives the Supabase implementation and accepted repair plan.
