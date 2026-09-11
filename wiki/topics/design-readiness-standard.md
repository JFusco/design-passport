---
topics: [design-passport-architecture, whole-file-design-knowledge, mutation-certification-safety]
---

# Design readiness standard

## Authority order

The ruleset combines the local Figma AI Readiness rubric, UI Design Brain naming, Figma's official MCP/plugin guidance, WCAG 2.2 AA, and the supplied AI-era Figma article. WCAG is normative for measurable accessibility. The article is organizational guidance only.

## Deterministic grading

Every rule is `pass`, `fail`, `needs-review`, `waived`, or `not-applicable` with severity weight 1, 2, or 4. Reviews count as failed until resolved, and waivers remain deductions. Token application, layer naming, and pipeline readiness receive 2× axis weight.

Grades are A at 90, B at 80, C at 70, D at 50, and F below 50. Readiness requires grade B or better, no hard blocker, no unresolved critical review, and fresh complete whole-file knowledge. Each source frame is graded independently; the file passes only when every designated source frame passes. Reports retain page identity and root type for every target so the UI and exports can group results by page and component rather than flattening the file into one undifferentiated punch-list.

A component set is one independently graded source root. Every direct variant and all of its indexed descendants participate in that aggregate rule evaluation. Reports now enumerate those variants with their structured properties, checked node counts, and attributed finding IDs so coverage can be audited without pretending that each child earned a separate grade. Runtime keyboard, focus, ARIA, dismissal, and timing behavior remains manual-review evidence because static Figma geometry cannot prove it.

Token application is intentionally progressive and receives 2× axis weight: 80% is the broad B target, while 95% remains the hard A requirement. Falling below 80% does not independently cap an otherwise balanced B result because that duplicated the axis deduction and made near-threshold components report 79.9/C despite an uncapped B score. Default names below 5% are healthy, 5–15% are C territory, and above 15% are D or worse. Ruleset `1.0.0-beta.2` removes the former integration-specific pipeline rule and cap, so existing certifications are stale and must be re-audited.

Foundation scoring treats variables in an approved collection whose name begins with `Semantic` as semantic tokens, even when the variable's own slash path omits the word. Metadata completeness passes at 95% rather than demanding literal perfection; this keeps B attainable while still requiring a maintained library. A full-library calibration against UI Design Library moved foundation quality from 62.5 to 100, confirming that the corrected foundation criteria recognize the library while the remaining deductions measure actual application, naming, structure, accessibility, and pipeline gaps.

## Eight axes

- Token foundation
- Token application
- Layer naming
- Structure and Auto Layout
- Component hygiene
- Responsive completeness
- Accessibility
- Pipeline readiness

Hard blockers include a page or section used at the wrong consumable altitude, a wholly unbound responsive tier, colliding responsive names or widths, no real responsive signal, and wholly literal code-relevant styling.

## Accessibility state handling

WCAG 2.2 AA contrast is measured only for active text. Text inside a component, component set, or instance with an exact inactive variant assignment such as `Disabled=True`, `isEnabled=false`, or `state=disabled` is reported as exempt rather than failed. The normalized snapshot reads structured Figma variant properties for placed instances and falls back to exact variant-name assignments for component definitions. Disabled-looking prose or loosely named ordinary frames do not qualify for the exemption. The same component-state boundary removes inactive controls from target-size and keyboard-behavior counts while preserving every active failure and unresolved review.

Compound inactive values such as `state=Disabled off` also qualify after case normalization. Text in a transparent component whose eventual consumer surface is unknown is reported as a non-scoring manual contrast review; the scanner never invents a white background and labels white-on-transparent text as a measured 1:1 failure. Measured contrast failures on known solid backgrounds continue to deduct normally.

## Naming policy

Canonical names resolve before plain aliases. Contextual aliases such as CTA, Banner, Label, and Stepper always require designer confirmation. Unknown terms remain novel rather than guessed. Components use `<Canonical pattern> / <qualifier>`, lower-camel properties, readable full-word values, semantic child names, and breakpoint specimens shaped as `<Artifact> / <Breakpoint> / <Width>`. Common semantic property names such as `state` and `variant` are accepted; numbered defaults such as `State 1` and `Variant 1` remain failures. Human-facing Title Case or sentence-case values are valid, while abbreviations, underscores, and malformed whitespace are not.

Auto Layout coverage measures multi-child layout containers, not geometry-only icon wrappers or component-set canvases. Vector/shape assemblies can intentionally use absolute geometry without being treated as missing layout structure.

See [the architecture](./design-passport-architecture.md) and [whole-file knowledge](./whole-file-design-knowledge.md).
