# Ruleset 1.0.0 beta reference

## Result states and scoring

Every rule returns `pass`, `fail`, `needs-review`, `waived`, or `not-applicable` with severity 1, 2, or 4.

- `pass` contributes its severity to passed and applicable weight.
- `fail`, `needs-review`, and `waived` contribute only to applicable weight.
- `not-applicable` is excluded.
- A waiver therefore records an accepted exception without inflating quality.
- Node-level detail may be non-scoring when an aggregate rule already measures the same defect.

Axis score is `passed applicable weight / total applicable weight`. Token application, Layer naming, and Pipeline readiness have a 2× rollup multiplier.

Team-convention rules have three profile-v2 modes. `required` retains grading and readiness behavior, `advisory` produces review guidance without affecting grade or readiness, and `off` produces one transparent not-applicable summary per source. Layer naming, property/value grammar, canonical aliases, and source-name uniqueness default to Required. Novel terms, component descriptions, detached designs, and spacer layers default to Advisory. Accessibility, token correctness, evidence integrity, and certification safety are locked and cannot be disabled.

| Grade | Score |
| --- | ---: |
| A | ≥ 90 |
| B | ≥ 80 |
| C | ≥ 70 |
| D | ≥ 50 |
| F | < 50 |

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

- Binding coverage across fills, strokes, radii, spacing, padding, dimensions, effects, and typography is reconciled through four evidence buckets:
  - `bound` — direct variable bindings;
  - `inherited` — resolved text styles and non-overridden component-instance evidence;
  - `ignored` — hidden/non-rendered values, zero defaults, documentation scaffolding, unsupported units, and other non-applicable values;
  - `missing` — rendered, source-owned properties that can meaningfully be tokenized but lack evidence.
- Coverage is `(bound + inherited) / (bound + inherited + missing)`. A zero denominator displays **Not applicable**. Only `missing` lowers coverage.
- Saved report-v3 groups retain exact counts and at most 50 navigable samples per evidence group. A current audit can page through all live matches without expanding persisted storage.
- Individual corner and stroke-side bindings satisfy the aggregate property when every rendered non-zero side is bound. Invisible strokes are not eligible.
- Percentage/AUTO line height and percentage letter spacing are ignored because a Figma variable binding cannot preserve those units.
- ≥80% is the B threshold; ≥95% is the A threshold.
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
- Semantic token paths accept category-plus-purpose forms such as `padding/xs`, `stack/md`, and `layout/gutter`; raw literals remain non-semantic.

### Structure / Auto Layout

- Multi-child Auto Layout coverage.
- Empty non-interactive spacers are accepted when their relevant dimension is token-bound, `FILL`, or layout-growing. Other fixed spacers are advisory by default.
- Opaque groups, clipping, and fixed-layout review.
- Inferred Auto Layout is guarded and clone-tested.

### Component hygiene

- Detached designs are per-node intent reviews and advisory by default. Designers can store a node-ID-bound **Mark intentional standalone design** acknowledgement and clear it later.
- Missing component descriptions are advisory by default. External documentation links are never required and never create findings.
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
- Text and targets inside exact inactive component variants (`Disabled=True`, `isEnabled=false`, or `state=disabled`) are excluded; prose and ambiguous visual naming are not.
- 24×24 enforced for name-resolved interactive targets.
- 44×44 shown as preferred touch guidance.
- Focus, keyboard, semantic HTML/ARIA, gradients, imagery, and exceptions remain manual review.

### Pipeline readiness

- Frame/component source altitude.
- Complete file knowledge.
- Source annotation and dev-resource evidence.
- Stable export names.
- Machine-readable styling.
- Existing certificate freshness.

## Audit target normalization

On a mapped Components page, page/file scans grade top-level component sets and standalone components rather than surrounding documentation frames. Selecting an unmarked documentation wrapper resolves to those nested component sources and shows a scope notice. An intentionally auditable wrapper must carry the existing `AI source frame` annotation. Product-screen selections remain exact.

When variable collections exist but none is approved, the token-source rule explains that approval—not variable existence—is missing and links directly to Audit Setup.

## Source authority

The catalog owns naming and bounded product guidance only. WCAG remains normative for accessibility. The Medium article is non-normative. Figma’s official guidance controls plugin/API mechanics and recommended MCP structure.
