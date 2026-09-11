---
topics: [design-passport-architecture, whole-file-design-knowledge, mutation-certification-safety, project-scoped-knowledge-loop]
---

# Figma runtime and release QA

## Runtime fixes found in Desktop

- The development manifest must include both `figma` and `dev`; Dev Mode remains audit-only.
- Dynamic-page mode requires `figma.loadAllPagesAsync()` before registering the `documentchange` watcher.
- Expected plugin mutations need a change guard so one cleanup does not create a cascade of false drift notices.
- Audit cancellation is a neutral state, not a red plugin failure.
- `window.prompt` is unreliable in the plugin sandbox, so waivers use an inline form.

## Live verification, 2026-09-08

Figma Desktop was exercised against `UI Design Library` (`gXT4bIDrkgva2uSzY763oG`) through the visible plugin UI.

- Fresh launch, close, development-menu launch, and certified-frame relaunch passed.
- Empty selection disabled only selection scope; selection, current page, and source frames produced independent results.
- Whole-file progress, cancellation, rebuild, and genuine drift refresh passed without false notice storms.
- Overview, Findings, Cleanup, Context, and Profile tabs were inspected; disclosure, filter, navigation, profile validation, breakpoint add/remove, token wizard validation, waiver apply/remove, and dismiss actions passed.
- JSON and Markdown exports completed; exported JSON parsed against the stable report shape.
- Dev Mode showed audit-only guidance and disabled profile save and certification.
- “Fix all available” applied one low-risk operation in one undo group, rescanned all 36 pages, reduced findings from 6 to 5, raised pipeline readiness from 86.7 to 93.3, and raised the selected-frame score from 89.1 to 89.9.
- Certification wrote a grade-B annotation and relaunch action. A deliberate clip-content toggle produced exactly one stale state; it was reverted before the refresh.

The live selected component finished B/ready with token application at 88.9. Current-page and all-source scans correctly remained non-ready because the broader targets contain unresolved defects; the plugin did not average them away.

## Page and frame cleanup stress test, 2026-09-08

The Button — Light page was used as a destructive-boundary-safe stress fixture. The selected `Main components / Button — Light` frame began at D/68.9 with 262 findings. “Fix all available” applied 197 low-risk and guarded operations in two undo groups, and a designer-confirmed semantic typography token bound another 25 repeated values. Raw binding coverage moved from 435/515 (84.5%) to 460/515 (89.3%).

Six remaining contrast failures all belonged to exact `Disabled=True` button variants. WCAG 2.2 excludes inactive user-interface components from minimum text contrast, so this exposed a rules-engine false positive rather than a design defect. After the rule was corrected, the frame rescanned at B/82.6, ready, and received a Design Passport certificate annotation and relaunch action.

The current-page run independently evaluated three source frames. “Fix all available” applied 421 operations in two undo groups and reduced findings from 527 to 88. The page first moved from C/77.0 to C/79.9, exposing the Documentation frame as the only remaining cap at 188/225 bindings (83.6%). The designer then created `semantic/type/documentation/eyebrow/font-weight` in the existing Semantic Dimensions collection and bound its 11 exact uses. The final page report was B/81.8, ready, with zero blockers and all three frames independently ready: Documentation B/89.9 at 199/225 bindings (88.4%), Main components B/81.8 at 460/515 (89.3%), and Interaction states B/89.9 at 583/638 (91.4%). This validates that page readiness follows the limiting source frame rather than an average.

Certification wrote matching ruleset, catalog, timestamp, and snapshot-hash annotations plus shared certification metadata to all three source frames. A final selected-frame regression remained B/81.8 and ready, with no drift loop.

No pages or content were deleted or moved, structural conversions were not auto-approved, and plugin-owned mutations did not produce a file-drift notice storm. The passing JSON report was exported as `UI-Design-Library.ai-readiness.final.json`.

## Automated verification

The release suite contains 27 Vitest files. It covers catalog resolution, grading boundaries, schemas and hostile input, committed/draft audit-setup state, automatic file classification, profile reconciliation, session/drift state, mutation planning and rollback constraints, token compatibility, UI operations, annotation migration and idempotency, cancellation feedback, inline waiver validation, project guidance, contribution sanitization, human-gated publication, knowledge-domain preservation, UTF-8 byte limits, copied-file protection, and exact inactive-component state handling for both definitions and placed instances. Performance fixtures exercise 10,000- and 50,000-node graphs.

The release gate is `pnpm verify:ci`, followed by `git diff --check`; wiki integrity is included in that command.

## Profile-state recovery, 2026-09-11

The sandbox now owns the audit profile and scan requests carry no editable setup data. Conventional files are classified deterministically and can audit immediately. The primary navigation contains only Overview, Modules, Findings, Guidance, Cleanup, and Context, distributed across the full strip; Audit setup is a secondary footer/recovery link whose manual controls remain collapsed. The React UI keeps a separate advanced draft, validates page-role and breakpoint semantics inline, and blocks scans, rebuilds, cleanup, certification, contribution, and exports until Save or Discard resolves a draft. The prior report remains readable during an unsaved edit; a successful Save clears it and forces fresh whole-file knowledge.

Bootstrap and pre-action reconciliation remove mappings to deleted pages without persisting the repair. A typed invalidation response returns the reconciled draft, current pages, suggested roles, and actionable issues, then opens Audit setup for explicit confirmation. Stored profiles from the prior plugin shape are read compatibly and are written in the current shape only after Save. Ruleset `1.0.0-beta.2` and plugin `0.1.1` make earlier certifications stale by design.

The rebuilt development plugin was exercised in Figma Desktop against `UI Design Library`. Invalid and valid drafts, downstream gates, Save/Discard, duplicate breakpoints, invalid widths, deleted-page recovery, automatic section/page-role mapping, Semantic collection selection, and the absence of the retired integration all passed. The final restored 36-page library audit completed B/87.8 and ready without publishing the plugin.

A disposable 37th page then stress-tested the complete designer journey with whitespace, default-name, missing-annotation, literal-style, clipping, spacer, and inferred-layout defects. It began F/49.9 with 25 findings. Ten safe/guarded operations in two undo groups moved it to D/58.5; inferred Auto Layout used a version-history checkpoint and clone validation; four newly measurable guarded bindings then left no previewable cleanup plans. The stress pass exposed and fixed a single-plan transient-clone event race that had invalidated the automatic rescan. Repeating the exact path completed cleanly. Two manual canvas decisions cleared the spacer/default-name findings, producing B/81.2 ready with Naming and Structure at 100. Certification was idempotent with one grade annotation plus one source marker. The disposable page was deleted, page count returned to 36, and the real library again audited B/87.8 with 36/36 pages loaded.

## Component annotation cleanup, 2026-09-09

The development plugin was rebuilt and exercised across all 36 pages of `UI Design Library` (`gXT4bIDrkgva2uSzY763oG`). The fresh graph contained 4,896 nodes, 205 components, 305 instances, 275 responsive families, and 172 repeated structures. Component certification processed 32 eligible A/B roots and removed 173 legacy child coverage annotations. A new full-file context build followed by immediate re-certification removed zero more, confirming idempotency and no mutation-driven drift loop.

Button Light, Button Dark, Toast, Datepicker, and In-page navigation were each selected from the live Modules breakdown. Every sampled set showed only `AI source frame` plus one concise parent certificate, with zero `[Design Passport] Covered by` notes. The report retained structured variant counts and descendant finding totals, and selecting a Button Dark variant opened Findings with the exact page, module, and variant filters.

Toast initially exposed a token-evidence false negative: its published `Code/Tailwind/shadow-overlay` effect style was being scored as unbound effect subfields. The adapter now treats a published effect style as machine-readable evidence for its visible effect fields while continuing to require explicit variable bindings for unstyled effects. Toast then re-audited at B/89.9 with token application at 88.9, without changing the design.

## Project knowledge-loop verification, 2026-09-10

The development plugin and local companion were exercised against `UI Design Library` (`gXT4bIDrkgva2uSzY763oG`) and the separately authored `UI Design Library Style Guide` (`vHNBRj4l821qXqH7XIATR2`). The style guide retained the library's cover treatment, documented foundations without moving the canonical source foundations, exposed 103 documentation variables, 13 text styles, one effect style, 10 structured Passport guidance markers, four breakpoint markers, and three linked remote component instances.

The connected style-guide pack persisted across plugin restarts, remained readable in Dev Mode, rejected an invalid replacement without changing the valid binding, and did not appear when the plugin opened in the separate style-guide file. A one-off reference was accepted through the file picker and cleared on restart. The designer contribution preview showed a normalized local date, a short reference, 10 actionable sanitized observations, and privacy exclusions without displaying raw JSON.

The latest plugin build loaded all 36 pages and 4,896 nodes. A full-source regression intentionally graded all 32 source targets, while the exact original Button selection independently reproduced B/89.9 and ready with project guidance loaded. The companion ingested the target plus style guide in both source orders, returned the same stable multi-file digest, preserved the target grade, and remained non-certifying.

Knowledge Review deduplicated a repeated import to zero new contributions, generated 10 focused drafts, and exercised project-only approval, shared approval, rejection, deferral, and edit-after-approval invalidation. Only the current shared approval entered the team pack; editing invalidated the earlier project approval. The redesigned local screen uses a compact queue, one focused draft, friendly statuses/dates/references, explicit scope, evidence counts, and no raw identifiers.
