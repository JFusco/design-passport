---
topics: [design-passport-architecture]
issue: 'https://github.com/jfusco/design-passport/issues/114'
issues: ['https://github.com/jfusco/design-passport/issues/114']
---

# Regenerate the catalog in Renovate bump branches

[Issue 114](https://github.com/JFusco/design-passport/issues/114) makes a Pin Courier bump of `ui-design-brain` arrive complete. `src/generated/ui-design-brain.catalog.json` is generated from the installed package, and `catalog:check` rejects a stale copy, so pull requests 110 and 112 each needed a manual `chore(catalog): sync ui-design-brain` commit before Quality passed.

`renovate.json` now declares a `postUpgradeTasks` block that runs `pnpm install --frozen-lockfile` and `pnpm catalog:sync` once per update branch and commits only the generated catalog, with `installTools` installing pnpm at the `constraints.pnpm` version that matches `packageManager`. The central runner in `JFusco/renovate-config` allows exactly those two commands through `allowedCommands`; a command outside that allowlist is refused, not run. A workflow that pushed the sync commit itself was ruled out because Renovate stops rebasing a branch it did not author alone, which would strand the pull request when a second release arrives while it is open.

Local checks cover the configuration only: strict validation with Renovate 44.190.0 and the wiki gate. The connected proof is the next `ui-design-brain` release opening a pull request whose catalog is already in sync.

[Issue 117](https://github.com/JFusco/design-passport/issues/117): the first rebase with the task failed because the install ran the `prepare` script, husky installed its hooks into Renovate's clone, and Renovate's next `git checkout -B` failed on the `post-checkout` hook. The install now passes `--ignore-scripts`; `scripts/sync-catalog.mjs` only reads files from `node_modules/ui-design-brain`, so no lifecycle script is needed.
