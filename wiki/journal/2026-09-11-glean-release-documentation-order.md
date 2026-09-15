---
topics: [figma-runtime-qa, whole-file-design-knowledge, project-scoped-knowledge-loop]
---

# Glean release documentation and ordered artifacts

## Change

Updated the six existing artifacts in [Glean project 17](https://app.glean.com/projects/17) for the published Version 3 release. The operator-facing documents now state that organization-published installations update automatically and that a person with an open panel should close it and run Design Passport again.

The scope explanation is now consistent across the orientation, rationale, runbook, readiness, technical, and knowledge-loop layers: whole-file indexing provides supporting context, while the grade and findings belong only to selected components, the current page, or source frames. The runbook and technical references use the verified release-gate result of 30 test files and 184 passing tests.

Artifact titles and `data-document-order` values remain `01` through `06`. Because the Glean project view sorts by recent update, the existing artifacts were refreshed in reverse order and visually verified in this final top-to-bottom sequence: `01 — Start Here`, `02 — Why Design Passport`, `03 — How to Use Design Passport`, `04 — Readiness Standard`, `05 — Technical Reference`, and `06 — Shared Design Passport Knowledge Loop`.

## Rationale

Readers should not infer that a focused audit grades an entire file merely because the plugin gathers file-wide knowledge. Aligning this explanation with the published-update path and keeping the project sequence predictable lets designers start at the orientation page and continue through the operating and maintainer references without contradictory release or scope cues.

## Evidence

- [Glean project 17](https://app.glean.com/projects/17) visibly presents the six artifacts in `01`–`06` order.
- Version 3 is published to the Verndale organization; normal installations update automatically after a panel restart.
- `pnpm verify:ci` passed 30 test files and 184 tests; `git diff --check` was clean.

## Durable decision

Glean mirrors the live release, but it remains a presentation layer. The repository and live Figma file stay canonical; see [Figma runtime and release QA](../topics/figma-runtime-qa.md), [whole-file design knowledge](../topics/whole-file-design-knowledge.md), and [project-scoped knowledge loop](../topics/project-scoped-knowledge-loop.md).
