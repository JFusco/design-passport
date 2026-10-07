---
topics: [stepped-audits-micro-fixes, whole-file-design-knowledge]
plans: [2026-10-07-implement-the-figma-flow-and-live-micro-fix-scoring-040107251b.md]
issue: "https://github.com/JFusco/design-passport/issues/81"
issues: ["https://github.com/JFusco/design-passport/issues/81"]
---

# Stepped audits and verified micro-fixes

## Change

Implemented the reviewed Figma flow and dark styles: explicit context generation, confirmed page exclusions, Audit/Report/Cleanup navigation and one verified report score. Existing module, evidence, guidance, coverage, saved-history, exports and guarded cleanup controls remain available. Whole-plan batch opt-outs preserve operation dependencies.

Added bounded micro-check staging for supported live fields and every supported pending edit, including remote edits on other included pages. Recomputed target rules, grade, coverage, plans and issue state commit together after revision/resource/cancellation/storage guards. Unsupported changes retain the prior result and require explicit regeneration. Stable issue keys retain unresolved aggregates and resolved rows; Clear persists a hash-bound display overlay without rewriting the report.

Profile v3 and report v4 record exclusions and verification provenance; historical readers and packet profiles remain supported. Session-only whole-context validation is separate from capture time and cannot be renewed by a micro-check, Clear or restored report.

## Evidence

- Local unit/integration suite: 55 files, 609 tests passed, including adapter parity, scoped capture, supported combined edits, resource changes, publication/save races, cancellation, overlays and retired-certification guards.
- Chromium plugin harness: seven tests passed, with screenshots at 320, 456 and 500px, keyboard focus, reduced motion and axe contrast checks. Fixtures establish UI behavior rather than native Figma execution.
- `DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci` passed: catalog/schema/knowledge/wiki/skills checks, TypeScript, lint, all 609 unit/integration tests, companion build, 14 companion/plugin browser tests and plugin build. No hosted or deployment acceptance is claimed.

Native Figma execution used a new Verndale disposable file and a separate Figma-assigned development-plugin identity. The appended harness preserved production code/UI bytes; the recorded code SHA is `f11cb21107c7a02624cb6da794dea4b03f5fd0fbb0aef1b0e8cc12d4825a72a0` and UI SHA is `2af32571c13edf1463f4e62f7c2c1b96fb7d6d5d7398b75daae36a20387209b8`. The runtime producer records remote-main c6ee4d9 plus working changes, not a clean release commit.

- Confirmed Cover exclusion yielded one captured included page and one excluded topology record. Standalone Generate context completed without a report; Current page and Selection audits completed normally.
- Two native edits, whitespace naming and an existing Auto Layout gap, were accepted together by one issue Check again. The single grade changed from 55.0 to 57.0, the issue resolved, and related gap recommendations reconciled. Its findings, grade, axes, frames, coverage, readiness, blockers, groups, plans and knowledge hash matched a subsequent fresh full capture; audit and micro-check provenance remained distinct.
- An unsupported opacity edit outside the selected target returned requires-regeneration, retained the 57.0 score and did not publish a replacement. Clear remained available on the dirty result, reported saved persistence, and the cleared naming row remained absent after restart. Restored Check again controls were disabled.
- Guarded inferred Auto Layout created a version-history checkpoint, changed NONE to HORIZONTAL with zero observed frame/child geometry movement, and required explicit regeneration for the structural change. Native Figma Undo restored NONE and the original geometry.

Seven raw native exports, including the failed QA field-selection attempt, bundle identities and the comparison summary are retained privately under `~/.codex/artifacts/design-passport-81/native/`; none are committed. This is synthetic-file native proof, not a large-document benchmark or hosted/deployment acceptance. Shared-component rendering, new-resource enrollment/rejection, simultaneous remote edits, capture/save races, cancellation, quota failure and exact immutable packet bytes have local adapter/host test proof; this native session did not inject those cases.

## Delivery and rollback

The issue branch starts at remote main c6ee4d9 in an isolated worktree; occupied local main b6a7e30 and its pre-existing Graphify manifest edit are preserved. No merge or deployment is authorized by this delivery. Revert the issue commit to restore the prior plugin. Existing historical report packets remain unchanged; avoid deleting saved audit or context evidence during rollback.
