---
topics: [stepped-audits-micro-fixes]
plans: [2026-10-07-complete-figma-grade-and-score-styling-4247cafb41.md]
issue: 'https://github.com/jfusco/design-passport/issues/87'
issues: ['https://github.com/jfusco/design-passport/issues/87']
---

# Figma grade and score parity

After PR 85 merged at `e037512`, final inspection identified a CSS cascade
error: the shared 100px grade rule overrode the saved preview's 40px size.
The report also displayed one decimal and an extra denominator/status line,
where the primary reference uses two decimals and a compact hero. This
correction is tracked in [issue 87](https://github.com/JFusco/design-passport/issues/87).

Separate compact and report grade classes. Keep 40px compact letters at 23.6px,
the report's 100px grade with 39.6px letter and 16.6px score, and the saved
preview's 9px corners, 6px gap and 15.6px medium score. Preserve an accessible
out-of-100 label and visible stale status. Scoring and micro-check contracts
are unchanged.

Use primary Report node 13:485's category score colors: green `#339617` and
red `#dc0400`, with white text. Figma's expanded examples contain inconsistent
green badge variants; retain the primary reference appearance across expansion
rather than inventing a global recoloring interaction. Mixed badges and
resolved/unresolved status colors retain their existing reference values.

Exact green badges fail text contrast in addition to inactive tabs. The browser
fixture has eight green badges. Axe checks assert exactly those eight badges
and two inactive labels in collapsed and expanded views, and reject unrelated
findings. This is not a blanket accessibility pass.

The existing browser cases also verify saved-preview geometry, report
typography, two-decimal score publication and Clear at 320, 456 and 500px.
Required CI and hosted results are recorded in the delivery PR.

New uncommitted source edits appeared in the prior issue 84 worktree after its
commit. They remain preserved there. This correction uses a separate checkout
from updated remote main. The earlier native export proves the supported
55.0 to 57.0 micro-check without recapture. Native automation later returned
`cgWindowNotFound` repeatedly, so a fresh native run is not established by
this entry. Keep that boundary explicit in the final delivery evidence.
