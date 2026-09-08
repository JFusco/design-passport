---
topics: [design-readiness-standard, figma-runtime-qa, mutation-certification-safety, whole-file-design-knowledge]
plans: [2026-09-08-figma-ai-ready-plugin-b69ce15884.md]
---

# Live page and frame readiness stress test

## Change

Ran Design Passport end to end on both a selected Button — Light source frame and its full Figma page. Applied the plugin's low-risk and guarded cleanup plans, created designer-named semantic variables through the token wizard, rescanned from fresh whole-file knowledge, and certified all three passing page source frames.

The stress run exposed a false accessibility failure: disabled button labels were being measured against active-text contrast thresholds. The rule engine now derives inactive state from structured properties on placed instances or exact variant-name assignments on component definitions, follows component ancestry, and excludes only those inactive text and target layers. Parsing and ancestry live in a pure operation separate from accessibility scoring.

## Evidence

- Selected frame: D/68.9 and 262 findings before cleanup; B/82.6, ready, and certified after cleanup and the rule correction.
- Current page: C/77.0 and 527 findings before cleanup; B/81.8, ready, and 86 findings after 421 planned operations plus the 11-use semantic token binding. All three source frames independently passed at B with zero blockers.
- Token evidence: Documentation reached 199/225 bindings (88.4%), Main components 460/515 (89.3%), and Interaction states 583/638 (91.4%).
- Certification evidence: shared metadata and matching annotations were read back from source frame IDs `18:2`, `26:34`, and `347:3`; a final selected-frame audit remained B/81.8 and ready.
- Mutation safety: 197 selected-frame operations and 421 page operations were committed in risk-separated undo groups; no page moves, deletes, or unconfirmed structural conversions occurred.
- Automated verification: the focused post-hardening run passed 21 test files and 105 tests plus TypeScript and production builds; the final `pnpm verify:ci` remains the release gate.

## Rationale

The readiness result must reflect implementable active states without penalizing designs for WCAG-defined inactive controls. It must also expose the weakest source frame in page/file scans so broad averages cannot conceal an unready artifact.
