---
topics: [conductor-design-workspaces]
plans: [2026-11-10-update-the-fixed-conductor-staging-address-657e83fab9.md]
---

# Correct the fixed Conductor staging address

The approved Conductor walkthrough exposed a retired staging hostname in the published plugin's environment configuration. The redhill hostname returned `ERR_NAME_NOT_RESOLVED`. The current bluewave hostname loaded and authenticated the existing Design Passport release acceptance CEC-141 project in the browser.

[Issue 134](https://github.com/JFusco/design-passport/issues/134) replaces that origin in `src/plugin/conductor-environments.ts`, `manifest.json`, and `development/manifest.json`. `tests/manifest.test.ts` pins the exact hosted allowlist and checks its agreement with configured hosted environments. The production origin, loopback development origin, plugin IDs, permissions, and transport validation are preserved.

The scoped security review traced environment selection through fixed-origin transport validation and the manifest network boundary. No high-confidence vulnerabilities were identified in this configuration-only change. No wildcard, arbitrary host, redirect, cookie, or token-handling behavior was added.

Delivery stops at the verified PR. No merge, publication, COS deployment, canvas mutation, or new design submission is part of this change. Native connection and submission acceptance must follow publication of a compatible plugin. Rollback reverts the scoped commit; the retired host would again prevent staging connections, so it is not a staging service recovery mechanism.

## Local verification and draft exception

All 788 unit tests passed, as did catalog/schema/knowledge/wiki/skill checks, typechecks, companion lint, and the companion production build. The separate plugin build also passed. Full `verify:ci` did not pass: the initial browser suite completed 13 of 15 tests successfully, while the companion workflow and dark-layout tests timed out closing their browser contexts after their main steps. An unchanged full rerun again had 13 passes and two 30-second context-teardown failures: the companion workflow and audit-history import tests. The dark-layout test passed on that rerun. The root cause remains unconfirmed; the browser tests, runner, configuration, dependencies, timeouts, and assertions are unchanged from main. Failure traces and both verification logs were preserved locally.

Joe explicitly approved a draft PR with these failures disclosed and a one-time local pre-push-hook bypass. The verification checkbox remains unchecked; GitHub CI is still enabled. The PR-body validator will report that unchecked gate rather than claim verification passed. This exception permits draft delivery only, not merging or publication.
