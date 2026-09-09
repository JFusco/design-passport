---
topics: [mutation-certification-safety, figma-runtime-qa]
plans: [2026-09-09-clean-up-certification-annotations-eab120d954.md]
issue: "https://github.com/JFusco/design-passport/issues/12"
issues: ["https://github.com/JFusco/design-passport/issues/12", "https://github.com/JFusco/design-passport/issues/7", "https://github.com/jfusco/design-passport/issues/12"]
---

# Certification annotation cleanup

## Change

Reusable-component certification now leaves one concise annotation on the certified root. A component-set note reports its aggregate grade and direct-variant count; a non-set root reports only its grade. The existing source marker, compact certificate metadata, and relaunch action remain unchanged.

The component certification transaction removes exact-prefix legacy coverage notes from current direct variants, preserves designer annotations, and reports the number removed. The report contract, structured variant coverage, descendant finding attribution, variant filters, and Markdown table remain intact. User-facing copy now says that variants and descendants were scanned while the score belongs to the component set as a whole.

A live Toast audit also showed that published effect styles were being decomposed into apparently unbound subfields. Style-backed visible effects now count as machine-readable token evidence; unstyled effects retain the explicit-binding requirement.

## Rationale

Per-variant canvas callouts made the library difficult to read and repeated the same aggregate fact dozens of times. Keeping traversal evidence in the report provides the needed auditability without overwhelming the canvas or implying independent child grades.

## Evidence

- GitHub issue [#12](https://github.com/JFusco/design-passport/issues/12), linked to the original variant-visibility work in [#7](https://github.com/JFusco/design-passport/issues/7).
- Live certification of `UI Design Library` processed 32 component roots, removed 173 legacy child notes, and removed zero on the repeat pass after a fresh 36-page context build.
- Button Light, Button Dark, Toast, Datepicker, and In-page navigation each retained one concise parent certificate and no legacy child notes; Button Dark variant filtering remained exact.
- Toast re-audited at B/89.9 after the effect-style evidence correction, with no design mutation.
- Unit coverage verifies concise roots, exact-prefix cleanup, unrelated-annotation preservation, deletion counts, idempotency, report copy, and style-backed effect evidence.
