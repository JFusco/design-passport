# Commit message standard

## Decision

Use a specific scoped Conventional Commit subject with an action verb and a
subject of at most 50 characters. Add a body when the reason, impact, or tradeoff
is not clear from the diff. Wrap body and footer lines at 72 characters and use
`!` or `BREAKING CHANGE:` for a breaking change. The repository's commitlint
configuration remains the enforcement source; history is not rewritten.

Design Passport's Graphify code map remains governed by
[Graphify codebase map](graphify-codebase-map.md). This delivery adds guidance
for contributors and agents, with no Graphify behavior change.

Tracked by [design-passport issue 50](https://github.com/JFusco/design-passport/issues/50).
