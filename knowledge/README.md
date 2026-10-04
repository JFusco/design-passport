# Design Passport knowledge

The local companion stores imported learning evidence, editable candidates,
immutable revisions, decisions, and current guidance packs in your dedicated
Supabase database. Connectivity is required. Importing an audit preserves recorded
design metadata and never creates a learning contribution automatically.

Learning exports remain sanitized. Scanning a Figma file never submits data to the
companion. Select exports explicitly, import them, and review generated candidates
through the protected local interface. Only a human decision bound to a current
candidate digest can publish guidance.

Project guidance downloads reflect current approvals immediately. Shared approvals
remain staged in the database until you run:

```sh
pnpm companion knowledge build
pnpm knowledge:check
```

That explicit build exports the reviewed shared pack to
`knowledge/releases/team-knowledge-pack.v1.json` and
`src/generated/team-knowledge.pack.json`. Ordinary plugin builds use those committed
files and do not connect to Supabase. Companion routes never modify them.

For a consistent manual backup, choose a new destination:

```sh
pnpm companion knowledge export --out /absolute/new-backup-directory
```

A completed export contains compatible `observations/`, `decisions/`,
`candidates/current.json`, project packs and both release files, plus original audit
payloads and `database-history.v1.json`. The sidecar preserves projects, receipt
metadata, revisions and database-only history. `completion-manifest.v1.json` is
written last, with table counts and file SHA-256 digests. An interrupted directory
has no completion manifest and remains incomplete; retry into a new directory.

Read the [database setup and recovery guide](../wiki/topics/supabase-companion.md)
for credentials, migrations, backups and rollback. Project guidance remains
project-scoped; shared guidance requires an explicit shared approval. Advisory
packs never change grading.
