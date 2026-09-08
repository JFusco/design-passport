---
topics: [design-passport-architecture, whole-file-design-knowledge, mutation-certification-safety]
---

# Figma runtime and release QA

## Runtime fixes found in Desktop

- The development manifest must include both `figma` and `dev`; Dev Mode remains audit-only.
- Dynamic-page mode requires `figma.loadAllPagesAsync()` before registering the `documentchange` watcher.
- Expected plugin mutations need a change guard so one cleanup does not create a cascade of false drift notices.
- Audit cancellation is a neutral state, not a red plugin failure.
- `window.prompt` is unreliable in the plugin sandbox, so waivers use an inline form.
- Code Connect must post its refreshed report before its import confirmation or the generic audit notice wins.
- The Figma plugin main thread does not consistently expose the browser `URL` constructor. Code Connect now uses a strict sandbox-safe HTTPS Figma URL parser and reports the first rejected entry's reason.

## Live verification, 2026-09-08

Figma Desktop was exercised against `UI Design Library` (`gXT4bIDrkgva2uSzY763oG`) through the visible plugin UI.

- Fresh launch, close, development-menu launch, and certified-frame relaunch passed.
- Empty selection disabled only selection scope; selection, current page, and source frames produced independent results.
- Whole-file progress, cancellation, rebuild, and genuine drift refresh passed without false notice storms.
- Overview, Findings, Cleanup, Context, and Profile tabs were inspected; disclosure, filter, navigation, profile validation, breakpoint add/remove, token wizard validation, waiver apply/remove, and dismiss actions passed.
- JSON and Markdown exports completed; exported JSON parsed against the stable report shape.
- Malformed and hostile Code Connect imports were rejected safely; a valid encoded current-file URL was accepted while its template was neither rendered nor retained.
- Dev Mode showed audit-only guidance and disabled profile save and certification.
- “Fix all available” applied one low-risk operation in one undo group, rescanned all 36 pages, reduced findings from 6 to 5, raised pipeline readiness from 86.7 to 93.3, and raised the selected-frame score from 89.1 to 89.9.
- Certification wrote a grade-B annotation and relaunch action. A deliberate clip-content toggle produced exactly one stale state; it was reverted before the refresh.

The live selected component finished B/ready with token application at 88.9. Current-page and all-source scans correctly remained non-ready because the broader targets contain unresolved defects; the plugin did not average them away.

## Automated verification

The release suite contains 19 Vitest files and 95 tests. It covers catalog resolution, grading boundaries, schemas and hostile input, session/drift state, mutation planning and rollback constraints, token compatibility, UI operations, cancellation feedback, inline waiver validation, Code Connect feedback, and URL parsing without `globalThis.URL`. Performance fixtures exercise 10,000- and 50,000-node graphs.

The release gate is `pnpm verify`, followed by `git diff --check` and the context-wiki integrity checks.
