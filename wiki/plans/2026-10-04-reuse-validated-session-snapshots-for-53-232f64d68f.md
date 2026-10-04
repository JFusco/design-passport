---
status: "partial"
executed: true
evidence: ["Issue https://github.com/JFusco/design-passport/issues/67; session, QA-storage and comparator tests; native timing pending"]
source_tool: "codex"
source: "user-approved-plan"
topics: ["persistent-audits"]
digest: "232f64d68f01684995d6d72a6efb0850a7cf3073640554e0ca444a8d659a40b3"
---

# Reuse validated session snapshots for #53

## Summary

Fix the unnecessary recapture during **Refresh audit within an open plugin session**. The native refresh recaptured 76,504 nodes in roughly 145 seconds because disk cache was limited, although previous snapshots remained in memory. A focused fixture reproduced the same gap.

Require **at least 20% faster native refreshes**, with exact semantic parity. Keep [#53](https://github.com/JFusco/design-passport/issues/53) open for its remaining restart, cold-cache, and screen-saver matrix.

## Implementation

- In [adapter.ts](/Users/joe.fusco/Projects/design-passport/src/figma/adapter.ts), consult existing session snapshots before persisted cache. Reuse requires an explicitly tracked session, matching validated fingerprint, identical ordered node IDs, and no dirty nodes in that fragment.
- Clone reused nodes through the existing `baseSnapshot` sanitizer. Continue all live enrichment, inference eligibility checks, resource checks, and full scene verification.
- Preserve disk-cache fallback and full capture for invalid, missing, unsupported, or forced-full inputs.
- Keep the existing fragment release and successful-build publication lifecycle. Add session-reuse diagnostic counters without retaining another graph.
- Leave cache/report schemas, storage limits, saved-history policy, audit scope, and production UI unchanged. Certification remains retired.

## Verification

- Extend existing tests for empty/quota-limited disk cache, mixed fragment reuse, changed inputs, forced-full capture, cancellation, and clone independence.
- Compare complete graph material, knowledge hashes, findings, groups, grades, readiness, and repair plans against forced-full capture. Verify live resource/style/inference changes still invalidate or refresh evidence.
- Extend the native comparator with explicit `--cross-build` comparison. Validate original report hashes and both build identities; permit only the expected producer build-SHA difference. Preserve strict default comparison.
- Use a real Figma-assigned isolated development ID. Add bounded, idle-only QA storage checkpoint/restore restricted to that identity and the authorized file, so both builds start measurements from identical cache state. Preserve existing QA storage and keep document writes blocked.
- Record three matched baseline/candidate pairs of unchanged, in-session refreshes using the quota-limited retained/mixed cache. Warm each session first, restore the common storage checkpoint before timing, and alternate build order.
- Require median candidate **complete handler duration ≤80% of baseline**, matching semantic results, and no native errors. Retain failed attempts privately. A missed gate remains a failed or partial result.
- Run targeted tests, then `pnpm run verify:ci`. The current four relevant suites pass **107 tests**.

## Delivery and boundaries

Create a focused follow-up issue linked to #53, branch from updated `main`, and record implementation and sanitized evidence in the wiki. Refresh Graphify and complete repository checks.

Open and verify a PR that closes the follow-up issue only. Stop at the open PR; merging and publication remain separate. No document edits, history clearing, or screen-saver-specific behavior are included.
