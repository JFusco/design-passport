---
topics: [mutation-certification-safety, design-readiness-standard, design-passport-architecture, figma-runtime-qa]
plans: [2026-10-03-retire-frame-certification-and-use-the-audit-grade-as-the-goal-73e1660f88.md]
---

# Retire certification in favor of audit readiness

## Change and rationale

[Issue 64](https://github.com/JFusco/design-passport/issues/64) implements the independently reviewed retirement plan. Designers aim for B or better and a ready audit. Plugin `0.5.0` / ruleset `1.0.0-beta.5` removes the separate action, its UI and QA instrumentation, writers, rollback helpers, annotation reconciliation, and freshness scoring. There is no replacement approval step.

Historical operations are rejected before validation clones, version checkpoints, Undo boundaries, transaction markers, metadata writes, or earlier plans in a batch. Surviving cleanup commands retain serialization, dirty tracking, structural recapture, resource checks, draft and scan locks, and Dev Mode restrictions.

Legacy report schemas, certificate snapshots, raw capture-signature inputs, cached fragments, annotation-prefix filtering, and `certificationEligible:false` remain unchanged. Old findings, grades, hashes, timestamps, and producer identities are preserved. Fresh scores on previously certified targets may rise or fall; thresholds, weights, coverage caps, policies, and waivers are unchanged.

Both manifests remove the relaunch declaration while retaining their identities and permissions. Node certificate strings, source markers, grade notes, variant notes, and relaunch maps are not migrated or cleaned.

## Verification

- Unit suite: 504 tests passed, including certification-only and mixed-plan rejection, second-plan batch rejection before any earlier work or shared checkpoint, cache/full parity, both annotation prefixes, and historical restore/export.
- Retirement browser suite: three tests passed for absent certification surfaces, current and historical exports, refresh/scan locks, unsaved setup, and Dev Mode cleanup gates.
- `DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci` passed: schema/catalog/knowledge/wiki/skill checks, types, lint, 504 unit tests, five Chromium tests, and companion/plugin builds.
- Independent security review found no high-confidence vulnerabilities in the changed source, harness, manifests, and tests. This was source inspection, separate from executed tests.
- A separate, user-authorized Codex implementation review accepted commit `a2b3be3` plus the README correction with no unresolved findings. One documentation regression was fixed and rechecked: the unrelated safety guidance, reference links, and commit instructions were restored unchanged. The active release-identity line now matches `0.5.0` / `1.0.0-beta.5`. The reviewer independently passed 219 tests across 15 files, three Chromium tests, wiki integrity, and whitespace checks.
- The initial frozen Claude run `23154447-cd37-4aab-916d-3c7160c0b48c` passed its type/unit checks, then returned a session-limit error before reading the diff. That run remains blocked and unchanged; the separate Codex review did not substitute its reviewer or infer a Claude outcome.
- Native candidate smoke: partial. Computer-use inventory returned no apps or browsers and `Sky Computer Use native pipe startup failed`. No native audit, refresh, export, fixture, edit, cleanup, or certification was attempted. Exact native metadata preservation and native performance remain unproven.

## Delivery boundaries

Retirement supersedes the two certification acceptance checks and certification speed/rollback work in [issue 53](https://github.com/JFusco/design-passport/issues/53#issuecomment-5973246521), including the prior harness timing and concurrent-edit-rollback procedure. Audit-cache semantic parity and the native performance and screen-saver matrix remain open there. No new obligations or closing keywords are added for that issue.

[Pull request 65](https://github.com/JFusco/design-passport/pull/65) closes only issue 64. Merging and publication remain separate. The published certification guard remains until a separately reviewed release replaces it. Earlier raw evidence and archived plans remain unchanged.
