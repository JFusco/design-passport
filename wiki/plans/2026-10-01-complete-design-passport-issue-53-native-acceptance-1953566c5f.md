---
status: "partial"
executed: true
evidence: ["JFusco/design-passport#53; draft PR #54; commit 5df347c; five postrepair native audits and five certified candidate runs; matched certification, speed matrix, and postrepair rollback partial"]
source_tool: "codex"
source: "codex:/Users/joe.fusco/.codex/sessions/2026/10/01/rollout-2026-10-01T13-35-54-01a0f889-7793-7e20-9378-ec01c7589f58.jsonl"
topics: ["persistent-audits"]
digest: "7ec31108b54ad98ae9f53679fbf0003ff80a2fcf12418d41965d0f9b7f8f2189"
source_digest: "1953566c5f0ccc9975034d732a994aaf594d4ed36ba8c5bca59d6e8e09c2dd28"
---

# Complete Design Passport issue 53 native acceptance

The disposable file key is redacted here and retained in private QA evidence.

## Summary

Continue from clean commit `da3b0c2` on `codex/53-audit-memory-certification`. Use only the authorized disposable Colliers copy. Preserve prior exports, issue 53, and draft PR #54. The completed Sol 6 repairs, review, and local checks are the starting point; their fixture results do not count as native acceptance.

Run the audit speed checks before the deliberate designer rename so that the rename cannot alter the comparison document. Figma was accessible during planning, but access must be checked again at execution time without bypassing a lock.

## Native setup and evidence

- Rebuild the main (`8a07fe8`) and candidate (`da3b0c2`) production bundles and QA harnesses using [the native QA procedure](/Users/joe.fusco/Projects/design-passport/scripts/qa/README.md). Generate the reporter (`b857216`) harness when its matrix run begins. For each, verify production byte hashes, the generated `qa-build.json`, the existing isolated development plugin ID, and an allowlist containing only the authorized disposable file key (retained in private evidence).
- Before every run, confirm the file key, page, six root IDs, and visible harness identity. Export evidence after correlated handler completion. Keep raw design exports private and retain all earlier exports. Summaries must identify build, cache reuse, terminal status, timing origin, and dropped evidence records.
- Use `reportVisibleElapsedMs` for uninterrupted audit comparisons and runtime `handlerElapsedMs` for certification. Record handler completion and wall time separately. Record observed screen-saver start/end and visibility evidence; describe any derived active-time estimate explicitly rather than treating it as CPU time.

## Acceptance sequence

1. **Speed probe:** Reproduce one matched retained/mixed main–candidate pair and one zero-reuse cold pair. Clear rebuildable context, restart the plugin, and verify zero reuse for cold runs. If retained/mixed remains slower than `0.80 × main`, profile the recorded fragment-validation, capture, scene-verification, and persistence phases. Make one narrowly scoped repair only when the evidence identifies repeatable redundant work that can be removed without weakening whole-file checks, audit/save boundaries, hashes, or coverage. Recheck the paired case before starting the long matrix. If no such repair meets the target, leave the speed gate partial and report the measured blocker.
2. **Audit matrix:** Once the probe meets the target, run three successful matched main–candidate pairs for each retained, mixed, and cold condition, both with and without a recorded screen-saver interruption. Run one reporter reference for each condition. Preserve the setup and order for each pair; failed or interrupted attempts do not count toward three consecutive successful candidate runs. Compare each run’s hashes, findings, grades, readiness, groups, repair plans, cache counts, active-time estimate, and wall time. Use the median of the three uninterrupted paired ratios for the speed gates: retained/mixed `≤0.80` and cold `≤1.10`. Screen-saver cases must retain semantic parity and complete successfully; report their wall-time effect separately.
3. **Certification timing:** On matched main and candidate builds, complete fresh audits and start certification through the ordinary production button within the 15-minute knowledge window. Collect three successful matched pairs. Each must have an actual `certified` terminal outcome and correlated handler completion. Use the median runtime `handlerElapsedMs` ratio for the `≤0.40` certification target. UI receipt times and the seven-versus-two verification count remain supporting evidence.
4. **Rollback last:** Snapshot all six exact prior certificate strings, full annotation objects, relaunch data, and names through read-only inspection. After a fresh candidate audit, start ordinary certification. During its second postwrite verification, rename one root through Figma’s native layer UI. Independently timestamp the interval from immediately before the rename action until the UI shows the new name; require that entire interval, including clock uncertainty, to lie between runtime verification start and finish. After failed terminal outcome and correlated handler completion, inspect all six again. Pass only if prior metadata is exact, the rename survives, and no certified success occurred. If the interval cannot be bounded, record the metadata result and leave concurrent-edit timing unproven. Never use `qa-edit` for this case.

## Checks, records, and delivery

Any new source or harness repair receives focused safety tests and independent review, followed by `DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci`. Record observed results in the existing wiki plan, journal, and topic page; run the wiki and Graphify checks. Commit and push only new reviewed work on the existing branch, then read back draft PR #54 and its checks. Keep every unsupported acceptance item marked partial. Leave the PR open and draft; do not merge, publish the plugin, close the issue, or alter the original Colliers file.

**Assumptions:** The approved disposable copy and development plugin ID remain the only native write targets. The reporter build is a historical reference; semantic parity is required between current main and candidate. Performance thresholds apply to uninterrupted matched runs, while screen-saver runs establish completion, parity, and the separately recorded interruption effect.
