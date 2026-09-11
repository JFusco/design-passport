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

See [Design Passport architecture](./design-passport-architecture.md), [whole-file design knowledge](./whole-file-design-knowledge.md), and [Figma runtime and release QA](./figma-runtime-qa.md).
