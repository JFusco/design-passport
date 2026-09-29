---
status: "implemented"
executed: true
evidence: ["graphify-out/graph.json; .agents/skills/graphify/SKILL.md; graphify hook status; JFusco/design-passport#47"]
source_tool: "codex"
source: "codex:/Users/joe.fusco/.codex/sessions/2026/09/29/rollout-2026-09-29T14-20-03-01a0ee65-2a90-78d1-be19-7c86e19365a6.jsonl"
topics: ["graphify-codebase-map"]
digest: "21417fc984f4d169b160b95548846356621110abed636f97e3ab71b20dc00d31"
---

# Install Graphify skill and code map for Design Passport

## Summary

Create a shared, locally generated Graphify map for `src/` and `apps/companion/`. Exclude `wiki/`, all source Markdown, tests, scripts, and generated code. Add one repository-local skill that teaches agents to use the Graphify CLI, plus Graphify's native Git hooks.

## Implementation

- Use the locally available Graphify 0.9.36 CLI. Add a root `.graphifyignore` that allows only the two source trees and excludes generated files, dependencies, build output, and Markdown.
- Add `.agents/skills/graphify/SKILL.md` with focused CLI query, source-verification, and refresh guidance. Link it from `.claude/skills/` and record its provenance and hash in `skills-lock.json`; Codex and Cursor use the shared `.agents/skills/` copy. Do not add agent tool hooks or mandatory query-before-read rules.
- Run `graphify hook install`. Keep its native `post-commit` and `post-checkout` hooks alongside the existing Husky hooks and register its `graph.json` merge driver; add no wrapper hook. [Graphify’s hook implementation](https://github.com/Graphify-Labs/graphify/blob/v8/graphify/hooks.py) supports this setup.
- Build the first graph with local AST extraction: `PYTHONHASHSEED=0 GRAPHIFY_MAX_WORKERS=1 graphify extract . --code-only --force`, followed by `PYTHONHASHSEED=0 graphify update .`. Commit the shareable graph, viewer, report, manifest, analysis, and label outputs; ignore caches, machine paths, query memory, and backups. [Graphify’s team setup guide](https://github.com/Graphify-Labs/graphify#team-setup) documents the shared graph workflow.
- Document setup and code-map use in the README and `AGENTS.md`, with procedural CLI guidance in the skill. Keep Graphify’s code map separate from the wiki’s Markdown-only history graph and the application’s design knowledge. Keep `graphify-out/memory/` empty so Graphify 0.9.36’s forced memory scan cannot add Markdown to this code-only map.

## Verification

- Confirm `graphify hook status` reports both hooks installed and the merge driver registered. Check that existing Husky commit, push, and wiki hooks remain intact.
- Check manifest paths are limited to `src/` and `apps/companion/`, with no generated files or Markdown. Query representative Passport and companion symbols, and confirm the report records zero model token cost.
- Validate the skill and run `pnpm skills:check`, the wiki discovery/build/check commands required by `wiki/MECHANICS.md`, and `pnpm run verify:ci`. After the delivery commit, wait for the background Graphify refresh and account for any generated changes before pushing.

## Delivery

- Confirm a safe worktree, switch to `main`, and run `git pull --ff-only`. Use `github-issue-creator` to file and read back one `[Feature]` issue with the existing `enhancement` label; create `codex/<issue-number>-graphify-code-map` from updated `main`.
- Archive the executed plan and add a Graphify topic and dated wiki journal in the same delivery. Commit with a valid conventional message, push with ordinary Git, validate the completed PR template using `pnpm run lint:pr`, open the issue-closing PR, and read it back. Stop with the PR open for review.

## Assumptions

The Graphify CLI remains a developer prerequisite rather than a pnpm dependency. Initial extraction uses no model-backed labeling, consistent with the inspected QA projects. Native hooks may refresh tracked graph artifacts after Git events; preserve and review those changes.
