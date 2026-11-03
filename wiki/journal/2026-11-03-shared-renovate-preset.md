---
topics: [commit-message-standard]
issue: 'https://github.com/jfusco/design-passport/issues/105'
issues: ['https://github.com/jfusco/design-passport/issues/105']
---

# Shared Renovate preset

[Issue 105](https://github.com/JFusco/design-passport/issues/105) puts Design Passport on the shared Renovate preset `github>JFusco/renovate-config`. The repository pins `@verndale/ui-design-brain` exactly and was updated by hand. The preset enables Renovate only for first-party packages and runs centrally as the Pin Courier GitHub App on every installed repository that has a `renovate.json`. Publishing repositories notify the runner once npm serves each release, so an update pull request opens within minutes.

Renovate titles and commits use the form `chore(deps): bump @verndale/ui-design-brain to v1.18.3`, which passes the 50-character subject rule, so title and commit linting still run on `renovate/` branches. "Validate PR body" now skips them alongside `bot/wiki-` branches, because a bot pull request has no issue to close. No other dependency is managed, and the commitlint configuration and PR template are unchanged.
