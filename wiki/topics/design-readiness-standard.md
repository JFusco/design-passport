---
topics: [design-passport-architecture, whole-file-design-knowledge, mutation-certification-safety]
---

# Design readiness standard

## Authority order

The ruleset combines the local Figma AI Readiness rubric, UI Design Brain naming, Figma's official MCP/plugin guidance, WCAG 2.2 AA, and the supplied AI-era Figma article. WCAG is normative for measurable accessibility. The article is organizational guidance only.

## Deterministic grading

Every rule is `pass`, `fail`, `needs-review`, `waived`, or `not-applicable` with severity weight 1, 2, or 4. Reviews count as failed until resolved, and waivers remain deductions. Token application, layer naming, and pipeline readiness receive 2× axis weight.

Grades are A at 90, B at 80, C at 70, D at 50, and F below 50. Readiness requires grade B or better, no hard blocker, no unresolved critical review, and fresh complete whole-file knowledge. Each source frame is graded independently; the file passes only when every designated source frame passes.

Missing verified Code Connect evidence caps an otherwise A result at B but does not block readiness. Token application needs at least 85% binding coverage for B and 95% for A. Default names below 5% are healthy, 5–15% are C territory, and above 15% are D or worse.

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

## Naming policy

Canonical names resolve before plain aliases. Contextual aliases such as CTA, Banner, Label, and Stepper always require designer confirmation. Unknown terms remain novel rather than guessed. Components use `<Canonical pattern> / <qualifier>`, lower-camel properties, lowercase full-word values, semantic child names, and breakpoint specimens shaped as `<Artifact> / <Breakpoint> / <Width>`.

See [the architecture](./design-passport-architecture.md) and [whole-file knowledge](./whole-file-design-knowledge.md).
