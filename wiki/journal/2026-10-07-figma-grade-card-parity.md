---
topics: [plugin-style-parity, stepped-audits-micro-fixes]
plans: [2026-10-07-correct-the-figma-grade-card-and-shared-style-values-fb40cb78bc.md]
---

# Correct the grade card's Figma parity

The saved-result badge inherited the large report grade's 100px dimensions. Figma specifies 40px for that badge. [Issue 88](https://github.com/JFusco/design-passport/issues/88) follows merged PR 85 and corrects this presentation failure without changing scoring or native mutation behavior.

## Reference and changes

Read-only Figma inspection confirmed the two sizes and their distinct Inter typography, -1% tracking and 4px corners. The saved preview uses 9px corners, a 15.6px medium-weight score, and 58px total height. The report uses a 39.6px black-weight letter and a 16.6px regular-weight score. Its visible score now has two decimal places without a denominator; a named image role exposes its grade and out-of-100 score to screen readers. Stale readiness remains visible.

The shared `.grade` treatment is compact; `.report-grade` owns the 100px treatment. Remove the competing legacy grade rules. Share typography, spacing, geometry and palette through CSS variables. Match cleanup text weight, saved labels and report text gaps. Figma inspection returned no local variable collections, paint styles or text styles, so these tokens preserve literal reference values.

PR 89 merged the geometry and score corrections while this follow-up was being prepared. Reconcile remote main `e7e73c8`, retaining its primary Report green/red badge palette across expansion states. The expanded examples use inconsistent variants; expanding a category should not recolor all score badges. This follow-up adds shared literal style tokens, the named grade image role, cleanup of competing legacy rules, remaining saved-label/scope spacing corrections, and precise rendered-style regression assertions. Preserve both plan and journal records.

## Browser and native evidence

Eight focused Chromium cases pass at 320, 456 and 500px. Assertions cover saved and report dimensions, preview height and corners, exact font sizes, weights and tracking, score formatting, sticky navigation, keyboard behavior, assets, overflow, historical exports and supported micro-check states. Screenshots start at the top of the document to avoid capturing sticky navigation midway through a full-page image.

Axe retains exact reference contrast failures for inactive labels and white 9px score text. Tests assert their exact targets and palettes and reject other violations. Literal Figma style parity is not an accessibility pass. Failed intermediate checks remain under `~/.codex/artifacts/design-passport-84/parity/`; completed follow-up evidence uses `~/.codex/artifacts/design-passport-88/`.

The native app returns `cgWindowNotFound` for both its name and bundle identifier. Earlier native evidence remains intact and applies only to the pre-correction bundle documented in the [initial styling journal](./2026-10-07-figma-navigation-styles.md). No updated native acceptance or organization publication is claimed.

## Delivery

PR 85 merged at `e037512`. The original main checkout remains divergent with its unrelated environment-documentation commit and generated manifest change. Use a new isolated worktree from fetched remote main for `codex/88-grade-card-parity`; restore the earlier styling worktree to its published commit after transferring only this correction. The GitHub Issue Creator workflow is used to file and read back issue 88 with the canonical bug label. Final verification and PR read-back belong to the PR record. Review and merging remain with Joe.
