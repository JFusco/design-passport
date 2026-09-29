---
topics: [design-passport-architecture]
---

# Graphify codebase map

## Decision

Graphify 0.9.36 is maintainer tooling for current source relationships. Its root graph covers maintained `src/` and `apps/companion/` code. The allowlist excludes generated code, tests, scripts, dependencies, and source Markdown. The wiki's Sigma.js graph continues to index only `wiki/` Markdown; neither graph changes the plugin's whole-file design knowledge or the companion runtime.

The initial map uses local AST extraction without model calls. `EXTRACTED` edges come from parsing; maintainers verify `INFERRED` or `AMBIGUOUS` relationships against the cited source before using them to change code.

## Team workflow

The root graph, HTML viewer, report, portable manifest, analysis, and label files are shared. Caches, machine paths, query history, reflections, and backups stay local. Graphify 0.9.36 force-scans `graphify-out/memory/`, so it stays empty; optional query outcomes use ignored `graphify-out/local-memory/`.

The repository-local [Graphify skill](../../.agents/skills/graphify/SKILL.md) teaches agents how to query and refresh the map through the CLI. Codex and Cursor discover the shared `.agents/skills/` copy; Claude follows its `.claude/skills/` link. The skill gives task-specific guidance without agent tool hooks. Graphify's native `post-commit` and `post-checkout` hooks share Husky's hook directory without changing the quality hooks. Each clone reruns `graphify hook install` to register its local merge driver. A pull or merge needs `PYTHONHASHSEED=0 graphify update .`; commit and branch-switch refreshes run in the background.

Setup and query commands are in the [README](../../README.md#maintainer-code-map-graphify). The [executed plan](../plans/2026-09-29-install-graphify-skill-and-code-map-for-design-passport-21417fc984.md) records the selected setup. The implementation tracks [issue #47](https://github.com/JFusco/design-passport/issues/47).
