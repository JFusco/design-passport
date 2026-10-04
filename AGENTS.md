## Commit message standard

Use a specific `type(scope): action` subject with an action verb and a subject
of at most 50 characters. Leave a blank line before a body when the reason,
impact, or tradeoff is not clear from the diff; wrap body and footer lines at
72 characters. Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.
Follow this repository's commitlint configuration for allowed types, scopes,
and other enforced rules. Avoid vague or ticket-only subjects.

## Git delivery flow

For repository changes that include delivery, complete this sequence:

1. Confirm the worktree is safe to switch, then switch to `main` and run
   `git pull --ff-only` so the branch point is the current remote main.
2. Create one actionable GitHub issue with the repository's canonical labels
   using the `github-issue-creator` workflow, and read the saved issue back
   before creating downstream artifacts.
3. Create `codex/<issue-number>-<short-slug>` from that updated `main`.
4. Implement only the issue scope, record substantive work in the wiki in the
   same delivery, and run `pnpm run verify:ci`.
5. Commit with a valid conventional message, then push the issue branch with
   ordinary Git commands.
6. Open a pull request with a conventional title and the canonical
   `.github/pull_request_template.md` body. Keep its level-two headings exactly
   once and in order; replace every placeholder with meaningful content,
   include `Closes #<issue-number>`, record verification and risk/rollback,
   and complete every required checkbox. Run `pnpm run lint:pr` before opening
   the PR and read the saved PR back afterward.
7. Stop after the pull request is open and verified. Never merge it, enable
   auto-merge, delete the delivery branch, or close the issue as part of this
   flow. Leave review and merging to the user.


<!-- wiki-skill:start -->
## Context wiki

Use `wiki/` as this repository's durable record of executed plans, decisions, and substantive change history. Never bulk-load `wiki/`.

- For an exact current-code, file, symbol, or command question, inspect the named source or use targeted source `rg`; do not load history.
- For a direct single-topic history or rationale question, start at `wiki/INDEX.md` when it exists and open only the page it routes to.
- Only for a cross-page why, wiring, ownership, or impact question, run `node scripts/wiki/navigate.cjs --intent why --query "<terms>"` before opening wiki pages. Use `wiring` for ownership/dependencies and `impact` for change scope.
- Query with exact slugs, identifiers, symbols, or repository-qualified GitHub references. Never use a bare issue or PR number such as `#123`.
- When both endpoints are known, use exact `--from` and `--to` node IDs.
- Trust the router's deterministic weighted shortest route, which accounts for relationship cost, hubs, and page bytes. Open only its itinerary; never add candidates, neighbors, or adjacent pages.
- Read itinerary pages sequentially, never speculatively in parallel, and stop as soon as the answer is grounded.
- If resolution is ambiguous, rerun with one returned exact ID; never open every candidate.
- Never use `grep`, `find`, or recursive `rg` as initial wiki discovery. After a router miss, run at most one root-scoped exact search: `rg -n --fixed-strings "<exact term>" wiki/`. If it fails, inspect one known source path or ask one focused question; never widen the search.
- Never read generated graph JSON directly.
- After executing a Claude, Codex, or Cursor plan, archive it and add the journal/topic updates in the same delivery per `wiki/MECHANICS.md`.
- Run `node scripts/wiki/discover-plans.cjs` to recover missed plans, `node scripts/wiki/build-graph.cjs` after wiki edits, and `node scripts/wiki/check.cjs` before completion.
- The Sigma.js graph indexes only Markdown under `wiki/`; never add code nodes.

This managed block was installed for Codex, Cursor, and Claude (via `@AGENTS.md` in `CLAUDE.md`).
<!-- wiki-skill:end -->

## Repository-local development skills

Canonical skill sources live under `.agents/skills`; `.claude/skills` contains links to the same files. Use `graphify` for code-map queries and refreshes, `next-dev-loop` while changing the companion, `playwright-cli` for browser exploration, the Vercel React/composition and web-design guidance for UI review, `writing-guidelines` for user-facing copy, and `design-passport-security-review` for credential, local-access, upload, persistence, or knowledge-decision changes.

`skills-lock.json` records the copied QA Operations snapshot, repository-local skill provenance, known upstream metadata, license evidence, and deterministic folder hashes. Run `pnpm skills:check` after modifying any skill. The check is offline and does not pin content fetched later by the web or writing guideline skills.

For Supabase or Postgres work, read `.agents/skills/supabase/SKILL.md` and
`.agents/skills/supabase-postgres-best-practices/SKILL.md`, including relevant
references. Keep runtime credentials server-only, separate migration ownership,
and verify exact migrations and restricted permissions. Database mutations use
transactions; filesystem locks protect only explicit release and backup exports.

## Graphify repository workflow

Use the repository-local [Graphify skill](.agents/skills/graphify/SKILL.md) when querying or maintaining the shared code map. It guides the Graphify CLI for current relationships in `src/` and `apps/companion/`; exact behavior comes from source, and rationale or history comes from the wiki. The map is maintainer tooling, separate from the plugin's design knowledge and the wiki's Markdown-only graph.

Use Graphify 0.9.36. After cloning, run `pnpm install --frozen-lockfile` and `graphify hook install` to register the native Git hooks and local merge driver. The hooks live beside Husky's quality hooks. Keep `graphify-out/memory/` empty, and review background graph refreshes before staging them. No Graphify agent tool hooks are installed.
