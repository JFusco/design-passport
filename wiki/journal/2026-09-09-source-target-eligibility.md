---
topics: [whole-file-design-knowledge]
plans: [2026-09-09-source-target-eligibility-fix-a627a4fe69.md]
issue: "https://github.com/jfusco/design-passport/issues/6"
issues: ["https://github.com/jfusco/design-passport/issues/6"]
---

# Source-target eligibility

## Change

Whole-file and source-frame scans no longer treat every top-level frame on a component page as a consumable source. Component sets, standalone components, screen roots, and foundation frames retain their prior behavior. Component-page frames now require an existing certificate, an explicit source marker, a development resource, native Ready for Dev evidence, or the Ready for Dev section fallback used by the live library.

`Published source / …` sections are a deliberate scaffolding boundary. Uncertified frames inside them are excluded even when an earlier scan left behind an `AI source frame` annotation. This removes variant labels and internal stages from file grades without using arbitrary frame-name heuristics.

## Evidence

The live UI Design Library showed intended documentation and specimen frames under Ready for Dev sections, while `Variant label / …` and `componentStage` helpers were under Published source sections. Unit coverage exercises native Dev Status, the structural fallback, explicit source markers, stale markers on scaffolding, component-set variants, standalone components, screens, and Foundations. The focused test suite and TypeScript check passed before the full CI gate.

Tracked by [design-passport#6](https://github.com/JFusco/design-passport/issues/6).
