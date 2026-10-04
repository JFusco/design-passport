---
title: Supabase companion persistence implementation
date: 2026-10-04
topics: [supabase-companion]
plans: [2026-10-04-provision-supabase-and-build-the-companion-to-qa-operations-standards-946bafe335.md]
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
