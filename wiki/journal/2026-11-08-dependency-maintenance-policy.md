---
date: 2026-11-08
topics: [design-passport-architecture]
plans: [2026-11-08-govern-dependency-maintenance-in-design-passport-5a6a37a10d.md]
pr: pending
issue: https://github.com/JFusco/design-passport/issues/127
---
# Govern dependency maintenance

## Why

Routine maintenance, alert-driven repairs and specialized dependency selection need explicit owners and protected scopes. Configuration must not imply live acceptance.

## What changed

Adopt the reviewed standard preset with explicit owned surfaces and exclusions. Keep maintainer merging and specialized dependency producers. Preserve exact compatibility units and generated-output ownership; authenticate Pin Courier metadata where applicable.

Weekly lockfile refresh is explicit where permitted; ai-orchestration's protected lockfile remains excluded. Dependabot stays the initial security producer. No branch protection, live Office state, client deployment or CMS access is added.

## Verification and follow-up

The full verify:ci run passed its code checks and 14 browser cases; one case failed during context teardown, then passed on an isolated rerun. The final `pnpm build` passed. The focused numeric identity test passed. No deployment occurred. Private activation, actual App-verified update delivery, natural Office adoption and alert read-back remain gated observations.
