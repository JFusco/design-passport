---
topics: [design-passport-architecture, whole-file-design-knowledge, figma-runtime-qa]
---

# Project-scoped knowledge loop

## Decision

Design Passport has no company-wide style guide. Each client engagement or internal tool is an isolated project context with at most one optional Figma style guide connected to each target file. A project lead performs the one-time connection; ordinary designers continue to run the plugin normally. One-off design references remain session-only.

Project and reference facts are advisory. They are evaluated after the deterministic Passport report is complete and cannot alter findings, scoring, blockers, readiness, certification, or cleanup plans. Turning guidance into a requirement remains a separate ruleset change with measurable logic, fixtures, documentation, review, and a version bump.

## Storage and privacy boundary

The plugin remains network-denied. A local Node companion owns Figma REST access and keeps `FIGMA_TOKEN` outside the plugin and generated artifacts. It accepts exact Figma design links, isolates source graphs, and emits bounded, schema-validated packs containing sanitized facts, opaque scopes, and stable digests.

A connected guide is stored in private document-root plugin data and bound to a fingerprint of the current file key; the raw key is never persisted. Duplicated-file mismatches are rejected. Dev Mode may read but not mutate the binding. When a stable key is unavailable, the guide may be used only for the current session.

Designers choose pack files through a file picker and see plain-language summaries, normalized local dates, and short references rather than JSON or internal identifiers. Learning export is explicit, previewable, cancelable, and excludes URLs, file and node IDs, screenshots, raw copy, emails, paths, source code, and waiver prose.

## Human-gated learning

The companion deduplicates timestamp-independent learning envelopes and groups only exact normalized observation keys and contexts. It generates editable draft wording, project-only scope by default, exceptions, and neutral evidence counts. Recurrence never creates confidence, eligibility, ranking, or `observed`, `corroborated`, or `conflicted` states.

Every publication requires an append-only maintainer decision bound to the exact candidate digest. Editing a candidate makes the earlier approval stale. Current project approvals compile only into that project pack; explicitly shared, client-neutral approvals compile into the pinned team pack for repository review and a later normal release. Runtime never fetches an unpinned latest pack.

## Local companion application, 2026-09-23

The maintainer journey now runs in a repository-owned Next.js application started by `pnpm companion knowledge review`. The process binds to `127.0.0.1`, creates a fresh capability, exchanges it for an HttpOnly, SameSite cookie, and authorizes every protected page and mutation. The Figma token remains server-only.

Reference-pack generation, per-file learning import, draft revision, decision recording, and rebuilding share the existing versioned contracts. Reads never rebuild or write. Mutations use one workspace lock, atomic private files, and stale-digest checks inside the lock. A failed rebuild leaves a durable retry marker after preserving the accepted input.

## Review and delivery invariants, 2026-09-23

New evidence may revise counts and the candidate digest, but it must not overwrite reviewed wording, scope, or exceptions. The exact-digest decision becomes stale and its rationale stays visible for the next human review. Unsaved browser edits are isolated by candidate and revision; they are restored within the browser session and can never be approved until the editorial changes are saved.

Contribution identity belongs to the audited design snapshot and target, not plugin-version metadata. Re-exporting the same audit does not create a new contribution, while an independently audited snapshot can contribute even when aggregate finding counts match. Supporting and contradictory observations with the same rule and context remain one neutral candidate with separate directional counts.

Project approvals form a replaceable `approved-project` layer inside the connected style-guide pack. Updating that layer preserves the original Figma-derived facts and validates the combined pack before storage changes. Approved project packs are downloadable immediately from an authorized companion session. Shared approvals enter the pinned team pack only and reach designers through the normal reviewed plugin-release process.

See [Design Passport architecture](./design-passport-architecture.md), [whole-file design knowledge](./whole-file-design-knowledge.md), and [Figma runtime and release QA](./figma-runtime-qa.md).
