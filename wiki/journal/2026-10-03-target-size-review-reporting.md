---
title: Explain sized button target reviews
topics: [design-readiness-standard]
---

# Explain sized button target reviews

A designer reported a Minimum target size review for buttons whose measured bounds were 132×44. The finding showed zero undersized targets, six reviews, and no explicit pointer interaction for the displayed button. The screenshot does not prove that every named button is actionable or that Figma's rectangle is its final hit region.

[Issue 57](https://github.com/JFusco/design-passport/issues/57) keeps the conservative review decision. The finding counts reviewed targets with measured bounds of at least 24×24 and no explicit pointer interaction, then asks the designer to confirm each actionable hit area. Bounds alone are not treated as a verified hit region. The change leaves grading, ruleset thresholds, and target assessment unchanged.

The first clean native candidate audit on the authorized disposable copy completed with a fulfilled 640,626 ms handler and zero dropped records. Thirty reviewed targets had bounds of 110–118×45 with no explicit pointer interaction, but the initial wording counted zero because it required supported hit-region geometry. The followup narrowed the statement to observed bounds and added a rotated 132×44 regression case. This native finding justified the copy correction; the corrected build still requires its own native readback. Independent review found no source blocker. The full local gate passed again: 506 unit tests across 50 files and seven Chromium tests.
