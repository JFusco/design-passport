---
title: Companion database persistence
---

# Companion database persistence

The companion runs locally; your dedicated Supabase project stores selected audit
and learning imports, candidate revisions, decisions and current guidance. It
requires connectivity and serves one operator. The plugin continues capturing
exports without a network connection to the companion.

## Data and integrity

Audits retain design metadata, including node paths, names, URLs, waiver information
and historical targets. The import page explains this before upload. Learning
exports retain their existing sanitization and digest validation. Audit imports
never synthesize learning contributions, and uploaded URLs are never fetched.

Exact report SHA-256 digests deduplicate audits within an explicit project scope.
Distinct historical wrappers remain append-only original source records. The
existing h53 report identity links audits and contributions within that scope in
either import order. Multiple possible matches remain visible; filenames and node
names never choose a project.

The private `design_passport` schema separates migration ownership from the
`design_passport_app` NOLOGIN application group. Every table enables row-level
security. Explicit application-role policies allow reading and inserting; column
grants limit updates to project display names, candidate state and guidance packs.
Runtime cannot update or delete evidence, revisions or decisions, or create schema
objects. Public, anonymous and authenticated access is revoked. This single-operator
model does not claim multi-user tenant isolation; project-qualified foreign keys
prevent cross-project relationships.

Mutations acquire the same transaction-scoped advisory lock before mutable reads.
Each valid file commits its evidence and derivations atomically. Invalid files roll
back individually while valid batch files remain committed and processing continues.
Only connectivity or availability failures and lock contention return retryable
messages; permanent failures show a non-outage error. Decisions use a
client request UUID and compare replay contents before freshness; edits retry only
when the complete expected successor remains current. New evidence and editorial
changes stale older approvals. Ordinary decisions never write release files.
The review action shows a disabled Approved button only for the saved revision and
publication scope with a current approval. Reject and Defer remain available.
Unsaved edits cannot be decided; saving a new revision restores Approve.

Project guidance derives from scopes represented by current candidates. Audit-only
projects retain their exact scope without creating learning or derived guidance.
Candidate scopes with no current approvals still get empty replacement packs, so
withdrawing the final approval removes published project guidance.

## Configure and migrate

Create only the dedicated `design-passport` project in JFusco's Org using standard
Postgres in `us-east-1`. Recheck Free eligibility and the quoted cost at creation;
confirm that exact cost once. Disable Data API and automatic table exposure. Keep
QA Operations and its unsaved SQL work untouched. Keep credentials out of browser
automation: enter dashboard passwords yourself. An explicitly authorized CLI
procedure can create the restricted runtime credential and save it privately.

The root `.env.local` is ignored. Store `DESIGN_PASSPORT_DATABASE_URL` and
`DESIGN_PASSPORT_DATABASE_CA_PATH` there. Download the project CA from Database
Settings → SSL. Use the Connect dialog's session pooler host on port 5432, with
`design_passport_runtime.<project-ref>` as username. The server requires verified
TLS, the project CA and hostname verification. Postgres.js 3.4.9 has a two-connection
pool, 10-second connection timeout, 20-second idle timeout, 15-second statement
timeout and 2-second lock timeout. Concurrent cold requests reuse the same client
after the awaited CA read. Connections are lazy; builds need no database.
Every repository transaction also sets the statement and lock limits locally before
queries or lock acquisition. Hosted acceptance found that the session pooler can
ignore startup parameters or retain backend defaults; client options alone do not
prove those limits are active. Set matching runtime-role defaults as well.

Supabase CLI 2.119.0 is pinned. Migration credentials stay in your CLI credential
context or migration-only environment and never reach the companion child. After
verifying the newly created project reference:

```sh
pnpm exec supabase link --project-ref NEW_PROJECT_REF
pnpm exec supabase db push --linked --dry-run
pnpm exec supabase db push --linked
pnpm exec supabase migration list --linked
```

Inspect pending SQL before applying it. Match remote migration versions to the
committed forward migrations. Once remotely applied, migration files are immutable;
fixes require a new migration. The non-secret configuration disables the local Data
API and excludes the application schema from exposure.

After migration, use the project SQL editor with the migration identity to create
this login without putting a password in a saved SQL query:

```sql
create role design_passport_runtime login inherit nosuperuser nobypassrls
  nocreatedb nocreaterole noreplication;
grant design_passport_app to design_passport_runtime;
alter role design_passport_runtime set statement_timeout = '15s';
alter role design_passport_runtime set lock_timeout = '2s';
```

Set its password through a secure user-controlled credential procedure such as
interactive `psql`'s `\password design_passport_runtime`. Never paste secrets into
chat, migrations, screenshots or committed configuration. Populate the ignored
runtime URL locally, keep migration credentials separate, and restrict permissions
on that configuration and the downloaded CA.

The deployed project is `bqvppcuwfkjryfatxgfn`, created on 2026-10-04 in JFusco's Org,
Free, standard Postgres 17 in `us-east-1`, after confirming the current $0/month quote.
The connector provisioned it; its default Data API was disabled before any application
schema or data was installed. Forward migrations also remove automatic public-schema
table, sequence and function grants from the migration role, including the global
PUBLIC default function grant. Platform-owned storage defaults remain unchanged.

## Imports, history and releases

Learning limits: 10 files, 1,000,000 bytes per file, 5,000,000 combined file bytes and
6,000,000 request bytes. Audit limits: 10 files, 10,000,000 bytes per file,
25,000,000 combined file bytes and 26,000,000 request bytes. Actual streamed request
bytes are bounded before parsing, even without reliable Content-Length. Next's
proxy buffer is 27,000,000 bytes. Oversized requests return 413 without imports.
The audit file picker stays disabled during preview/import. Selecting new files
clears the old preview and project choice; the next file requires its own preview
and an explicit or newly matched project scope.

A representative synthetic v3 file-scope report measures 3,435,447 bytes for 100
roots and 3,200 findings. This verifies initial sizing, not a universal maximum.
The protected interface supports project, source date, rule, status and text
filters, audit grade/readiness filters, stable cursor pagination, original audit
downloads, linked contributions, revisions and decisions.

```sh
pnpm companion learning import SELECTED_LEARNING_FILE
pnpm companion audit import SELECTED_AUDIT_FILE --project-scope project:example
pnpm companion knowledge review
pnpm companion knowledge build
pnpm knowledge:check
```

Only the explicit knowledge build exports reviewed shared guidance into both
committed release files. Plugin builds consume those files without database access.
Project guidance downloads reflect current approvals immediately.

## Back up, recover and roll back

Run a manual export after important imports or reviews and before rollback:

```sh
pnpm companion knowledge export --out /absolute/new-private-directory
```

The export reads one consistent snapshot and refuses existing destinations. It
writes compatible learning, candidate, decision, project-pack and release paths;
original audits; and a versioned sidecar retaining project metadata, receipts and
immutable revision history. The final completion manifest records table counts and
file SHA-256 digests. A partial directory stays incomplete and is retained for
diagnosis; retry uses a new destination. The named read-only filesystem readers
verify backup compatibility without reintroducing a live filesystem backend.

Free projects may pause after inactivity and lack automatic backups and point-in-time
recovery. Check the [current plan terms](https://supabase.com/pricing) and
[backup guide](https://supabase.com/docs/guides/platform/backups) at provisioning.
For outages, check connectivity and project status, resume a paused project in the
dashboard when necessary, and retry the same intended action. An outage alone does
not prove a pause. Selected files and unsaved fields remain available on failed
requests; a lost response may already have committed.

To roll back, stop companion writes, complete and verify an export while the database
is reachable, then restore compatible knowledge files into the previous
filesystem-backed checkout. Keep the Supabase database intact. Audit and revision
sidecars remain preserved archives because the previous companion has no audit
history interface. During an outage, the last completed backup is the recovery
point; its age limits what can be recovered.

## Verification boundaries

Offline tests apply the committed SQL to PGlite 0.5.8 with socket adapter 0.2.11.
Repository and production Next browser flows use the same Postgres.js client and a
restricted test role. The isolated harness uses one socket connection and permits
unencrypted connections only to its literal loopback address. It never loads real
runtime credentials. These tests prove application behavior and permissions, not
hosted TLS or real cross-session locking.

Hosted acceptance separately requires synthetic imports/read-back, persistence
after companion restart, verified TLS, real concurrent sessions, immutable-history
and DDL denial, migration parity and security/performance advisors. Real exports
enter only through an explicit selection after this verification.

The initial hosted acceptance passed these checks using a retained synthetic project
scope. A connection using an unrelated CA was rejected. Security advisors returned
no findings; performance advisors reported only informational unused indexes on
the newly provisioned database. Keep the indexes supporting history, joins and text
queries; reassess them after representative usage rather than deleting them based
on an initial empty-database statistic.


## Existing export verification and source cleanup

The [2026-10-04 hosted capture and architecture review](../qa/companion-database-plumbing-review.md)
imported four explicitly selected existing exports. Full payloads, source/receipt
stamps, all findings/observations, candidate derivation, retries and protected
history/downloads verified against the database. The selected audits and learning
files have different semantic identities and remain unlinked; import never guesses
from filenames, scope names or dates.

After verifying complete private backups outside the project, the selected source
files were deleted at the user's request. Uploaded evidence remains authoritative
in Supabase. Delete only selected, verified source exports; schemas, configuration,
committed plugin packs and unimported reference/batch inputs have separate purposes.
Future batch runs need a fresh report when their previous local report was removed.

This assessment found no high-confidence security flaw in the current single-operator
scope. It does not establish team authorization or capacity. Team authentication,
hosting, production/test separation and measured scaling remain separate work.
