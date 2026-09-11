---
topics: [design-passport-architecture, design-readiness-standard, mutation-certification-safety]
---

# Whole-file design knowledge

## Decision

Audit scope and knowledge scope are separate. A designer may grade one selected frame, the current page, or all designated source frames, but a fresh audit always indexes the complete Figma file first.

This prevents a locally clean frame from hiding inconsistent component definitions, variable sources, responsive siblings, repeated patterns, page roles, detached instances, or naming collisions elsewhere in the design system.

## Graph contents

The normalized graph records all loaded pages, semantic page roles, node relationships, components and instances, approved variable collections and bindings, responsive families, repeated structural signatures, designated source frames, and compact annotations/dev-resource evidence. Raw layer text is represented by length and fingerprint.

Library source targeting is intentionally conservative. Component sets and standalone components remain addressable roots. Foundations retain their top-level frames. A frame on a component page qualifies only when it carries an existing Design Passport certificate, an explicit `AI source frame` marker, a development resource, or measured Ready for Dev evidence on itself or its containing section. The section-name fallback exists for runtimes that expose Dev Status in their type surface but reject the getter. Frames inside `Published source / …` sections are treated as canvas scaffolding unless they carry an actual certificate, so a stale source marker created by an earlier scan cannot keep helper labels in the grading set.

Pages load sequentially under Figma's `dynamic-page` model with visible progress and cancellation. Invisible instance children are skipped by default. Traversal yields periodically so large files remain interactive.

## Freshness and drift

A graph is usable only when complete, audit-setup-matched, topology-matched, snapshot-matched, and no more than 15 minutes old. A conventional unconfigured file receives a deterministic in-memory setup and can audit immediately. Stored page mappings are reconciled at bootstrap and again before setup-dependent work. A deleted mapping opens Audit setup with a typed recovery state and requires explicit confirmation instead of reaching the audit path. Genuine document changes mark the report stale and disable certification and export until a rebuild. Expected plugin-owned mutations are suppressed during their guarded transaction, then followed by one deliberate full-file rescan.

Cancellation produces a neutral recoverable state and never permits a partial graph to certify. A file changing while knowledge is built invalidates that build rather than silently accepting mixed-time evidence.

## Observed scale

The live design-library verification indexed 36 of 36 pages, 4,896 nodes, 205 components, 305 instances, 275 responsive families, and 173 repeated-structure groups. The same snapshot supported independent selection, current-page, and source-frame grades.

See [the readiness standard](./design-readiness-standard.md) and [runtime QA](./figma-runtime-qa.md).
