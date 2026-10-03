---
title: Explain sized button target reviews
topics: [design-readiness-standard]
---

# Explain sized button target reviews

A designer reported a Minimum target size review for buttons whose measured bounds were 132×44. The finding showed zero undersized targets, six reviews, and no explicit pointer interaction for the displayed button. The screenshot does not prove that every named button is actionable or that Figma's rectangle is its final hit region.

[Issue 57](https://github.com/JFusco/design-passport/issues/57) keeps the conservative review decision. The finding now counts targets with supported geometry of at least 24×24 but no explicit pointer interaction, and tells the designer to confirm whether they are actionable. Remaining review cases retain hit-region and exception language. The change leaves grading, ruleset thresholds, and the target assessment algorithm unchanged.

The focused target-size suite and TypeScript check passed in the issue branch. The full local gate passed 506 unit tests across 50 files and seven Chromium tests. The designer screenshot is the original native observation, not proof of this revised copy; native readback remains a separate delivery check.
