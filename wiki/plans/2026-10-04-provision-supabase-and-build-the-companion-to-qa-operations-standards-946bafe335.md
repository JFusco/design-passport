---
status: "implemented"
executed: true
evidence: ["JFusco/design-passport#70; verify:ci 546 tests and 8 browsers; dedicated hosted project, TLS, restart persistence, permissions and concurrency verified"]
source_tool: "repository"
source: "/Users/joe.fusco/.codex/review-runs/60031472-90fe-4607-a292-7d0572716a66/final.md"
topics: ["supabase-companion"]
digest: "946bafe335b4a26e2d4a6f97b99f39bb959482db61852fe6d2e49ee788905e23"
---

# Provision Supabase and build the companion to QA Operations’ standards

## Summary

Keep the companion local and make Supabase the authoritative store for imported audit and learning history. Connectivity is required. Audit imports never synthesize learning contributions, and only a human decision bound to the current candidate digest can publish guidance.

This document describes future implementation. The current review performs no provisioning, installation, repository changes or uploads. The packet records an unsubmitted project form and inspected QA guidance; recheck those conditions when implementation begins.

## Skills and project provisioning

- Copy QA Operations’ `supabase` and `supabase-postgres-best-practices` folders from commit `c50b5c3344491d07e2a1792ea504f01c3cf3bc6e`, preserving their contents and existing license notices. Use `.agents/skills` and relative `.claude/skills` links; keep these as development guidance.
- Preserve the lockfile format and top-level `sourceSnapshot`. Each new entry records `source: JFusco/qa-operations`, its `.agents/skills/<name>` sourcePath, the QA commit as `ref`, `upstream: supabase/agent-skills`, version `0.1.2` or `1.1.1`, MIT license and upstream licenseEvidence. Retain any additional license notice outside the hashed skill folders. The expected hashes are `583344c20e90f3654dbb0632f088d89fd9f1dde8ac85e8a644dd12eee59b1380` and `e14e276241805c97dbcfe40dcbea1a3035269cc7293cac4b1832dda41a835e60`. Verify against the [upstream license](https://github.com/supabase/agent-skills/blob/main/LICENSE) and run `pnpm skills:check` during implementation.
- Update repository instructions to require both skills and relevant references for Supabase/Postgres work. Apply the existing companion security guidance to the new database and HTTP boundaries; reconcile its filesystem-lock/rebuild wording with the transaction and export behavior below, updating its existing locked hash if edited.
- Provision only after the issue branch, migrations and offline implementation are reviewable and locally verified. Create `design-passport` in **JFusco’s Org**, organization `sbaozaksrqsaioxymoux`, using standard Postgres in `us-east-1`. Preserve the QA Operations SQL tab and its unsaved edits.
- Immediately before creation, recheck Free eligibility and the quoted monthly cost. Obtain the required cost confirmation and connector receipt; satisfy any browser final-action confirmation at that same point without duplicating approvals. Do not upgrade the organization or choose a paid configuration if eligibility has changed; that requires a new user decision.
- Turn Data API and automatic table exposure off in the form before submission. Hand database-password entry/generation and secure storage to the user. Committed migrations create the application’s NOLOGIN permission role, without passwords. After migration, hand creation of the restricted runtime login and its password to the user through a prepared, secret-free procedure.
- The user stores the runtime connection in the ignored root `.env.local`. Migration credentials stay in the user’s CLI credential context or separate migration-only environment and never reach the companion child process. Agents must not inspect or echo passwords, populated connection strings or tokens; none belong in migrations, commits, screenshots, logs or browser bundles.
- Verify the new project’s health, connection identity, exposure settings, schema, grants, policies, migration history and advisors. Initial hosted checks use synthetic fixture exports only. Real data enters through a subsequent explicit user-selected import, not an automatic upload of discovered local files.

## Database and companion implementation

### Storage, permissions and runtime configuration

Use one server-side database repository shared by companion routes and CLI commands. Pin `postgres` to `3.4.9`. Connect through the shared session pooler on port 5432, taking the host from the project’s Connect dialog and using `design_passport_runtime.<project-ref>` as the custom-role username. [Connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)

Create a private, unexposed `design_passport` schema containing projects, canonical audits, audit source exports, findings, learning contributions and observations, candidates, immutable candidate revisions, decisions and current guidance packs. Keep queried attributes relational and retain validated source objects as JSONB. Preserve source timestamps separately from receipt timestamps using `timestamptz`.

Enforce required values, valid states, uniqueness and project-qualified foreign keys. Child records cannot reference another project’s parent. Preserve distinct observation occurrences, including supporting and contradictory observations sharing an observation key. Candidate evidence continues to reference semantic report identities; it must not be mistaken for an envelope-digest foreign key.

The migration identity owns the schema and tables. Create `design_passport_app` as NOLOGIN. The user-created `design_passport_runtime` login inherits this role and has no ownership, superuser, BYPASSRLS, role-creation, database-creation or replication privileges.

Revoke application-schema, table and sequence access from PUBLIC, anon and authenticated, including corresponding default privileges. Grant the application group schema USAGE and:

- SELECT and INSERT on audits, audit exports/findings, learning contributions/observations, candidate revisions and decisions.
- SELECT and INSERT on projects, with UPDATE limited to display metadata.
- SELECT, INSERT and necessary UPDATE on current candidate state and guidance packs. Empty packs replace withdrawn approvals; runtime deletion is unnecessary.

Enable RLS on every application table. Use explicit policies `TO design_passport_app` matching these operations: SELECT visibility, INSERT checks, and both USING and WITH CHECK for permitted updates. The single operator can access all managed projects; these policies do not claim tenant isolation or use `auth.uid()`. Project-qualified relationships provide data-integrity boundaries. Use invoker-security views/functions where needed, with no public execution grants. Verify runtime denial of evidence/decision UPDATE and DELETE, and application-schema DDL. [Security guidance](https://supabase.com/docs/guides/api/securing-your-api)

Document `DESIGN_PASSPORT_DATABASE_URL` and `DESIGN_PASSPORT_DATABASE_CA_PATH` in `.env.example`. A shared Node-only loader loads the configured workspace’s root `.env.local` before database access, without overriding already supplied environment variables. The CLI forwards runtime configuration to Next; direct companion development uses the same loader. Migration secrets are excluded. Missing configuration produces an actionable setup error, and database connections are lazy so builds need no database.

Download the CA from the project’s Database Settings SSL section. Configure Postgres.js with the CA, `rejectUnauthorized: true`, normal hostname verification, pool `max: 2`, `connect_timeout: 10`, `idle_timeout: 20`, `statement_timeout: 15000` and `lock_timeout: 2000` milliseconds. Share one pool per process and close CLI pools on exit. Never disable hosted certificate verification. The isolated PGlite harness has the narrowly constrained exception described below. [TLS guidance](https://supabase.com/docs/guides/platform/ssl-enforcement)

Index foreign keys and the actual project/date/rule/status query paths. Use bounded cursor pagination with a stable ID tie-breaker and indexed text search over the displayed searchable text. Review representative query plans.

### Migrations

Pin the root development dependency `supabase` to `2.119.0`, commit the package lock, and allow its required installation lifecycle through the repository’s pnpm policy. Verify the installed version and relevant command help before execution. [CLI release](https://github.com/supabase/cli/releases/tag/v2.119.0)

Use `pnpm exec supabase init` once and commit the non-secret `supabase/config.toml`, with the application schema excluded from API exposure. Keep link/cache artifacts ignored. Create filenames with `pnpm exec supabase migration new <name>`, then hand-author forward migrations and apply the exact SQL to the offline harness. This workflow does not require `supabase start`, local `db pull` or `db diff`.

After provisioning, link only the verified new project with `pnpm exec supabase link --project-ref <new-ref>`. Using the separate migration credential, run `pnpm exec supabase db push --linked --dry-run`, inspect the pending files, apply with `pnpm exec supabase db push --linked`, and check `pnpm exec supabase migration list --linked`. Confirm the applied versions correspond to the reviewed repository files. Once applied remotely, migration files are immutable; subsequent PR corrections require new forward migrations. [CLI migration commands](https://supabase.com/docs/reference/cli/supabase-db-push)

### Imports and learning integrity

Accept readiness-report JSON versions 1–3, historical-audit envelopes and separate learning exports. Preserve their existing contracts and scoring versions. Imported audits describe recorded evidence, never verification of the current Figma document.

Learning imports retain `assertLearningEnvelope`, including sanitization and digest verification. Audits use `assertContract('readiness-report', report)`, including its relationship checks, plus a strict historical-envelope validator matching the exporter: kind, schemaVersion, historical freshness, optional savedAt, provenance and the selection/page/file target union. Do not apply the learning sanitizer to audits.

Audit history stores unsanitized design metadata in the user’s Supabase project, including node identifiers/paths, frame/page names, URLs, waiver information and historical targets. Explain this before audit import and record it in the wiki. Keep the description of learning exports as sanitized, while removing claims that persisted history stays in local files. Do not fetch URLs found inside uploads.

Retain learning limits of 10 files, 1,000,000 bytes per file, 5,000,000 combined file bytes and 6,000,000 request bytes. Start audits at 10 files, 10,000,000 bytes per file, 25,000,000 combined file bytes and 26,000,000 multipart request bytes. Available local selection exports measure 80,088 bytes for one frame and 61 findings; 100 comparable roots suggest approximately 8 MB before headroom. This is a sizing assumption, not a measured file-scope maximum. During implementation, measure a representative synthetic v3 file-scope export, record its byte/count results, and validate these caps before delivery.

Set `experimental.proxyClientMaxBodySize` in `apps/companion/next.config.ts` to the numeric value `27_000_000`. The installed Next 16.3.6 documentation and implementation confirm a default 10 MiB proxy buffer that truncates larger bodies before the route handler; `serverActions.bodySizeLimit` does not configure this buffer. The 1,000,000-byte margin above the audit request cap is buffering headroom, not permission to accept larger uploads. Keep the buffer above the application cap if measurement changes that cap. [Proxy body-buffer documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize)

Enforce actual streamed request bytes before multipart parsing, even when Content-Length is absent or misleading. The route’s application cap is the authoritative rejection: oversized requests return 413 before parsing or database writes, including requests exceeding the proxy buffer. Never accept a truncated request as a partial import. Check file count and individual/combined sizes before reading file text or parsing JSON. Apply equivalent bounded reads in the CLI. Validate malformed JSON and schema relationships after bounded parsing. Preserve valid files when another file fails; distinguish validation failures from retryable database failures.

Use two report digests:

- `report_sha256` hashes `stableStringify(report)` and is unique within a project for exact report deduplication.
- Export a portable `reportIdentityDigest(report)` helper from knowledge-loop using the existing h53 identity material unchanged. Store it as indexed, non-unique `report_identity_digest`; it matches learning `reportDigest`.

Keep one canonical audit and finding set per project/report SHA-256. Store each distinct complete uploaded object in an append-only audit-export child record, unique by project and canonical payload SHA-256. Thus a raw report and historical wrappers can share an audit while preserving every distinct wrapper’s target, provenance, savedAt and freshness for inspection/download. Exact source-payload retries add nothing.

Projects retain the exact stable projectScope used by learning exports, with an optional friendly display name. A unique matching contribution project prefills audit project selection. With no match, require selecting or creating a project with an explicit scope; with multiple matches, require an explicit choice. The import preview makes the learning export’s project available for matching. Never infer scope from filenames or node names.

Match audits and contributions through projectScope plus semantic report identity. This is a many-to-many relationship and can be queried through an invoker-security join without a mutable link table. It works in either import order. Changed report timestamps can create distinct reports sharing one identity. Surface conflicting project assignments or ambiguity; never silently reassign evidence or link across projects. Retain unmatched contributions.

### Transactions and retries

Replace the filesystem writer lock for database mutations with one application-wide transaction-scoped advisory lock, appropriate to this single-operator workload. Acquire it before reading mutable state in a short READ COMMITTED transaction. Use conditional candidate updates against the expected digest and database uniqueness for imports and decisions. Bound lock waits and report contention as retryable. Perform upload parsing and validation before entering transactions; make no provider calls or filesystem writes inside them.

For each valid learning file, commit the contribution, observations, candidate regeneration with preserved edits, immutable revision snapshots and affected guidance packs together. Revisions and decisions likewise update their database derivations atomically. Each audit file commits its canonical report, findings and source-export record together. A failed transaction leaves no partial state for that file or action; previously committed valid files in a batch remain retained.

Remove the database rebuild-required flag and proposed rebuild-based decision block. Update the companion’s obsolete rebuild notices and retry action. A failed mutation is retried using the rules below, rather than represented as a successful evidence write awaiting a separate rebuild.

Preserve candidate wording, exceptions, scope, prior revision contents and decision history. New evidence or edits stale approvals whose candidate digest no longer matches. Record new decisions only against the current digest. Unsaved editorial changes remain undecidable.

For decisions, the client creates a request UUID before sending and retains it with the exact intended action through an uncertain response and same-tab recovery. Derive `decisionId` from that UUID and enforce uniqueness. On replay, compare candidate, digest, action, scope and normalized rationale with the stored decision before checking current candidate freshness: an identical request returns the original decision; reuse for different contents returns a conflict. A changed user intent gets a new request ID. Preserve the KnowledgeDecisionV1 payload contract.

For revisions, retain the expected parent snapshot. If its digest is no longer current, compute the requested successor from that parent using the existing revision function. Return success only when the current candidate equals that successor, including its evidence; otherwise return the existing stale-draft conflict. Do not accept matching wording alone. Imports use uniqueness and ON CONFLICT DO NOTHING, followed by retrieval of the retained record.

Keep unsaved fields and selected files when connectivity fails. Return safe setup, unavailable, busy or conflict messages without database exceptions or credentials. An uncertain write invites replay, not an assertion that nothing was saved.

### Derived artifacts and interfaces

Current candidates, immutable revisions, decisions, the staged shared pack and project guidance packs live in Supabase. Relevant learning mutations update them in the same transaction. Dashboard/review reads use a consistent database snapshot. Project guidance downloads immediately reflect current approvals.

Companion routes never modify repository release files. Only explicit `pnpm companion knowledge build` exports the reviewed shared pack to both `knowledge/releases/team-knowledge-pack.v1.json` and `src/generated/team-knowledge.pack.json`. Read a consistent database snapshot, compile using the existing approval rules, then use the existing protected atomic-file operations under a local export lock. If file export is interrupted, rerunning repairs the pair and knowledge:check detects drift. This local export failure never blocks database decisions. Ordinary builds and CI continue consuming committed release files without contacting Supabase. Update knowledge/README.md and dashboard copy to explain these locations and triggers.

Add audit and learning history with project/date/rule/status filters, grade/readiness filters where applicable, text search and pagination. Show audit findings, preserved provenance, source downloads and linked contributions; learning details connect to candidate revisions and decisions. Keep the review queue and guidance downloads backed by the shared repository. Add audit validation/types, import/list/detail/download routes and `audit import --project-scope …`, retaining existing learning and decision contracts.

Every protected new page uses the existing page-access check; every read, mutation and download route uses the request-access check. Preserve exact loopback Host validation, same-origin writes, process-lifetime capability exchange and HttpOnly SameSite cookies. Database configuration and SQL remain server-side. Keep the plugin’s export-based capture and network restriction unchanged.

### Filesystem transition

Make `src/companion/repository.ts` the database repository and extract retained filesystem responsibilities into `src/companion/filesystem.ts`:

- Retain `resolveWorkspaceRoot`, `workspacePaths`, path-confinement and symlink checks, private-directory creation, atomic JSON writes and `withWorkspaceWrite` with its lock acquisition/release. Use the lock for explicit knowledge build/export file writes. Preserve `readJsonFile` and `atomicWriteExternalJson` for their existing CLI consumers.
- Retain the validated filesystem loaders behind `readFilesystemKnowledgeState`, extracted from the current `readKnowledgeState`, and `listFilesystemProjectGuidancePacks`. These are read-only backup compatibility readers using the existing file layout and contract validators; omit rebuild-marker reporting. The backup round-trip test uses these named in-tree readers. Live companion reads and guidance downloads use the database repository.
- Replace the filesystem implementations of `importLearning`, `reviseCandidate` and `recordDecision` with database operations. Remove `rebuildUnlocked`, filesystem `rebuildKnowledge`, `markRebuildRequired`, `clearRebuildRequired` and their marker fields. Remove `/api/rebuild`, its retry UI and obsolete rebuild response fields. Existing learning, revision and decision routes remain and call their database replacements; the knowledge build CLI calls the explicit release exporter.

These retained file operations support exports, backup verification and existing CLI file utilities. They do not introduce a selectable filesystem storage backend.

## Existing data, backup and rollback

The inspected workspace’s managed observations and decisions directories are empty, candidates are empty and the committed shared pack has no entries. Local report and learning export files do exist. Preserve them; offer their later explicit import through the ordinary paths. Remove the general dry-run/apply migrator and speculative orphaned-decision handling. Recheck the selected workspace before cutover and record the inventory outcome in the wiki; do not search unrelated workspaces or upload discovered data automatically.

Add `pnpm companion knowledge export --out DIR` for manual backup and rollback. Export from one consistent read snapshot into a new private directory, with a completion manifest written last and containing counts/digests. Preserve original IDs, digests, timestamps and current edited candidates. The layout includes `knowledge/observations/*.json`, `knowledge/decisions/*.json`, `knowledge/candidates/current.json`, project packs, both shared release paths, and audit source JSON. Include project assignments/display metadata, receipt metadata and historical candidate revisions in a versioned sidecar so the export retains database-only application history. Exclude credentials. Refuse to overwrite an existing destination and never label a partial export complete.

Free projects currently pause after one week of inactivity and exclude automatic backups and PITR. Retain the selected Free configuration, disclose these limits at provisioning, and document manual exports after important imports/reviews and before rollback. On connection failure, direct the operator to check connectivity and Supabase project status, resume a paused project in the dashboard, then retry. Do not diagnose every outage as a pause or automatically upgrade. [Free-plan terms](https://supabase.com/pricing), [backup guidance](https://supabase.com/docs/guides/platform/backups)

Rollback stops companion writes, completes and verifies an export while the database is reachable, then restores the compatible knowledge files into the pre-change filesystem-backed checkout. Keep the Supabase project and data intact. Audits and historical revision sidecars remain preserved archives because the old companion has no audit-history interface. During an outage, the last completed backup is the available recovery point; document its age rather than promising a fresh export.

## Verification

All checks below are future implementation work. Each test must protect an observable behavior or integrity boundary.

Use development dependencies `@electric-sql/pglite` `0.5.8` and `@electric-sql/pglite-socket` `0.2.11`. The socket adapter lets the production Postgres.js repository and separate Next process use the same SQL implementation. PGlite does not establish real multi-session locking or hosted TLS behavior. [Socket documentation](https://pglite.dev/docs/pglite-socket), [matching package versions](https://raw.githubusercontent.com/electric-sql/pglite/main/packages/pglite-socket/CHANGELOG.md)

Repository fixtures create isolated databases, bootstrap missing anon/authenticated roles, and apply committed migrations in order as the bootstrap owner. The first migration creates the application group; fixtures then create the restricted test runtime role. Explicitly switch to that role and assert current_user for application and permission cases; owner execution is not permission proof. Expose at most one socket connection and use Postgres.js `max: 1`, closing migration/setup clients before application clients connect.

Change `test:companion:e2e` to run a small Node wrapper that creates and migrates the disposable database before spawning Playwright, passes its generated loopback URL to Playwright and the Next webServer, and tears down owned processes and storage on completion or interruption. Keep production `next start` browser coverage and a temporary workspace. Global setup must not race database startup or erase an active database.

The harness explicitly supplies disposable configuration and does not load real `.env.local` credentials. A named PGlite test mode permits unencrypted database connections only to the harness’s literal loopback address; hosted connections always require verified TLS. Permission fixtures may use the embedded connection for controlled role switching, while repository and browser flows use Postgres.js.

Retain the existing verify:ci command sequence: repository SQL tests are discovered by `pnpm test`, and the revised e2e script owns browser database setup. quality.yml keeps its dependency installation, Chromium installation and verify:ci invocation; no hosted secrets or database service are added. After dependencies/browser installation, verification requires neither Docker nor a Supabase account, and database tests must not silently skip.

Rewrite the mixed-import/duplicate, stale-draft and preserved-edit/rationale cases in `tests/companion-repository.test.ts` against the database repository. Retain side-effect-free filesystem-read coverage for the backup reader. Move filesystem lock-contention and symlink/path-confinement coverage to the build/export writers, asserting that rejected destinations cause no writes outside the intended root. Replace the accepted-import/failed-filesystem-rebuild case with the atomic database rollback and interrupted-export recovery checks below. In `tests/e2e/companion.spec.ts`, move denial checks from the removed rebuild endpoint to a live import endpoint; retain the existing review, conflict, decision and download behavior checks.

Planned checks cover:

- Fresh migrations, constraints, project-qualified relationships, runtime write/read permissions, immutable-history denial and DDL denial.
- Learning duplicates and distinct-report evidence counts; valid audit v1/v2/v3 data containing node IDs and URLs; strict historical envelopes; malformed and oversized inputs; actual byte limits without reliable Content-Length; valid-file retention in mixed batches.
- A production-build upload containing multiple valid audit files exceeds 10 MiB while staying within all application caps, and read-back confirms every complete payload was retained. Requests just above 26,000,000 bytes and above the 27,000,000-byte proxy buffer return 413 with no stored imports, including chunked requests without Content-Length. These checks exercise the real proxy and route together.
- Audit/contribution matching in both import orders, ambiguous and conflicting project scopes, raw-report/historical-wrapper preservation, and exact-payload retries without multiplied findings or evidence.
- Competing revisions using the same expected digest, stale decisions, preserved edits and rationale, current-digest publication, repeated decisions/revisions/imports after deliberately discarding a committed response, and request-ID reuse with different contents.
- Transaction rollback after a forced derived-pack write failure, retained earlier batch successes, outage recovery and unsaved-input retention. Deterministic competing-write cases prove the expected-digest and uniqueness outcomes; they are not described as PGlite cross-session lock tests.
- A companion decision leaves repository files unchanged; explicit knowledge build followed by knowledge:check succeeds, including after an interrupted release export is rerun. A completed backup loads through `readFilesystemKnowledgeState` and `listFilesystemProjectGuidancePacks` and reproduces current candidates, decision status and project guidance, while audit payloads and additional history remain intact. An interrupted backup has no completion manifest and is never accepted as complete.
- Production-build browser import/history/filter/detail/review/download flows, accessibility and keyboard checks, unauthorized new reads/writes/downloads, wrong Host and cross-origin denial, and absence of fixture secrets from HTML and browser scripts.

Run `pnpm skills:check` and `pnpm run verify:ci`. Separately, on the newly provisioned project with synthetic fixtures, verify restricted-role import/read-back, persistence after restarting the companion, real cross-connection serialization/stale-write behavior, verified TLS, permission denial, migration parity and security/performance advisors. Record fixture evidence and hosted evidence separately, including unresolved findings.

## Delivery and defaults

Recheck that the worktree is safe, update main with `git pull --ff-only`, create and read back one canonical GitHub issue, and branch as `codex/<issue-number>-<short-slug>`. Do not extend the unrelated issue-67 branch. Implement and verify locally before the provisioning/application sequence above.

Include the executed plan, skill provenance, database design, data classification, inventory outcome, provisioning record, migration procedure, verification evidence and backup/rollback instructions in the wiki using its existing mechanics. After substantive wiki changes, perform the required plan discovery, graph rebuild and wiki checks.

Commit with the repository’s conventional message standard, push normally, run `pnpm run lint:pr`, and open the canonical PR with its required headings, completed checklist and closing issue reference. Read the saved PR back, then stop. Never merge, enable auto-merge, delete the branch or close the issue as part of delivery.

Team sign-in, hosted companion deployment, direct plugin submission, local-primary synchronization, multi-file batch ingestion and natural-language queries remain deferred.
