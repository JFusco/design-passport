---
status: "implemented"
executed: true
evidence: ["JFusco/design-passport#33; apps/companion; src/companion; tests/companion-repository.test.ts; tests/companion-figma.test.ts; tests/companion-skills.test.ts; tests/e2e/companion.spec.ts; live Figma reference-pack verification"]
source_tool: "codex"
source: "codex:/Users/joe.fusco/.codex/sessions/2026/09/23/rollout-2026-09-23T14-14-46-01a0cf7a-2c58-7623-b5d9-fdd2e921ccc8.jsonl"
topics: ["project-scoped-knowledge-loop", "design-passport-architecture"]
digest: "022d44ed88b668075ad7cea9fe8a31125edbe4819b0c0f6154aaed9743b37a84"
---

# Design Passport companion: revised plan

## Summary

Build a local-first Next.js companion for generating Figma reference packs, importing learning files, and reviewing knowledge candidates. Preserve existing plugin contracts and CLI automation.

Use concrete services instead of speculative adapter interfaces, make reads side-effect-free, and explicitly handle concurrency, import recovery, and unsaved edits.

Review baseline: **40 focused tests passed**, and wiki integrity passed. Full CI remains unverified because the pnpm bootstrap could not fetch registry metadata.

## First steps: branch and GitHub issue

Perform these steps when implementation begins:

1. **Verify GitHub access.** Use the [GitHub Issue Creator skill](/Users/joe.fusco/.agents/skills/github-issue-creator/SKILL.md). Confirm the authenticated account can read `JFusco/design-passport` and its issues. Resolve the requested labels to the repository’s canonical `enhancement` and `accessibility` labels.
2. **Check for an existing issue.** Search all states for `[Feature] Build the Design Passport Next.js companion` and inspect potential matches. Reuse only one unambiguous open issue matching the planned work; do not silently edit a conflicting issue or create a duplicate.
3. **Create the implementation branch.** Fetch `origin/main`, then create branch `codex/design-passport-companion` from that refreshed commit in managed worktree `design-passport-companion`. Preserve the original checkout and any unrelated changes.
4. **Create the issue through the skill.** Use the title above, the two validated labels, and exactly these five sections:
   - **Summary:** The local-first companion and its three user journeys.
   - **Context:** The current CLI/HTTP/UI coupling and need for a designer-friendly workflow.
   - **Details:** The implementation, security boundaries, bundled skills, and compatibility requirements in this plan.
   - **Expected Outcome:** The intended behavior followed by a clearly labeled **Acceptance Criteria** list covering the three journeys, accessible UI, preserved CLI/contracts, safe persistence/access, and passing verification.
   - **Additional Notes:** Branch name, local-first constraints, server-only Figma credentials, and deferred hosted authentication, persistence, and deployment.
5. **Verify the saved issue.** Submit the exact body through a temporary body file or structured tool arguments. Read the issue back and verify its URL, title, complete body, open state, and exact label set. Reconcile uncertain creation results before retrying.

Branch and issue creation are included. Commits, pushes, and pull requests remain outside this delivery.

## Implementation

### Application and boundaries

- Add `apps/companion` to the pnpm workspace. Pin a patched Next.js 16.3+ release with compatible React 19.2 and Tailwind 4 dependencies scoped to the app. Preserve the plugin’s dependencies and build commands.
- Extract reusable logic from `src/companion/main.ts` into typed, framework-neutral Node modules for knowledge persistence and Figma access. Reuse existing core functions and validators.
- Use concrete functions; omit generic repository, gateway, and future authentication abstractions. Inject only dependencies needed for tests, principally Figma transport and workspace location.
- Keep Next-specific `server-only` imports in app wrappers so the CLI remains usable in ordinary Node.
- Use Server Components for pages and layouts, with client components at interaction boundaries. Keep route-specific UI beside its route; promote genuinely reused components into shared folders.
- Use narrow view models and a discriminated `CompanionActionResult<T>` for safe messages, field errors, and conflicts. Existing artifact schemas remain unchanged.

### Designer journeys

- `/`: show workspace readiness, Figma-token availability, review counts, and direct task links. A missing Figma token blocks pack generation only.
- `/packs/new`: accept a validated Figma link, source/project aliases compatible with existing identifiers, and `style-guide` or `reference` role. Preserve existing identifiers without silently rewriting them. Explain that generation reads the whole file, including links containing a node selection. Produce a plugin-compatible download within the existing 90 KB limit; show safe warnings when optional variable data is unavailable.
- `/learnings/import`: support file selection and drop. Report imported, duplicate, and invalid files individually; valid files remain imported when others fail. Rebuild once after the batch. Distinguish “saved; rebuild needs retry” from “not saved,” with an explicit retry action.
- `/review`: retain URL-addressable filters and selection, supporting/contradictory evidence, editable wording and exceptions, required decision rationale, and these statuses: Awaiting review, Approved, Rejected, Deferred, and Changed since decision.
- Scope defaults to project-only; shared scope requires explicit selection. Disable approve/reject/defer while edits are unsaved. Save first, then decide against the returned revision. On conflict, retain entered text and offer an explicit reload.
- Preserve the warm neutral/orange design language, visible focus, keyboard operation, accessible help, responsive layouts, and loading/empty/error/success states.
- Keep raw records, paths, hashes, and technical errors out of visible task content. Opaque selection IDs and revision digests may remain machine metadata; sanitized files remain downloadable artifacts.

### Persistence and local access

- Introduce server-only `DESIGN_PASSPORT_WORKSPACE_ROOT`, resolved once to an absolute repository root and supplied by the launcher. Preserve existing knowledge and generated-pack locations regardless of the app’s working directory.
- Make page rendering, status reads, and production builds read-only. Rebuild after successful imports, candidate edits, decisions, and explicit rebuild requests.
- Serialize knowledge mutations with one filesystem lock per workspace shared by CLI and web. Perform load, revision check, write, and rebuild under that lock. Return clear busy/conflict results instead of overwriting concurrent work.
- Use unique temporary files, private permissions, atomic replacement, and append-only decisions. Record incomplete rebuilding and clear that state only after successful regeneration; retries must not duplicate observations or decisions.
- Confine managed knowledge paths to the configured root, including symlink checks. Never derive storage paths from uploaded filenames. Preserve explicitly requested CLI `--out` destinations.
- Preserve `pack create`, `batch ingest`, `learning import`, and `knowledge build`, including successful output formats and failure exit codes.
- Replace the inline review server with a launcher for the normal Next server. Preserve `knowledge review [--port 0]`, loopback-only binding, the actual printed URL, clear startup errors, and child-process shutdown.
- Exchange the launcher’s random capability through a bootstrap URL for an HttpOnly, SameSite=Strict cookie, then redirect to a clean URL. Check access at every protected read, action, and download; validate the exact loopback Host and same-origin writes. [Next.js security guidance](https://nextjs.org/docs/app/guides/data-security)
- Keep `FIGMA_TOKEN` server-only. Retain the fixed Figma origin, redirect rejection, and 30-second timeout; enforce the 25 MB response limit while streaming.
- Bound imports to 10 files, 1 MB per file, and 5 MB combined, with a 6 MB framework request ceiling for multipart overhead. Retain the existing 100 KB limit for edit/decision inputs.
- Adapt CSP to Next’s scripts and styles using request nonces on dynamic pages, with necessary development-only allowances. Retain no-referrer and nosniff headers. [Next.js CSP guidance](https://nextjs.org/docs/app/guides/content-security-policy)
- Without local launcher configuration—or when running on Vercel—show a setup state and disable workspace access and Figma operations.

## Bundled skills and checks

- Retain canonical skills under `.agents/skills`, Claude symlinks, and concise usage documentation in `AGENTS.md`.
- Source `next-dev-loop`, `vercel-react-best-practices`, `web-design-guidelines`, `playwright-cli` v0.1.21, `vercel-composition-patterns`, and `writing-guidelines` from the verified QA Operations snapshot `5b5b368d756d15ba70042ad394b67c7c056670fb`.
- Adapt its security guidance into `design-passport-security-review`, removing unrelated product assumptions.
- Record the copied source revision, known upstream version/revision, license evidence, and content hashes in `skills-lock.json`. Do not invent missing upstream revisions.
- Add one offline skill checker that verifies every canonical skill is locked, hashes filenames and contents, and validates Claude symlinks. No automatic fetching or updating. Hashes cover committed material, not externally fetched guidelines.
- Honor the development-loop prerequisites: Next.js 16.3+ with Turbopack and agent-browser 0.31.1+. Keep Playwright CLI exploratory; committed E2E tests use pinned `@playwright/test`.
- Use standard ESLint import restrictions and Next build checks for route-private imports, primitive/domain boundaries, client/server separation, and prohibited `@ts-nocheck`. Remove the existing CLI suppression.
- Do not build a custom architecture engine or claim static checks prove interactive test coverage.

## Verification and acceptance

- Add a Node TypeScript check covering the CLI and extracted services, plus app lint/typecheck/build checks. Preserve existing plugin checks and append app checks to `verify:ci`.
- Use Vitest for validation, Figma failures/warnings, streamed limits, path confinement, duplicate and mixed-invalid imports, concurrent mutations, stale revisions, atomic persistence, recovery, and project/shared approval semantics. Verify reads and builds do not alter knowledge files.
- Run Playwright against the production build using the **real filesystem implementation in temporary workspaces**, with only Figma transport stubbed. Cover all three journeys, dirty-draft decisions, required rationale, conflict recovery, URL restoration, downloaded artifact validation, and persistence after restart.
- Verify unauthorized reads/actions/downloads fail, secrets stay out of client bundles and responses, and production CSP permits normal operation. Check desktop/mobile layouts, keyboard navigation, validation focus, announcements, reduced motion, axe results, and console errors.
- Test skill-checker success, content drift, unlocked/missing skills, and invalid symlinks. Add Chromium installation to Quality CI; reuse the production app build for E2E. Ignore generated Next and Playwright artifacts.
- Complete the development loop and requested design, React, composition, writing, and security reviews against the finished flows.
- Archive only the executed plan with implementation evidence, update wiki journal/topics, then run plan discovery, graph generation, and wiki integrity checks.

V1 requires no database, hosted authentication, deployment, multi-user coordination, background jobs, new artifact contracts, or data migration.
