---
title: Recover context capture from unreadable component metadata
date: 2026-11-10
topics: [whole-file-design-knowledge]
---

# Recover context capture from unreadable component metadata

Issue [JFusco/design-passport#135](https://github.com/JFusco/design-passport/issues/135)
records a Generate Context failure from Figma's componentProperties getter.
The screenshot also shows disabled page exclusions in Dev Mode. Confirmed
exclusions already apply to context, but confirming them writes the profile
and therefore requires Design mode.

The adapter now captures component metadata through one guarded reader.
Rejected reads retain explicit field availability markers, preserve other
scene evidence, and contribute an affected-layer count to the context summary.
Metadata refresh removes stale cached values and clears warnings after repair.
Freshness checks include metadata, and unreadable properties cannot become an
inferred disabled-state exemption from a layer name. Page exclusion controls
explain the mode requirement without changing mutation authorization.

Regression evidence is in `tests/component-metadata-capture.test.ts`, alongside
the context-cache and interaction-state suites. Coverage includes throwing
instance, definition, and variant getters; full and cached capture; recovery;
healthy later pages; forbidden variant-definition reads; and capability copy.
Verification passed 69 test files with 798 tests and all 15 Chromium scenarios.
The updated Dev Mode and pre-context exclusion scenarios also passed separately.
The complete `pnpm run verify:ci` gate includes builds, type checks, lint, skill
provenance, and wiki integrity. The shared code map was refreshed with Graphify
0.9.36; its memory directory remains empty. The evidence-integrity review found
no high-confidence vulnerabilities in the changed capture or display paths.

A read-only hosted Figma check inspected 43 component-related nodes on the
reported roadmap page without reproducing the exception. The exact live
invalid instance remains unidentified; fixture evidence establishes the
plugin failure and recovery paths. No client canvas content was changed, and
this delivery does not publish a plugin release.

The executed plan is archived in the [plan ledger](../plans/INDEX.md). See
[whole-file design knowledge](../topics/whole-file-design-knowledge.md) for the
durable capture and exclusion behavior.
