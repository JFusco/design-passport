---
topics: [model-assisted-learning-review, project-scoped-knowledge-loop, supabase-companion]
plans: [2026-10-05-model-assisted-learning-review-timing-and-project-budgets-401a62b4a9.md]
---

# Model review, elapsed time and lifetime project budgets

Implemented [issue 78](https://github.com/JFusco/design-passport/issues/78) on
`codex/78-model-review-telemetry` from updated clean `main`.

The companion now previews a sanitized project snapshot before an explicitly
authorized model run. It shows elapsed time, per-run estimated cost, lifetime
spending and held reservations. Selected recommendations create project-only
human decisions atomically, with replay receipts and stable context checks.
Current shared approvals remain context, and manual drafts survive revision
conflicts across tabs.

The CLI parent owns a reusable fenced runner and retains one generation dispatch
per run. Frozen prompt/schema/pricing material governs recovery. Append-only
accounting separates unknown cost from terminal application outcome; reconciliation
and discrepancy acknowledgement preserve original evidence. The private forward
migration adds ten feature tables with restricted grants, RLS, qualified foreign
keys and terminal seals, and complete backups include all feature records.

Compared the current QA Operations worker implementation during delivery. That
worker starts Codex app-server with API-funded authentication and resolves a key
through its worker configuration. This feature retains the reviewed direct
Responses transport for exact counting, background retrieval and cancellation.
Neither approach requires a shared `.env` file: the companion runner accepts
inherited `OPENAI_API_KEY`, with an optional ignored private file.

## Verification

- 21 focused deterministic/PGlite tests pass, including exact arithmetic, strict
  output, guide staleness/retirement provenance, credentials, reservation and
  cancellation races, fencing, atomic application, additive recovery and backups.
- All 572 unit tests and ten production-built browser tests pass through
  `pnpm run verify:ci`, including companion, plugin and schema builds.
- Production-built fixture browser journeys pass for disclosure, timing,
  explicit application, cancellation, local access and manual-draft recovery.
  The application journey has no axe accessibility violations.
- Both model-review browser journeys also pass against Turbopack development.
  Next runtime checks report no compilation or session errors. React inspection
  confirms draft hydration and lightweight run-history props.
- The model and counting configuration were checked against official OpenAI
  documentation on 2026-10-05. No provider request was made.
- Structured output uses the documented provider schema subset; substantive
  rationale, unique evidence references and complete edits are checked locally.

Plan discovery recovered this reviewed specification for archival. Its single
ambiguous candidate concerns older Actions/wiki synchronization work and is
outside issue 78; no unrelated plan was archived in this delivery.

The fixtures run in one Next process and share its single-connection PGlite pool.
That pool also survives development reloads. They do not prove hosted
cross-connection locking. The explicit gated hosted probe, migration activation
and bounded paid synthetic smoke have not been run.

## Operating decision

Budgets start at zero and represent a lifetime project allowance. Unknown costs
hold reservations; completion does not imply settled accounting. A retry has a
new UUID and reservation. Rollback disables new starts and preserves evidence,
history and reservations while known responses are reconciled. Shared publishing,
Figma mutation, certification and hosted deployment remain separate work.

See [the operator and recovery contract](../topics/model-assisted-learning-review.md)
and [the archived reviewed specification](../plans/2026-10-05-model-assisted-learning-review-timing-and-project-budgets-401a62b4a9.md).
