---
status: "implemented"
executed: true
evidence: ["src/core/operations/graph.ts; tests/profile-and-component-operations.test.ts; pnpm test; pnpm typecheck"]
source_tool: "repository"
source: "/private/tmp/design-passport-source-target-eligibility-plan.md"
topics: ["whole-file-design-knowledge"]
digest: "a627a4fe69ae8447e9819f702a483c2d9af8f985cbddf041fe0554db1706cc7c"
---

# Source-target eligibility fix

1. Measure the structural difference between intended source frames and helper scaffolding in the live UI Design Library.
2. Add deterministic source-marker and Dev Status evidence to the normalized graph.
3. Restrict component-page frame targets to explicitly certified/marked or Ready for Dev artifacts, while excluding Published source scaffolding and preserving component, screen, and foundation targets.
4. Add positive and negative unit coverage, update the durable wiki, and run the full CI verification.
5. Commit, push, open a focused pull request that closes design-passport#6, merge after green checks, and verify issue reconciliation.
