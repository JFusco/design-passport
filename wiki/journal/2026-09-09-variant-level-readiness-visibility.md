---
topics: [design-readiness-standard, mutation-certification-safety]
plans: [2026-09-09-variant-level-readiness-visibility-479be6bc3d.md]
issue: "https://github.com/jfusco/design-passport/issues/7"
issues: ["https://github.com/jfusco/design-passport/issues/7"]
---

# Variant-level readiness visibility

## Change

A React 19 and Tailwind CSS 4 implementation stress test of Badge, Toast, and Datepicker exposed runtime focus, selection, month-navigation, viewport, and toast-timing defects in the generated harness. The harness was corrected and passed its tests and production build. Live Figma inspection then confirmed that Design Passport already traversed all descendants of component-set roots, including direct variants and nested state frames, but only annotated the parent set.

Design Passport now records direct variant coverage in every component-set frame result. Each entry includes the variant identity, structured properties, number of checked nodes, and IDs of findings attributed to that variant subtree. The Modules view and Markdown export explain that the parent grade is aggregate. Component-set certification adds the covered variant count to the parent certificate and adds a truthful coverage-only annotation to each direct variant without copying certification metadata.

Selecting a variant in the Modules breakdown now opens the Findings view with page, component root, and variant filters applied. The variant filter uses the report's explicit finding IDs instead of inferring ownership from display paths.

## Rationale

Repeating the parent B grade on child variants would falsely imply independent scoring. Leaving children completely unlabeled made real traversal invisible. Coverage annotations and report evidence preserve one canonical component-set grade while showing exactly which variants and states participated.

## Evidence

- GitHub issue [#7](https://github.com/JFusco/design-passport/issues/7), labeled `enhancement` and `accessibility`.
- `pnpm verify:ci` — schemas, wiki integrity, typecheck, 124 tests, UI build, and plugin build all passed.
- Live inspection of Button, Toast, Datepicker, and In-page navigation component sets confirmed that their direct variants were descendants of the graded root and previously had no child coverage annotations.
- A second live scan validated Button (12 variants), Tabs (9 variants plus a six-variant native-select alternate), and In-page navigation (two direct variants with 27-node subtrees containing the mobile states). After certification, all sampled roots and the rebuilt graph shared knowledge snapshot `h53:0411efb8bc976b`, proving the generated child notes do not immediately stale the certificate.
