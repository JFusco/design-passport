# Design Passport

An organization-published private Figma Design plugin that builds whole-file design knowledge, audits source frames for MCP/API consumption, and previews safe cleanup. Aim for **B or better and a ready result**; there is no separate certification action.

The target and context scopes are deliberately separate:

- **Audit target:** selected frames, components, or component sets; the captured current page; or all profile-designated source frames.
- **Knowledge scope:** the complete Figma file on every fresh audit. Pages are loaded sequentially with progress and cancellation.

This lets a selected frame be graded at the altitude a pipeline consumes while component definitions, instances, variables, responsive siblings, repeated structures, page roles, and source relationships are understood across the design as a whole. Incomplete or stale whole-file knowledge is a hard readiness blocker.

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
- Compact shared profile data and read-only legacy certificate capture in the `verndaleAiReady` namespace.
- Per-source readiness results with component-set variant coverage.
- JSON Schema-validated profiles, findings, change plans, and reports.
- Complete JSON and escaped Markdown report exports.
- Automatic compressed local audit recovery, historical exports, and a saved-audit picker with per-target view preferences.
- Validated persisted context fragments and multi-page batches that retain each completed page report.
- A reconcilable token-coverage ledger that separates bound, inherited, ignored, and missing evidence; only missing evidence lowers coverage.
- Required, Advisory, and Off modes for team conventions while accessibility, token correctness, evidence integrity, and readiness requirements remain locked.
- Versioned producer identity on live results, saved audits, and exports, with visibly separate production and development builds.
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
4. Wait for the complete file-wide knowledge build, then review Overview and Findings. Completion shows whether the result was saved locally.
5. Apply only reviewed cleanup and let the rescan complete. Use the current grade and readiness result to review the handoff.
6. Export current JSON for machine consumers or Markdown for people. Saved historical exports are explicitly labeled and do not establish current readiness.

The footer and audit result identify the exact plugin version, ruleset, build SHA, and Production/Development channel. If an already-open plugin window does not show the announced identity, close it and launch the organization plugin again.

### Return to an audit

Completed audits save automatically to this device. Closing Passport, switching to another plugin, or reopening the file restores the last-viewed saved result without starting another audit. The saved-audit chooser keeps the latest result for each page, selection, or whole-file audit and restores its tab, filters, and expanded finding. Node links and historical export remain available while an explicit refresh checks the design; cleanup requires verified current context.

Saved results retain their original timestamp and configuration. Session reference packs still clear on restart; their previous advisory findings can be read as part of the historical audit but are not reapplied to a new review. A profile or rule update does not rewrite the old report. Changing audit setup also keeps an unsaved completed result available for historical export.

Storage is local to the plugin and device, not shared with collaborators. The plugin uses compressed records within a conservative 4 MB budget below Figma's 5 MB quota, including existing storage. Reusable context is removed first, then least recently viewed reports. A new result never replaces the previous result for its target until the write succeeds. **Not saved** means the current result remains available for export but will not survive closing. A file without a stable file key supports session-only results. Clearing browser data or changing the plugin ID can also remove access to saved data.

Choose **Review pages** to select several pages or all pages. A batch prepares context once, saves each completed page, and reports empty pages separately. Cancellation keeps completed page results; changed/expired context or a failed page save stops the batch. An unsaved page stays open for export instead of being replaced by the next page. Batches require a stable file key; single-page and selection audits support session-only files. Reopening does not restart an interrupted batch.

### Repeat-review performance

Within a fresh unchanged session, audits reuse whole-file knowledge. After reopening or an explicit refresh, Passport validates saved base fragments against bulk page exports and Plugin API metadata, then captures changed fragments. Inferred variables, relevant variable/alias evidence, component relationships, and documentation resources are refreshed; an unverified saved graph never enables cleanup. If exports or dependencies cannot establish a match, capture falls back conservatively.

Diagnostic timings and cache counts appear only in the local plugin console. `node scripts/benchmark-context-cache.mjs 65 30` runs a synthetic cache/parity benchmark; it excludes the real Figma bridge and cannot establish a user-facing speedup. See [runtime and performance QA](wiki/guides/manual-qa.md) for the cold, reopen, component-edit, next-page, and batch measurement procedure.

Use the in-product guidance and [manual rollout QA](wiki/guides/manual-qa.md) for detailed operating and recovery steps. The published plugin is private to the Verndale organization; people outside it need an organization administrator to grant the appropriate Figma access before it can appear in Resources.

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
3. Choose `development/manifest.json`.
4. Run **Design Passport (Development)** from **Plugins → Development** and confirm the persistent Development warning and development channel in the footer.

`manifest.json` retains the existing organization-published production identity. `development/manifest.json` lives in its own directory because Figma registers one development plugin per manifest directory; it uses a separate identity so local client storage, reports, and launch menus cannot be mistaken for the published plugin. The build mirrors the exact generated controller/UI bytes into ignored `development/dist/` output because Figma confines a development plugin to its manifest directory. Both manifests remain offline and expose the same capabilities.

### Release identity and freshness

- `pnpm build` produces a Development-channel bundle and mirrors its controller/UI into `development/dist/`; `pnpm build:release` produces only the Production-channel bundle in `dist/` and deliberately leaves the development copy untouched.
- Every clean bundle embeds package version `0.4.0`, ruleset `1.0.0-beta.4`, the current 12-character Git SHA, and its channel. Production builds reject a dirty checkout; Development builds visibly append a dirty-content digest. There is no remote version service or runtime “latest” lookup.
- Production is published only to the existing organization plugin record in `manifest.json`. Figma distributes that record’s current published version to organization users; users do not import a manifest or choose an older published build.
- Before publishing, preserve the last verified production `dist/` bundle outside tracked source for rollback. A rollback republishes those verified bytes to the same organization record.
- Smoke-test the published plugin with two non-publisher organization accounts. Ask anyone with an already-open plugin window to close and relaunch **Design Passport** before validating the announced footer identity.

See Figma’s [classic-plugin release guidance](https://help.figma.com/hc/en-us/articles/360042293714-Manage-classic-plugins-as-a-developer) and [development-plugin guidance](https://help.figma.com/hc/en-us/articles/360042786733-Create-a-classic-plugin-for-development).

### Project style guides and the local companion

Project leads can generate an advisory pack from a project-specific Figma style guide without exposing a Figma token to the plugin:

```bash
FIGMA_TOKEN=your_figma_personal_access_token pnpm companion pack create \
  --url "https://www.figma.com/design/your_file_key/your_file_name" \
  --source-id style-guide:v1 \
  --project-scope project:opaque-id \
  --role style-guide \
  --out .design-passport-local/project-style-guide.json
```

Choose the generated pack file in **Context → Style guide and references** while in Design Mode. Designers see a plain-language summary, version, and short reference—not raw JSON. The pack is validated and bound privately to that exact Figma file; collaborators in the file can use it on later normal audits. Dev Mode can read it but cannot replace or remove it. A copied file rejects the inherited binding because its file fingerprint differs. One-off `reference` packs use the same command with `--role reference`, remain session-only, and are labeled as inspiration. If an unsaved file has no stable file key, its style guide can be used for that session but cannot be connected permanently.

After an audit, **Guidance → Contribute learnings** shows a plain-language preview of the sanitized observations and everything that is excluded. Exporting is optional and is the only way scanning data leaves the plugin. Import and review the machine-readable file locally:

```bash
pnpm companion:build
pnpm companion learning import path/to/review.design-passport-learning.json
FIGMA_TOKEN=your_figma_personal_access_token pnpm companion knowledge review
```

The review command starts the production companion on `127.0.0.1` and prints its private session URL. The dashboard creates downloadable reference packs, imports up to 10 learning files per batch, and opens the decision queue. Each file may be up to 1 MB, with a 5 MB combined limit. The browser never receives `FIGMA_TOKEN`.

The review screen generates draft wording automatically. A maintainer may edit it and must explicitly approve, reject, or defer it. Scope defaults to project-only; shared scope is an explicit client-neutral choice. See [the knowledge-loop guide](wiki/guides/knowledge-loop.md).

## Deterministic generated inputs

`pnpm catalog:sync` reads only the exact locked package and generates `src/generated/ui-design-brain.catalog.json`, including the authority digest and pattern guidance. It fails unless the package is exactly version 1.17.0 with 80 patterns.

`pnpm schemas:generate` compiles the committed JSON Schemas into standalone validators. Runtime validation does not call `eval` or `new Function`.

Use the check forms in CI to detect drift:

```bash
pnpm catalog:check
pnpm schemas:check
```

## Maintainer code map (Graphify)

[Graphify](https://github.com/Graphify-Labs/graphify) maps current Passport and companion source for maintainer queries. The root `.graphifyignore` includes only `src/` and `apps/companion/`; it excludes generated source and Markdown, including `wiki/`. This code map is separate from the plugin's whole-file design knowledge and the Markdown-only context-wiki graph. It is not served by the companion app.

Graphify 0.9.36 is a Python developer prerequisite, not a pnpm dependency. After the normal `pnpm install --frozen-lockfile`, install Graphify if needed (`pipx install graphifyy==0.9.36`) and register its native Git hooks from the repository root:

```bash
graphify hook install
graphify hook status
```

The repository's [Graphify skill](.agents/skills/graphify/SKILL.md) guides agents through CLI queries, source verification, and graph refreshes. Codex and Cursor discover it in `.agents/skills/`; Claude uses the link in `.claude/skills/`. It does not add agent tool hooks.

Graphify adds native `post-commit` and `post-checkout` hooks alongside Husky's quality hooks and registers a local merge driver for `graphify-out/graph.json`. The hooks refresh code in the background after commits and branch switches; after a pull or merge, run `PYTHONHASHSEED=0 graphify update .`. Use `GRAPHIFY_SKIP_HOOK=1` only for an intentional one-command skip.

The shared `graphify-out/` map includes `graph.json`, `graph.html`, `GRAPH_REPORT.md`, `manifest.json`, analysis, and labels. Open `graphify-out/graph.html` locally, or query a source symbol:

```bash
graphify explain buildChangePlans
graphify explain requirePageAccess
```

The initial map is built from local AST extraction with no model calls. To rebuild it deliberately from scratch:

```bash
PYTHONHASHSEED=0 GRAPHIFY_MAX_WORKERS=1 graphify extract . --code-only --force
PYTHONHASHSEED=0 graphify update .
```

Only the shareable outputs are committed. Caches, machine paths, query history, and dated backups stay local. Keep `graphify-out/memory/` empty: Graphify 0.9.36 scans it even when ignored. Optional query outcomes belong in ignored `graphify-out/local-memory/` via `graphify save-result --memory-dir graphify-out/local-memory`.

## Commit, push, and pull-request workflow

The repository uses the same guarded Git lifecycle as `@verndale/ui-design-library`:

- `.husky/pre-commit` runs the advisory context-wiki lifecycle without hiding an earlier blocking hook failure.
- `.husky/commit-msg` invokes standalone Commitlint with the repository policy.
- `.husky/pre-push` runs `pnpm verify:push`, which is the complete catalog, schema, wiki, TypeScript, unit-test, and production-build gate.
- `.github/workflows/commitlint.yml` validates the PR body, title, and every commit in the PR range.
- `.github/workflows/quality.yml` runs the complete non-fixing `pnpm verify:ci` gate for pull requests into `main`.

The quality hooks activate with the normal dependency install through the `prepare` script. Maintainers who use the code map also run the Graphify setup above once per clone:

```bash
pnpm install --frozen-lockfile
```

Use ordinary Git and GitHub commands for delivery, following the issue, branch,
commit, push, and PR sequence in `AGENTS.md`. Copy `.env.example` to `.env`
only for the local Figma credential. `.env` is ignored and must never be
committed. Wiki writer workflows require the repository secret `BOT_TOKEN`.

## Automatic audit setup

Designers normally open Design Passport and run an audit immediately. The plugin deterministically infers product screens or component-library intent, local page roles (`Foundations`, `Components`, `Screens`), local Semantic variable collections, and the standard 1440 / 768 / 375 breakpoints. It does not move, rename, or otherwise change Figma content while classifying the file.

`Audit setup` is a secondary recovery surface, not part of the normal workflow. It appears automatically only when the file cannot be classified safely or a saved page mapping was deleted. A recommended one-click setup is offered when deterministic inference can repair the state; unusual files can use the collapsed advanced controls for manual roles, token sources, and breakpoints.

Advanced edits remain a local draft until the designer explicitly saves them. Audits, context rebuilds, cleanup, learning contribution, and current report export stay unavailable while a draft is unsaved or invalid. Historical reports remain readable and exportable using their original configuration. Discard restores the committed setup. Deleted page mappings are removed from the draft and require review and confirmation before work continues.

The committed profile and explicit contextual-pattern confirmations are stored as shared plugin data. Legacy compact certificate summaries remain unchanged. A validated project style-guide binding is stored separately as private document-root plugin data, never public shared data or client storage. Full nodes, findings, and text are not persisted in the document. Completed reports and normalized context fragments are stored separately in local clientStorage. Text content is represented by length and a deterministic fingerprint, not raw characters; raw bulk exports are transient.

## Grades, readiness, and legacy certificates

Aim for B or better and a ready result. Readiness still requires complete whole-file knowledge, no hard blockers, and no unresolved scoring-critical reviews. Every audited source must be ready. A component set is one graded root; its variants and descendants retain their finding attribution and coverage in the report.

Plugin `0.5.0` and ruleset `1.0.0-beta.5` retire certification actions and the scored `pipeline.certification-freshness` rule. Removing that rule can raise or lower fresh scores on previously certified targets. Grade thresholds, axis weights, token-coverage caps, policies, and waivers are unchanged.

Old reports retain their findings, grades, hashes, timestamps, and producer identity. Certificate strings, source markers, grade notes, variant notes, and node relaunch data remain untouched. Legacy stamps cannot satisfy the source-annotation rule. The retired operation remains readable in historical contracts but is rejected before any cleanup writes.

Both manifests omit the old relaunch command. [Figma hides buttons whose commands are removed](https://developers.figma.com/docs/plugins/api/properties/nodes-setrelaunchdata/) without requiring node-data cleanup. Merging and publication remain separate; the published certification guard remains in place until a separately reviewed release replaces it.
