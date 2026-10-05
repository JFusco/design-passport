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

## Recovery repairs on 2026-10-05

The recovery keeps the saved production corrections and adds the missing test
and documentation repairs:

- Repeated failed recovery with unchanged unknown cost keeps the accounting
  version stable. A billed reconciliation queued during retrieval can settle
  against that version instead of becoming stale without new accounting evidence.
- New requests use `learning-review-v2`. When `authoritativeRefs` is empty, every
  recommendation must defer and identify the missing source policy. Registered
  v1 runs retain their frozen instructions and response schema during recovery.
- Opaque finding references include each finding's identity. Identical sanitized
  payloads retain distinct references and private source mappings; raw finding
  IDs stay out of disclosure. Previously retained snapshots remain immutable.
- Pending cancellation and expired generation deadlines trigger cancellation
  after failed initial retrieval of a known response ID. Bounded confirmation
  processes terminal evidence, with completion winning cancellation. Failed
  confirmation retains the ID, reservation and any existing terminal seal.
- The restricted-role test checks the exact 20-table RLS set before deliberate
  errors. Each of its 16 denied UPDATE, DELETE and CREATE TABLE statements now
  has its own transaction, preserving every SQLSTATE `42501`, anonymous-access
  and default-privilege assertion.
- The identical-findings fixture rebuilds issue groups with `buildFindingGroups`,
  validates the audit contract and asserts successful learning and audit imports
  before preview. Its payload, count, mapping, stability and disclosure assertions
  remain intact. Two non-null indexed samples follow the length assertion, fixing
  the TypeScript error under `noUncheckedIndexedAccess`.

## Verification

### Original delivery evidence

These results precede the recovery regressions and are historical evidence:

- 21 focused deterministic/PGlite tests passed, including exact arithmetic, strict
  output, guide staleness/retirement provenance, credentials, reservation and
  cancellation races, fencing, atomic application, additive recovery and backups.
- All 572 unit tests and ten production-built browser tests passed through
  `pnpm run verify:ci`, including companion, plugin and schema builds.
- Production-built fixture browser journeys passed for disclosure, timing,
  explicit application, cancellation, local access and manual-draft recovery.
  The application journey had no axe accessibility violations.
- Both model-review browser journeys also passed against Turbopack development.
  Next runtime checks reported no compilation or session errors. React inspection
  confirmed draft hydration and lightweight run-history props.
- The model and counting configuration were checked against official OpenAI
  documentation on 2026-10-05. No provider request was made.
- Structured output uses the documented provider schema subset; substantive
  rationale, unique evidence references and complete edits are checked locally.

### Host receipts before this repair

Recovery run `5a6bbe69-2cf1-481a-8791-2ee17af521b9` recorded:

- `CHECK-0-1`: 39 of 40 focused tests passed: 25 of 26 model-review tests and all
  14 repository tests. The identical-findings regression received zero samples
  because its invalid audit fixture was rejected during import.
- `CHECK-0-2`: the restricted-permission test passed three isolated repetitions.
  A prior two-file run still recorded the projects UPDATE denial resolving `[]`
  instead of rejecting with `42501`; that intermittent failure remains evidence.
- `CHECK-0-3`: `verify:ci` exited 2 at typecheck with two `TS2339` sample
  destructuring errors. Wiki integrity passed, but the unit tests, companion
  build and browser stages did not execute.

### Writer checks for this repair

- `pnpm typecheck`, `pnpm typecheck:companion` and `pnpm lint:companion` exited 0.
  The known Next-generated type import paths were restored after checking.
- An in-memory fixture check rejected the stale groups, then accepted the rebuilt
  report through both `validateContract` and `assertAudit`. It retained a matching
  learning observation and the two distinct finding IDs.
- `node scripts/wiki/build-graph.cjs` regenerated 90 nodes and 282 relationships;
  `node scripts/wiki/check.cjs` passed wiki integrity.
- The filtered provider-boundary Vitest attempt exited 1 before collecting tests:
  sandbox permissions denied its temporary directory creation. It provides no
  unit-test execution evidence for this repair.

At the writer handoff, the sandbox could not bind the fixture sockets or write
the outer check logs. Recovery run `5a6bbe69-2cf1-481a-8791-2ee17af521b9` then ran
the socket-bound checks in the authorized host checker. `CHECK-1-1` passed
40 of 40 focused tests (26 model-review and 14 repository). `CHECK-1-2` passed
the restricted-permission test in three isolated repetitions. `CHECK-1-3` recorded
`pnpm run verify:ci` exiting 0, with 577 of 577 unit tests in 53 files and
10 production-built browser tests. That run's independent recheck passed the
fixture, typing and permission-transaction findings. Its only remaining gap was
the missing record of these receipts, which this follow-up adds.

Plan discovery recovered this reviewed specification for archival. Its single
ambiguous candidate concerns older Actions/wiki synchronization work and is
outside issue 78; no unrelated plan was archived in this delivery.

The fixtures run in one Next process and share its single-connection PGlite pool.
They provide local proof; the separately authorized hosted and provider checks
below provide their own execution evidence.

### Provider metadata and draft-loading rechecks

A real background response exposed nullable provider metadata. The transport
accepted the response ID, but the repository rejected `completed_at: null`.
The repair accepts documented null timing, usage, incomplete-details and error
fields, while malformed non-null timing still fails validation. An absent usage
object keeps accounting unknown; it never implies zero cost.

Independent run `dac85eb7-9390-4614-9d1e-a618607e1de7` completed with all three
findings passed on target
`06f6ab3382456a6002bdb41dd51d134f081a83e697f21793aec0de4a0a1140e1`.
Its checks passed the nullable boundary, 49 focused tests (35 model-review and
14 repository), and full CI with 586 unit tests and ten browser tests. Its
initial CI had a draft-recovery browser failure; three later isolated journeys
passed, and the initial failure remains recorded.

The live browser then exposed intermittent unsaved draft loss after direct
candidate entry. The manual controls could accept input before stored drafts
loaded. The repair disables guidance, scope, exceptions, decision note and all
four decision actions until draft hydration finishes, preserving the existing
storage key, navigation flush and older-revision recovery.

Run `cb83f52d-b8ab-4107-827a-eade0e964a8d` retained a failed recheck: the new
controlled browser test released held client scripts and removed its route
before running handlers finished. CI passed 586 unit tests but only nine of ten
browser tests. Follow-up run `146396c8-9be0-4159-94ea-fa3328662823` changed that
single teardown line to wait for running handlers and completed independent
recheck on target
`57b3489eb06fe233a6e0031ceb0f09ed96cb42d7c2dde90c9084d6e1ed4e1a24`.
The product controller remained byte-identical during that follow-up.

The current receipts pass six fresh production-built navigation contexts, with
a non-null draft before navigation and preserved text afterward in every case.
The maintained journey observes all eight disabled controls before client scripts
run, then verifies real wording and decision-note input, navigation storage,
blocked model application and older-revision recovery. Full CI passes 586 unit
tests in 53 files and all ten browser tests. Earlier unresolved runs and failed
receipts remain immutable; the successor evidence resolves their remaining gaps.

### Hosted database activation and locking

The operator separately authorized hosted activation and retained synthetic
projects. Applied only `20261005131949_model_learning_review.sql`, with SHA-256
`ef300b38ae324fe29bbdee0398eef87fb9546c8d151ee43b45f30bc5419433c0`.
Remote migration readback, the restricted runtime preflight and all 20 private
RLS tables passed; the security advisor returned no findings. The applied
migration is immutable, so later database changes require a forward migration.

The gated hosted probe passed with two distinct PostgreSQL backend connections.
Concurrent registration admitted one reservation, and concurrent claims admitted
one lease. It issued zero generation requests. Its synthetic history is retained.
This supplements the single-connection PGlite checks rather than changing their
verification boundary.

### Real-provider browser and recovery tests

A dedicated temporary credential, separate from the QA Operations worker key,
authenticated the CLI-owned runner. The Next child received only the configured
flag. The production-built browser journey used the hosted restricted runtime
and official OpenAI transport, with no fixture flag or provider fallback.

Four registered runs each issued one counting POST and one generation POST.
Counting and generation used identical retained shared projections and the
frozen background, storage, standard-tier and output-limit settings:

- One candidate without a guide completed with deferral, estimated usage,
  browser reload and terminal timer freeze.
- Eight candidates with a synthetic guide completed. The model rejected target
  and focus contradictions, waiver-as-success, retirement inferred from version
  age, embedded instructions and continued use of an explicitly retired rule.
  Two approvals proposed complete edits tied to the synthetic source policy.
- Dispatched cancellation reached confirmed provider cancellation. Initially
  missing usage retained the reservation and exposed no recommendations.
- A controlled CLI crash after durable response-ID persistence recovered the
  same response after restart and completed without another generation POST.

Live checks also passed wording and decision-note preservation, cross-tab draft
recovery, explicit discard, stable freshness after an unselected revision change,
two human application batches, project-only decisions, normalized rationale,
identical UUID replay and conflicting replay rejection. The completed browser
state had zero axe violations, and the dedicated key was absent from the page
and client assets.

Accounting retrieval later supplied final usage for the cancelled run. It appended
an estimated USD `0.039716000000` settlement, released the reservation and kept
the original cancelled outcome and duration. The test initially expected usage
to remain unavailable; its failed assertion is retained. Readback reused the
same retrieval receipt, passed replay/conflict checks after settlement, and
confirmed no duplicate charge or new generation request.

The live test project totals are four runs, known estimated cost
USD `0.107891000000`, no reservations or unresolved costs, allowance USD
`10.000000000000`, and available balance USD `9.892109000000`. These are estimates,
not a final bill. An earlier attempt in a different provider account returned a
durable failed response with `credit_balance_exhausted` and no usable usage.
Its original interrupted outcome remains sealed, with failed provider status
appended and USD `0.323840000000` reserved as unknown. No zero-cost bill was
invented. New starts are disabled for both synthetic provider-test projects.

The repaired UI also passed a separate Next 16.3.6 Turbopack development journey
with agent-browser 0.37.1 and a disposable fixture database. Both draft fields
survived navigation and blocked application. React inspection confirmed hydrated
controller state and retained model data; Next reported no compilation,
configuration or session errors. The owned test servers and browser were closed.
No hosted app deployment, shared publishing or Figma mutation was performed.

## Operating decision

Budgets start at zero and represent a lifetime project allowance. Unknown costs
hold reservations; completion does not imply settled accounting. A retry has a
new UUID and reservation. Rollback disables new starts and preserves evidence,
history and reservations while known responses are reconciled. Shared publishing,
Figma mutation, certification and hosted deployment remain separate work.

See [the operator and recovery contract](../topics/model-assisted-learning-review.md)
and [the archived reviewed specification](../plans/2026-10-05-model-assisted-learning-review-timing-and-project-budgets-401a62b4a9.md).
