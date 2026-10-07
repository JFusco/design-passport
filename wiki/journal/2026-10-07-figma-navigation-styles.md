---
topics: [stepped-audits-micro-fixes]
plans: [2026-10-07-align-the-plugin-with-the-figma-reference-28757aae2a.md]
issue: 'https://github.com/jfusco/design-passport/issues/84'
issues: ['https://github.com/jfusco/design-passport/issues/84']
---

# Figma navigation and style fidelity

The user authorized merging and testing the stepped audit work, then clarified
that navigation must always stay at the top and styles must use the exact
Figma values. PR 82 merged at `85207e4`; its Quality and Pages workflows passed
and issue 81 closed. This follow-up is scoped to presentation under
[issue 84](https://github.com/JFusco/design-passport/issues/84).

## Changes

Move header and navigation into one sticky group before notices, history and
progress. Use the reference's 49px header, 16px left-aligned navigation, 24px
insets and Settings position. Replace approximate typography, grade geometry,
corners, borders and asset sizes with the observed values from Audit and
Report nodes. Figma returned no variable definitions; the implementation
shares the file's literal values as CSS tokens.

Consolidate the report into target, grade, cleanup callout and collapsed
categories. Retain checks and designer-oriented evidence inside the relevant
category. Keep filters, history/storage, verification and exports expandable.
Current-page auditing is first, confirmed skips are visible, and additional
audit targets remain available. The saved-result card offers View report.
No scoring, capture, mutation, persistence or certification contract changed.

## Evidence

Eight focused Chromium cases pass at 320, 456 and 500px. The navigation case
checks all three destinations and both Settings panels, ordering before
notices/history, scrolling, fixed geometry, keyboard category expansion,
asset geometry and overflow. Existing cases retain context gating, micro-check
fallback/score publication/Clear, historical exports, setup and Dev Mode gates,
and whole-plan cleanup opt-outs.

The exact 40% inactive-tab opacity from Figma has insufficient text contrast.
Axe reports only those two inactive labels in the Report view. The test asserts
those exact known findings and fails for other accessibility regressions.
Reference 7px footer metadata also replaces the previously enlarged metadata.
This follows the user's latest explicit exact-style instruction; do not claim
a blanket accessibility pass or pixel identity for dynamic report data.

Native Figma used the existing disposable Verndale QA file and isolated
development identity. The ordinary interface generated context without a
report, audited the selected fixture, expanded Layer naming, and ran Check
again after a supported naming fix. The hero changed 55.0 to 57.0, Layer naming
changed 88.9 to 100.0, the issue became Resolved, and Clear stayed available.
Keyboard page scrolling showed the header/navigation remaining above the
lower category and resolved rows.

Private export `design-passport-native-qa-2026-10-07T17-47-40.924Z.json` retains
three correlated completed handlers, two allowlisted edits, reports, plans and
diagnostics. Run 3 has micro-check provenance. Evidence is under
`~/.codex/artifacts/design-passport-84/native/`, with the original QA bundle
preserved separately. The tested source was `85207e4` plus recorded working
changes; production code SHA-256 was
`b392de91e472d7c3356932d25b0da0072d30a5139db00a122a8c34bb40dd11f8` and UI
SHA-256 was
`16e4da7b2b2e24212c473dff8b85913ae6b79470395c353b490f72e0ac0712b9`.
The harness implementation hash remains
`27d949f85d36149aac692d62596d8f34ea7fd087676323f4642635697276be40`.

Native proof covers the isolated development bundle, not organization plugin
publication. Figma displayed a reconnect warning during this run; the local
native handler and saved audit completed, while server synchronization was
not independently verified. The original design and occupied local checkout
remain preserved. Final CI and delivery results belong in the PR verification
record and subsequent merge read-back.
