---
status: "implemented"
executed: true
evidence: ["wiki/qa/companion-database-plumbing-review.md"]
source_tool: "codex"
source: "User-authorized database plumbing review for JFusco/design-passport#73"
topics: ["supabase-companion"]
digest: "139688d5622c851720a460d43e54fb71a7a5fadbd56ac106d03cf38e53301a9e"
---

# Verify existing companion imports and database architecture

1. Preserve the selected UI-library exports unchanged and validate their audit/learning contracts and digests.
2. Create and verify a private consistent backup before importing.
3. Import the two audit reports under the learning files' existing explicit project scope; verify audits alone produce no learning.
4. Import the full and filtered learning exports separately, leaving candidates unapproved; compare stored payloads, relationships, findings, observations, source/receipt timestamps, revisions and guidance against originals.
5. Retry imports and verify no new history; verify protected production-built history and downloads plus fresh-process persistence.
6. Review deployed schema/migration parity, project-qualified constraints and indexes, role privileges/RLS, transaction and connection boundaries, server-only configuration and explicit backup/export behavior against repository and Supabase standards.
7. Create and verify a post-import backup. Record redacted results, confirmed findings and deferred team limitations in the wiki; run verify:ci and deliver an issue-linked PR without merging.

Authority: user requested existing companion imports and a standards-based database structure/architecture review. No human approvals, cleanup, team deployment or production provisioning.

Subsequent user-authorized cleanup: after complete database/read-back and recovery-backup verification, delete the four imported audit/learning source exports without archiving originals; retain verified database backups outside the project. Preserve other inputs and all database history.
