# Ruleset 1.0.0 beta reference

## Result states and scoring

Every rule returns `pass`, `fail`, `needs-review`, `waived`, or `not-applicable` with severity 1, 2, or 4.

- `pass` contributes its severity to passed and applicable weight.
- `fail`, `needs-review`, and `waived` contribute only to applicable weight.
- `not-applicable` is excluded.
- A waiver therefore records an accepted exception without inflating quality.
- Node-level detail may be non-scoring when an aggregate rule already measures the same defect.

Axis score is `passed applicable weight / total applicable weight`. Token application, Layer naming, and Pipeline readiness have a 2× rollup multiplier.

| Grade | Score |
| --- | ---: |
| A | ≥ 90 |
| B | ≥ 80 |
| C | ≥ 70 |
| D | ≥ 50 |
| F | < 50 |

Missing verified Code Connect evidence caps an otherwise A result at B. It does not block readiness. All in-scope core components must have verified evidence for A.

## Readiness gate

`ready = every source frame is grade B or better && no hard blockers && no unresolved severity-4 reviews && whole-file knowledge is complete and fresh`.

Hard blockers currently include:

- non-consumable root altitude;
- incomplete whole-file knowledge;
- wholly unbound responsive tier;
- colliding or mislabelled responsive names/widths;
- no real responsive signal for a Screens source;
- wholly literal measurable styling.

## Axis implementation

### Token foundation

- Approved source collection present.
- Semantic-looking variable names.
- Scopes, modes, and web code syntax.
- Evidence of primitive-to-semantic aliases.

Local token systems are valid. An enabled library is reported as a fact, never treated as proof of organizational intent.

### Token application

- Binding coverage across fills, strokes, radii, spacing, padding, dimensions, and typography.
- ≥85% is the B threshold; ≥95% is the A threshold.
- Responsive tier parity and wholly unbound-tier blocker.
- Unique compatible Figma inference becomes a guarded operation.
- Multiple matches require a designer choice.
- Repeated literal values (three or more) expose the semantic token wizard.

### Layer naming

- Under 5% Figma-default names is healthy.
- 5–15% lands in C territory.
- Over 15% is D or worse.
- Source names must be unique among siblings.
- Component roots resolve against the pinned 80-pattern catalog.
- Contextual aliases always require designer confirmation.
- Unknown terms are recorded as novel.

### Structure / Auto Layout

- Multi-child Auto Layout coverage.
- Spacer layers, opaque groups, clipping, and fixed-layout review.
- Inferred Auto Layout is guarded and clone-tested.

### Component hygiene

- Detached instance ancestry.
- Component descriptions or documentation links.
- Lower-camel properties and lowercase full-word values.
- Whole-file repeated structural candidates, excluding responsive siblings in one family.
- UI Design Brain checklist shown for resolved patterns as advisory guidance.

### Responsive completeness

- Configured width/name mapping.
- Unique family membership.
- First-class configured breakpoint specimens.
- Structural content consistency and binding-channel parity.
- Variable modes or configured widths as machine-readable responsive evidence.

### Accessibility

- WCAG 2.2 AA contrast for resolvable solid text/background pairs.
- 4.5:1 normal text; 3:1 large text.
- 24×24 enforced for name-resolved interactive targets.
- 44×44 shown as preferred touch guidance.
- Focus, keyboard, semantic HTML/ARIA, gradients, imagery, and exceptions remain manual review.

### Pipeline readiness

- Frame/component source altitude.
- Complete file knowledge.
- Source annotation and dev-resource evidence.
- Stable export names.
- Machine-readable styling.
- Optional verified Code Connect evidence.
- Existing certificate freshness.

## Source authority

The catalog owns naming and bounded product guidance only. WCAG remains normative for accessibility. The Medium article is non-normative. Figma’s official guidance controls plugin/API mechanics and recommended MCP structure.
