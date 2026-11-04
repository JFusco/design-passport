---
topics: [design-passport-architecture]
issue: 'https://github.com/jfusco/design-passport/issues/108'
issues: ['https://github.com/jfusco/design-passport/issues/108']
---

# Unscoped ui-design-brain catalog

[Issue 108](https://github.com/JFusco/design-passport/issues/108) moves the naming catalog to the unscoped npm package `ui-design-brain`. UI Design Brain moved to `JFusco/ui-design-brain` and publishes under that name from 1.18.3, with npm provenance. The scoped `@verndale/ui-design-brain` stays frozen at 1.18.2. Renovate cannot propose a rename, and its pull request for the scoped 1.18.2 failed because `scripts/sync-catalog.mjs` hard-coded version 1.17.0.

The catalog now projects `ui-design-brain@1.18.5`: 82 patterns, 166 plain aliases and 8 contextual aliases, up from 80, 158 and 6. The sync script expects the version pinned in `package.json` and checks the pattern count against the package's catalog manifest. A Renovate bump therefore needs only `pnpm catalog:sync` and a review of the regenerated catalog. The catalog test reads the same pin and keeps the counts explicit, so new patterns or aliases are reviewed on purpose.

Pattern confirmations stored in Figma carry the catalog version. Confirmations made against 1.17.0 return to needs-review until a designer confirms them again. They are ignored, not deleted, so a revert restores them.
