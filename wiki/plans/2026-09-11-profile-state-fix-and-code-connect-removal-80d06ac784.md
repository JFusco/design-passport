---
status: "implemented"
executed: true
evidence: ["GitHub issue JFusco/design-passport#17", "branch codex/17-profile-state-code-connect-removal", "pnpm test: 27 files, 156 tests passed"]
source_tool: "codex"
source: "issue:JFusco/design-passport#17"
topics: ["design-passport-architecture", "design-readiness-standard", "whole-file-design-knowledge", "mutation-certification-safety", "figma-runtime-qa"]
digest: "80d06ac784ad65e7d474b93fe3cbe76cbf3be97d118ada6105c0248d4f39c05d"
---

# Profile-state fix and Code Connect removal

## Setup and tracking

- File a GitHub issue in `JFusco/design-passport` titled `[Bug] Prevent invalid profile scans and remove Code Connect` with the existing `bug` and `enhancement` labels.
- Fetch and fast-forward local `main` to the latest `origin/main`, preserving `.design-passport-local/`, then create `codex/<issue-number>-profile-state-code-connect-removal`.

## Implementation changes

- Change `ScanRequest` to contain only `scope` and `refreshKnowledge`; scans use the plugin's committed profile and never save it.
- Track committed and draft profiles separately in the UI. Gate scans, rebuilds, cleanup, certification, contribution, and exports while the draft is unsaved, invalid, or unconfirmed.
- Add inline semantic errors and Discard/Reset behavior. Successful Save updates `profileConfigured`, clears issues, and invalidates the old report.
- Reconcile stored profiles with current page IDs during bootstrap and before scans. Deleted mappings require reconfirmation through a typed profile-invalidated response instead of a generic error.
- Remove Code Connect from profile/schema types, plugin messages, the knowledge graph, pipeline rules, grading, generated validators, UI, tests, and current documentation.
- Strip legacy boolean `requireCodeConnect` fields when reading stored profiles; persist the new shape only after an explicit save.
- Bump the ruleset to `1.0.0-beta.2` and plugin metadata to `0.1.1`. Existing certifications become stale and require re-audit.
- Preserve historical wiki plans/journals, update current topic pages, archive this executed plan, and rebuild/check the wiki graph.

## Verification

- Cover unsaved valid and invalid drafts, Save/Discard, first-run profiles, stale page mappings, duplicate roles, invalid breakpoints, and topology changes.
- Verify legacy profiles with either removed integration value load with unrelated settings intact.
- Confirm no removed integration control, contract, finding, graph field, message, or grade cap remains.
- Run `pnpm verify:ci`, rebuild `dist/`, and smoke-test the development plugin in Figma Desktop without publishing it.
