---
status: "partial"
executed: true
evidence: ["JFusco/design-passport#53; tests/plugin-audit-recovery.test.ts; tests/context-cache.test.ts; 2026-10-01 native paired audits and candidate certification; performance matrix and rollback partial"]
source_tool: "codex"
source: "codex:/Users/joe.fusco/.codex/sessions/2026/09/30/rollout-2026-09-30T15-20-29-01a0f3c2-dd2f-7de2-ad48-d846b6216ee7.jsonl"
topics: ["persistent-audits"]
digest: "e50b8ab0d10d4153d18f2f17468c2a2acbf9ee9e6bc54d922ed577b225704a88"
---

# Reduce audit memory use and certification delay

## Summary

Make surgical changes to the existing audit and certification paths. Preserve audit coverage, grades, freshness checks, saved-report formats, and undo behavior.

The screenshot identifies production build `b85721625f58`. The relevant performance problems also exist in reviewed `main` at `8a07fe8`: redundant cache copies, accumulated resource verifiers, and N + 2 whole-file checks during certification.

## Changes

**1. Remove redundant memory allocations**

- Remove the extra clone when reading cached fragments; retain one defensive copy before enrichment.
- Encode new cache fragments individually instead of retaining every uncompressed fragment until the build finishes.
- Bound retained encoded fragments by the existing storage budget minus non-context records. Stop preparing additional fragments when that allowance is exhausted.
- Preserve the existing rule that context writes occur only after a successful, accepted build.
- Clear old inference snapshots when a full rebuild cannot reuse them.

**2. Stop verifier chains from accumulating**

- Reuse the existing variable and style maps as one combined dependency registry instead of wrapping previous verifier closures.
- Retain previously observed dependencies until the next full rebuild. Do not add per-fragment dependency tracking or pruning.
- Preserve library verification and the whole-file scene-signature check.
- Verify the combined dependencies before and after incremental capture.

**3. Reduce certification to two full checks**

- Perform cheap readiness and freshness checks, then resolve all target and variant nodes.
- Run one full verification immediately before mutation.
- Apply certification synchronously in the existing undo group.
- Run one final full verification before committing success.
- Preserve rollback on failure and mark writes as started before the first setter.
- Leave audit/save verification boundaries unchanged.

**4. Add a simple busy state**

- Set a local `certifying` state and immediate duplicate-click guard.
- Show “Certifying…” on the pressed button and mark the section busy.
- Disable competing mutation controls using existing blocking props.
- Clear on success, terminal error, or profile invalidation—not on `knowledge-stale`.
- Add no progress protocol or new UI component.

## Verification

Extend existing diagnostics with timings for REST export, resource verification, scene-signature scans, cache encoding, and storage inventory. Include build identity and counts; add no telemetry service or persistent diagnostic store.

Use existing tests to verify:

- Exactly two full certification checks, regardless of target count.
- After 20 incremental refreshes, one verification still makes one local-variable inventory call.
- Cache staging stays within its allowance and cancellation publishes nothing.
- Cached and full captures retain equivalent hashes, findings, grades, and repair plans.
- Duplicate clicks, stale data, missing nodes, and partial setter failures behave correctly.

On a disposable Colliers file copy, compare the screenshot build, current `main`, and the changed build using retained, mixed, and cold context—with and without screen-saver interruption. Require three successful runs per variant.

Verify in Figma that a designer edit during final verification survives rollback while attempted certification changes are removed. A mocked undo call does not establish this.

Record before/after timings. Targets: certification at least 60% faster, retained/mixed-context audits at least 20% faster, and cold audits no more than 10% slower than current `main`. Failed reproduction, safety, or performance checks remain explicit unresolved findings.

Run `pnpm run verify:ci`.

## Boundaries and delivery

No changes to graph hashing, audit scope, scene-signature coverage, cache formats, or screen-saver behavior. No arbitrary new raw-fragment limit, dependency framework, or broader storage rewrite.

After implementation authorization, use one issue and one PR. Apply the repository security and writing guidance, update the wiki, refresh Graphify, and complete required checks. Stop at an open, verified PR; do not merge or publish.
