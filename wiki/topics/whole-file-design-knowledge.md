---
topics: [design-passport-architecture, design-readiness-standard, mutation-certification-safety]
---

# Whole-file design knowledge

## Decision

Audit scope and knowledge scope are separate. A designer may grade a captured selection, the captured current page, or all designated source frames. A selection audit accepts only `FRAME`, `COMPONENT`, and `COMPONENT_SET` roots; empty, unsupported, and mixed supported/unsupported selections are blocked before any indexing begins.

The target is captured before asynchronous context work starts. Later selection or page changes cannot retarget the in-flight audit, an explicit manual refresh reuses the last committed target, and bounded verification after supported cleanup preserves the same target. Unsupported changes require an explicit regeneration. If a captured root no longer exists, the audit fails clearly instead of broadening its scope.

This prevents a locally clean frame from hiding inconsistent component definitions, variable sources, responsive siblings, repeated patterns, page roles, detached instances, or naming collisions elsewhere in the design system.

Context generation is an explicit first step. Generate context captures all included pages without producing or replacing a report. Confirmed page exclusions skip scene capture and analysis while retaining every page identity for topology and watcher checks. The first audit is disabled until context exists. Persisted fragments show Cached and are validated on an explicit audit; a complete verified session graph can support repeated target audits without recapture.

The presentation stays target-first in both cases. The primary progress state names the audit scope, such as `Auditing selection (2)`, while cold-scan status describes file traversal only as preparation of supporting context and explicitly says that only the selection will be graded. Raw page names, node counts, knowledge-graph terminology, cross-file relationship messages, and resetting determinate progress are not primary UI. Results summarize the audited target beneath the single grade hero in Report; detailed included-scope inventory remains in context settings. Panel commands are inert while an audit is in flight so unrelated command failures cannot make a still-running audit appear complete; cancellation remains available during supporting-context preparation. Status notifications use a shared inset and vertical gap to remain separate from navigation and panel content.

## Graph contents

The normalized graph records all loaded pages, semantic page roles, node relationships, components and instances, approved variable collections and bindings, responsive families, repeated structural signatures, designated source frames, and compact annotations/dev-resource evidence. Raw layer text is represented by length and fingerprint.

Library source targeting is intentionally conservative. Component sets and standalone components remain addressable roots. Foundations retain their top-level frames. A frame on a component page qualifies only when it carries an existing Design Passport certificate, an explicit `AI source frame` marker, a development resource, or measured Ready for Dev evidence on itself or its containing section. The section-name fallback exists for runtimes that expose Dev Status in their type surface but reject the getter. Frames inside `Published source / …` sections are treated as canvas scaffolding unless they carry an actual certificate, so a stale source marker created by an earlier scan cannot keep helper labels in the grading set.

Pages load sequentially under Figma's `dynamic-page` model with quiet supporting-context progress and cancellation. Invisible instance children are skipped by default. Traversal yields periodically so large files remain interactive.

## Freshness and drift

A graph is usable only when complete for the included pages, audit-setup-matched, topology-matched, snapshot-matched and clean, with a successful whole-context validation in this session within 15 minutes. Capture time remains separate. An explicit audit can revalidate an aged unchanged graph without recapture; micro-checks and batch page guards do not renew validation authority. Historical reports and restored timestamps cannot authorize actions.

Stored page mappings and exclusions are reconciled at bootstrap and before setup-dependent work. Exclusions are confirmed separately from semantic roles. Directly excluded targets and targets whose required local component sources were excluded require reinclusion and regeneration. Unknown or structural changes anywhere remain conservative regeneration reasons.

Supported property changes are journaled for local and remote edits. Check again stages the selected issue fields, every supported pending change and their proven consumers/rendering/layout dependents, then re-evaluates every captured target root. The candidate publishes only after resources, fields, revision, age and durable-write guards pass. Unsupported or intervening changes retain the prior report and journal. Supported plugin fixes use this same path; certification remains retired. See [stepped audits and micro-fixes](./stepped-audits-micro-fixes.md).

Cancellation during whole-file context preparation produces a neutral recoverable state and never permits a partial graph to authorize actions or publish a current report. A file changing while knowledge is built invalidates that build rather than silently accepting mixed-time evidence. A selection or page change alone does not retarget the captured audit.

## Observed scale

The live design-library verification indexed 36 of 36 pages, 4,896 nodes, 205 components, 305 instances, 275 responsive families, and 173 repeated-structure groups. The same snapshot supported independent selection, current-page, and source-frame grades.

See [the readiness standard](./design-readiness-standard.md) and [runtime QA](./figma-runtime-qa.md).
