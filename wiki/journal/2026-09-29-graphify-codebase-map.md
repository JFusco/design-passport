---
topics: [graphify-codebase-map]
plans: [2026-09-29-install-graphify-skill-and-code-map-for-design-passport-21417fc984.md]
---

# 2026-09-29 — Graphify codebase map

## Why

Maintainers needed a queryable map of Passport and companion source relationships. The existing context wiki records plans and decisions, while the plugin's whole-file knowledge describes Figma content; neither is a current-code map.

## What changed

- [Issue #47](https://github.com/JFusco/design-passport/issues/47) scopes the map to maintained `src/` and `apps/companion/` code. `.graphifyignore` excludes wiki Markdown, tests, scripts, and generated files.
- A repository-local [Graphify skill](../../.agents/skills/graphify/SKILL.md) guides CLI queries and refreshes for Codex and Cursor, with a Claude skill link. Graphify's native Husky post-commit and post-checkout hooks and graph merge driver keep the shared map current. Existing quality hooks remain active.
- A local AST pass generated a shared root graph, viewer, report, manifest, analysis, and labels with zero model token cost. Machine-local state remains ignored.
- The [Graphify topic](../topics/graphify-codebase-map.md) records scope and ownership; the [executed plan](../plans/2026-09-29-install-graphify-skill-and-code-map-for-design-passport-21417fc984.md) records this delivery.

## Evidence

`graphify hook status` reported both hooks installed and the merge driver registered. The manifest contained only the two approved source trees, with no Markdown or generated paths. `graphify explain buildChangePlans` and `graphify explain requirePageAccess` resolved to Passport and companion source locations. The report records zero model tokens. The skill validator, `pnpm skills:check`, and `pnpm run verify:ci` passed; the full gate included 485 unit tests and two companion browser tests.

<!-- plan:5ced3b3394433033fa394145b7a9471dbb0d07344ee8fbfe95284064ac0466da -->
