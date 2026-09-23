# Designer-feedback hardening verification

Tracking: [JFusco/design-passport#27](https://github.com/JFusco/design-passport/issues/27)

## Candidate identity

- Plugin: `0.4.0`
- Ruleset: `1.0.0-beta.4`
- Report/profile/certificate schemas: `3` / `2` / `2`
- Production Figma ID: `1679932628975716363`
- Development Figma ID: `1684602858638290536`
- Runtime network access: disabled

## Automated evidence

The candidate passed TypeScript checking, `git diff --check`, and 455 Vitest cases in 46 files. New regressions cover rendered strokes, inert zeros, hidden values, individual corners, unsupported typography units, style and component-instance inheritance, semantic token paths, wrapper normalization, policy modes, profile migration, historical report/certificate behavior, typed detachment acknowledgement, spacer sizing, token-source remediation, report-v3 validation, bounded samples, live evidence pagination, and refresh-notice presentation.

## Native Figma evidence

The final development candidate was exercised in Figma Desktop at Git commit `8ad23c1` (the UI exposes `8ad23c18d7e9`) through `development/manifest.json`, using the Figma-assigned development ID `1684602858638290536`. The repository build and the mirrored development bundle were byte-identical:

- `dist/code.js`: `b0530ef9fc86e1e005487c5402410871bd8e0501af2edeefd80b991f2bc46258`
- `dist/index.html`: `da361392380f5e43d4b71b07144b600f8a1f8efe973ce435687feb2997254ccc`
- `dist/companion.mjs`: `0f8632b34bf3bd2380b81b27dc61da501d6321e8f15cb6a732e5b172b6a3127e`

The disposable file `Design Passport — disposable persistence acceptance QA` provided 65 pages and a mapped Components page containing a documentation wrapper, component set, standalone component, hidden/zero values, unsupported typography units, and bound tokens. The launched plugin showed its persistent development warning and exact footer identity: `Plugin 0.4.0 · Ruleset 1.0.0-beta.4 · 8ad23c18d7e9 · Development`.

The current-page audit targeted only `Passport QA Button`, excluding its documentation wrapper. It completed at C/74.0 with 13 actionable findings and a fully reconcilable token ledger: 16 bound, 0 inherited, 17 ignored, and 10 missing, for 61.5% coverage. Selecting the unmarked sibling wrapper was rejected with the required `AI source frame` remediation instead of grading documentation scaffolding. A report saved by the preceding `f00ec4a` build restored as historical while the `8ad23c1` footer remained current, visibly distinguishing stale evidence from the running build.

The final recheck scanned all 65 supporting pages, retained the exact audited target and result, updated the report producer to `8ad23c18d7e9`, and displayed: `Recheck complete · 0 resolved · 13 remaining. Verified context reuse. Validated stored context.` This native pass found and fixed the development-manifest directory collision, parent-link wrapper resolution, and the leaked internal refresh label before release.

## Production publication

Pending merged-main production build, existing-record publication, organization-user smoke checks, and rollout communication. Preserve the prior verified bundle before publishing and record its recovery location plus the new production hashes here.
