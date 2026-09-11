# Design Passport

An organization-published private Figma Design plugin that builds whole-file design knowledge, audits source frames for MCP/API consumption, previews safe cleanup, and certifies only deterministic grade-B-or-better results.

The target and context scopes are deliberately separate:

- **Audit target:** selected frames, components, or component sets; the captured current page; or all profile-designated source frames.
- **Knowledge scope:** the complete Figma file on every fresh audit. Pages are loaded sequentially with progress and cancellation.

This lets a selected frame be graded at the altitude a pipeline consumes while component definitions, instances, variables, responsive siblings, repeated structures, page roles, and source relationships are understood across the design as a whole. Incomplete or stale whole-file knowledge is a hard certification blocker.

## What is implemented

- Eight deterministic readiness axes and weighted A–F rollup.
- Independent source-frame grades; the weakest designated frame limits file readiness.
- Hard blockers, unresolved-review handling, and non-inflating waivers.
- A pinned projection of all 80 patterns and every alias from `@verndale/ui-design-brain@1.17.0`.
- Contextual aliases (`CTA`, `Banner`, `Label`, and `Stepper`) that always require a designer choice.
- Whole-file semantic index with page roles, component use, responsive families, variable sources, and repeated structural signatures.
- WCAG 2.2 AA solid-background text contrast and target-size checks.
- Automatic and guarded cleanup plans with one undo boundary per risk group.
- Clone-first inferred Auto Layout validation with child-order, overlap, clipping, and 0.5 px geometry postconditions.
- Semantic token-creation wizard for values repeated at least three times.
- Compact shared profile/certification data in the `verndaleAiReady` namespace.
- Concise parent-only certificate annotations and relaunch actions on passing source frames and reusable components.
- JSON Schema-validated profiles, findings, change plans, and reports.
- Complete JSON and escaped Markdown report exports.
- Project-scoped style-guide advisories, session-only references, and an explicit sanitized learning export that never changes grades.
- A local Node companion for Figma REST ingestion and human-gated knowledge review.
- No backend, telemetry, OAuth, or plugin network access. Only the separately run local companion fetches explicitly supplied Figma sources.

## Standards hierarchy

1. The measurable readiness and blocker model in the local Figma AI Readiness rubric.
2. [`@verndale/ui-design-brain@1.17.0`](https://www.npmjs.com/package/@verndale/ui-design-brain) for canonical names, aliases, contextual disambiguation, and advisory pattern checklists.
3. [Figma’s official MCP file-structure guidance](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/) for components, variables, semantic names, Auto Layout, annotations, and dev resources.
4. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for normative accessibility measurements.
5. [Figma Recommended Practices in the Age of AI](https://arie-m-prasetyo.medium.com/figma-recommended-practices-in-the-age-of-ai-e766b098ef9f) as non-normative organizational guidance.

UI Design Brain accessibility prose is intentionally advisory. It never overrides WCAG applicability or conformance.

## Use Design Passport

Design Passport is published to the Verndale organization. Organization members use the published plugin; they do **not** import this repository's manifest.

1. Open the Figma Design or Dev Mode file to review.
2. Open **Resources → Plugins** (or Quick Actions) and run **Design Passport**.
3. Choose an audit scope. Design Passport automatically classifies conventional product and library files; there is no required setup step.
4. Wait for the complete file-wide knowledge build, then review Overview and Findings.
5. Apply only reviewed cleanup, let the rescan complete, and certify only when Overview reports **ready**.
6. Export JSON for machine consumers or Markdown for people; do not distribute a stale or incomplete report.

Use the in-product guidance and [manual rollout QA](docs/manual-qa.md) for detailed operating and recovery steps. The published plugin is private to the Verndale organization; people outside it need an organization administrator to grant the appropriate Figma access before it can appear in Resources.

## Develop locally

Requirements: Node 24.14.0 and pnpm 10.33.0.

```bash
pnpm install --frozen-lockfile
pnpm verify
```

Build output:

- `dist/code.js` — Figma plugin sandbox bundle.
- `dist/index.html` — fully inlined React UI.
- `dist/companion.mjs` — local ingestion and Knowledge Review companion.

To test an unreleased local build in Figma Desktop:

1. Run `pnpm build`.
2. Open **Plugins → Development → Import plugin from manifest…**.
3. Choose `manifest.json`.
4. Run the development copy from **Plugins → Development**.

The committed manifest uses the organization-published plugin ID. Do not change that ID for ordinary development or user installation; only a release owner should change it when Figma assigns a replacement published-plugin record.

### Project style guides and the local companion

Project leads can generate an advisory pack from a project-specific Figma style guide without exposing a Figma token to the plugin:

```bash
FIGMA_TOKEN=... pnpm companion pack create \
  --url "https://www.figma.com/design/..." \
  --source-id style-guide:v1 \
  --project-scope project:opaque-id \
  --role style-guide \
  --out .design-passport-local/project-style-guide.json
```

Choose the generated pack file in **Context → Style guide and references** while in Design Mode. Designers see a plain-language summary, version, and short reference—not raw JSON. The pack is validated and bound privately to that exact Figma file; collaborators in the file can use it on later normal audits. Dev Mode can read it but cannot replace or remove it. A copied file rejects the inherited binding because its file fingerprint differs. One-off `reference` packs use the same command with `--role reference`, remain session-only, and are labeled as inspiration. If an unsaved file has no stable file key, its style guide can be used for that session but cannot be connected permanently.

After an audit, **Guidance → Contribute learnings** shows a plain-language preview of the sanitized observations and everything that is excluded. Exporting is optional and is the only way scanning data leaves the plugin. Import and review the machine-readable file locally:

```bash
pnpm companion learning import path/to/review.design-passport-learning.json
pnpm companion knowledge review
```

The review screen generates draft wording automatically. A maintainer may edit it and must explicitly approve, reject, or defer it. Scope defaults to project-only; shared scope is an explicit client-neutral choice. See [the knowledge-loop guide](docs/knowledge-loop.md).

## Deterministic generated inputs

`pnpm catalog:sync` reads only the exact locked package and generates `src/generated/ui-design-brain.catalog.json`, including the authority digest and pattern guidance. It fails unless the package is exactly version 1.17.0 with 80 patterns.

`pnpm schemas:generate` compiles the committed JSON Schemas into standalone validators. Runtime validation does not call `eval` or `new Function`.

Use the check forms in CI to detect drift:

```bash
pnpm catalog:check
pnpm schemas:check
```

## Commit, push, and pull-request workflow

The repository uses the same guarded Git lifecycle as `@verndale/ui-design-library`:

- `.husky/pre-commit` runs the advisory context-wiki lifecycle without hiding an earlier blocking hook failure.
- `.husky/prepare-commit-msg` can prepare a message through `@verndale/ai-commit`.
- `.husky/commit-msg` enforces the shared commit-message policy.
- `.husky/pre-push` runs `pnpm verify:push`, which is the complete catalog, schema, wiki, TypeScript, unit-test, and production-build gate.
- `.github/workflows/commitlint.yml` validates the PR title and every commit in the PR range through the shared `@verndale/ai-commit` configuration.
- `.github/workflows/quality.yml` runs the complete non-fixing `pnpm verify:ci` gate for pull requests into `main`.
- `.github/workflows/pr.yml` creates or updates a branch pull request through `@verndale/ai-pr`.

The setup commands have already been applied to the repository. A fresh checkout only needs the normal dependency install, which activates Husky through the `prepare` script:

```bash
pnpm install --frozen-lockfile
```

Use the governed helpers when you want an assisted commit or pull request:

```bash
pnpm commit
pnpm pr:create
```

Copy `.env.example` to `.env` only for local credentials or optional model settings. `.env` is ignored and must never be committed. The pull-request workflow expects the repository secret `PR_BOT_TOKEN`; optional AI-generated PR summaries additionally use the variables and secret documented in `.env.example`.

## Automatic audit setup

Designers normally open Design Passport and run an audit immediately. The plugin deterministically infers product screens or component-library intent, local page roles (`Foundations`, `Components`, `Screens`), local Semantic variable collections, and the standard 1440 / 768 / 375 breakpoints. It does not move, rename, or otherwise change Figma content while classifying the file.

`Audit setup` is a secondary recovery surface, not part of the normal workflow. It appears automatically only when the file cannot be classified safely or a saved page mapping was deleted. A recommended one-click setup is offered when deterministic inference can repair the state; unusual files can use the collapsed advanced controls for manual roles, token sources, and breakpoints.

Advanced edits remain a local draft until the designer explicitly saves them. Audits, context rebuilds, cleanup, certification, learning contribution, and report export stay unavailable while a draft is unsaved or invalid. Discard restores the committed setup. Deleted page mappings are removed from the draft and require review and confirmation before work continues.

Only the committed profile, compact certificate summaries, and explicit contextual-pattern confirmations are stored as shared plugin data. A validated project style-guide binding is stored separately as private document-root plugin data, never public shared data or client storage. Full nodes, findings, and text are not persisted there. Text content is represented in the in-memory graph by length and a deterministic fingerprint, not raw characters.

## Component-set certification

A component set is scanned as one reusable source root: every direct variant and its descendants contribute evidence, but the resulting grade belongs to the set as a whole. The certified set receives one canvas note such as `[Design Passport] Grade B (88.0) · 2 variants scanned as one component set.` Direct variants do not receive Design Passport annotations.

Re-certification removes legacy child notes whose text begins with the exact `[Design Passport] Covered by` prefix, preserves designer-authored annotations, and reports how many notes were removed. Variant properties, descendant finding attribution, per-variant filtering, and Markdown evidence remain available in the report. A repeat certification is idempotent and should report zero additional removals.

## Safety boundaries

- No content deletion, page movement, library enablement, semantic guessing, URL fetching, or template evaluation.
- Structural work attempts a version-history checkpoint named `Before Design Passport cleanup`.
- If that checkpoint is unavailable, structural work requires an explicit undo-only acknowledgement.
- A postcondition failure immediately triggers Figma Undo for that risk group.
- High-risk component conversion and variant grouping stay individually scoped.
- The Figma Plugin API does not provide a lossless “reattach this detached frame” operation. Detached nodes are therefore diagnosed and left manual instead of being destructively replaced.

See [architecture](docs/architecture.md), [ruleset](docs/ruleset.md), [security model](docs/security.md), and [manual rollout QA](docs/manual-qa.md).
