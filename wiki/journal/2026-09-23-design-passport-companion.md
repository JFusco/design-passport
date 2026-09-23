---
topics: [project-scoped-knowledge-loop, design-passport-architecture]
plans: [2026-09-23-design-passport-companion-revised-plan-022d44ed88.md]
---

# Design Passport local companion application

## Change

Implemented `JFusco/design-passport#33` on `codex/design-passport-companion`. The local companion now uses a Next.js App Router application for reference-pack generation, learning import, and human knowledge review. The existing CLI commands remain available, and `knowledge review` starts the production application on loopback with an explicit workspace root and process capability.

Separated Figma access, persistence, safe errors, and browser view models from CLI parsing. Workspace reads have no write side effects. Every mutation uses one per-workspace lock, digest checks inside the lock, private atomic files, symlink rejection, and a rebuild-required marker that survives partial compilation failure.

The browser exchanges the process capability for an HttpOnly, SameSite cookie. Exact Host checks, same-origin writes, and route-level authorization protect the dashboard, forms, and APIs. The Figma boundary uses a fixed API origin, rejects redirects, limits streamed responses to 25 MB, and keeps `FIGMA_TOKEN` on the server.

Added repository-local development skills with deterministic hashes and Claude links. The quality workflow now installs Chromium and runs companion lint, strict type checks, focused unit tests, production build, axe accessibility checks, and Playwright journeys. The dependency review upgraded AJV from 8.17.1 to 8.18.0 to resolve `GHSA-2g4f-4pwh-qvx6`.

Consolidated current guides, benchmark records, QA evidence, and the remaining scanner proposal under `wiki/`. The former root `docs/` tree was removed, and active repository links now point to the wiki indexes.

## Evidence

- [Revised implementation plan](../plans/2026-09-23-design-passport-companion-revised-plan-022d44ed88.md)
- [Current guides](../guides/INDEX.md)
- [QA evidence](../qa/INDEX.md)
- [Next.js companion](../../apps/companion/app/page.tsx)
- [Companion persistence boundary](../../src/companion/repository.ts)
- [Figma network boundary](../../src/companion/figma.ts)
- [Browser workflow](../../tests/e2e/companion.spec.ts)
- [GitHub issue 33](https://github.com/JFusco/design-passport/issues/33)
- `pnpm run test:companion`
- `pnpm run companion:build`
- `pnpm run test:companion:e2e`

## Durable decision

The companion remains a local repository tool. It has no hosted identity, persistence, analytics, or deployment. Figma fixtures exist only behind the explicit end-to-end test adapter; production requests retain the fixed Figma API boundary. Human decisions remain bound to exact candidate digests, and recurring evidence never publishes guidance by itself.

## Post-review remediation

A follow-up review identified ways valid work could be lost or misrepresented. Knowledge rebuilds now preserve reviewed wording, publication scope, and exceptions when new evidence changes a candidate revision; the prior decision and rationale remain visible as stale evidence for the next review. Browser drafts are stored per candidate and revision for the current session, so switching drafts, filtering the queue, or reloading does not silently discard edits.

Project approvals now complete a visible delivery loop. The dashboard offers authenticated downloads for non-empty project guidance packs, and importing one into the plugin merges its `approved-project` layer with the connected style guide rather than replacing the original guide. Shared approvals remain explicitly staged until the team pack is bundled in a plugin release. Unique-contribution counts use stable audit identity instead of producer metadata, and supporting and contradictory observations for the same recommendation remain one draft with separate counts.

The plugin now clears only rebuildable graph context when requested, retaining saved reports and view preferences. Refresh presents one designer-facing action while still selecting the safe internal path, and module refresh accepts ordinary audited frames as well as components. Cleanup cards show current and proposed values and keep structural fixes individually applicable. Guidance defaults to evidence-relevant entries, with an explicit control for viewing the complete advisory set.

The supplied Cumulative vector lockup replaces placeholder branding in both the plugin and companion. The remediation passed focused repository tests, companion lint and type checks, a production Next.js build, the complete Playwright journey, and a live Next.js/React development check with no compilation or runtime errors.

### Remediation evidence

- [Knowledge persistence and rebuilds](../../src/companion/repository.ts)
- [Knowledge aggregation and guidance layering](../../src/core/knowledge-loop.ts)
- [Review draft preservation](../../apps/companion/app/review/ReviewController.tsx)
- [Approved guidance download](../../apps/companion/app/api/guidance/route.ts)
- [Browser workflow](../../tests/e2e/companion.spec.ts)
- `pnpm run test:companion`
- `pnpm run lint:companion`
- `pnpm run typecheck && pnpm run typecheck:companion`
- `pnpm run build:companion-app`
- `pnpm run test:companion:e2e`
