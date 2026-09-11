---
status: "implemented"
executed: true
evidence: ["GitHub issue JFusco/design-passport#19; branch codex/19-selection-audit-scope-clarity; src/plugin/scan-lifecycle.ts; src/ui/operations/audit-scope.ts; tests/scan-lifecycle.test.ts; tests/target-capture.test.ts; tests/ui-audit-scope.test.ts; 30 test files and 177 tests; pnpm typecheck; UI and plugin builds"]
source_tool: "repository"
source: "/private/tmp/design-passport-issue-19-plan.md"
topics: ["whole-file-design-knowledge"]
digest: "7be69504d644ea240a07c5f0d652a1cfde668577b5ea1d2e9c900f783f589396"
---

# Make Scoped Audits Look Scoped

## Summary

Preserve whole-file context for accuracy and certification, but make the chosen audit target the dominant UI story. A selection audit should never visually resemble a whole-file audit.

## Ticket and branch setup

- Create GitHub issue `[Bug] Keep selection audits visibly and behaviorally scoped` with the `bug` label.
- Create `codex/19-selection-audit-scope-clarity` from `main` and implement the work there.

## Implementation changes

- Rename **Selected components** to **Audit selection** and support only frames, components, and component sets.
- Track eligible and unsupported selections separately, reject empty or mixed/unsupported selections clearly, and snapshot targets before asynchronous context preparation.
- Keep audit progress target-focused, demote file-wide work to quiet supporting copy, remove the resetting determinate bar, and retain cancellation and accessible live status.
- Replace Overview's whole-file metrics with an audited-target summary while keeping technical context in the Context tab.
- Make completion messaging scope-aware without changing whole-file freshness or certification requirements.

## Interfaces and data flow

- Add a shared selection summary to bootstrap and selection-change messages.
- Add an internal captured target for selection IDs, current-page ID, or source-frame scope.
- Keep ScanRequest, ScanProgress, and the exported readiness-report schema unchanged.

## Verification and documentation

- Cover selection eligibility, target capture, cold and cached scans, progress presentation, cancellation, and automatic rescans.
- Update manual QA and the whole-file design knowledge topic.
- Archive this executed plan, add a journal entry, rebuild the wiki graph, and run the complete repository verification.

## Assumptions

- Complete file context remains mandatory and is built on demand rather than at plugin launch.
- Detailed file context remains available in the Context tab.
