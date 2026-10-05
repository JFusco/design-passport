---
title: Model-assisted learning review
topics: [project-scoped-knowledge-loop, supabase-companion]
---

# Model-assisted learning review

## Operator flow

Open **Model review by project** from the companion dashboard or review queue.
Select one to eight candidates and inspect **Preview disclosure**. The preview
is local and sends nothing. Untouched, stale, and deferred candidates are selected
initially; current project approvals and rejections require explicit inclusion.
Larger selections require narrowing. Current shared approvals are context only.

Each project starts with a lifetime USD allowance of zero. Set an allowance before
**Start authorized review**. Start authorizes input counting and inference with
the displayed sanitized content. A matching optional style-guide JSON pack may
be attached, up to 90 KB. Versions remain immutable when the active guide changes.
Original Figma-derived policy and approved guidance retain distinct provenance;
missing authoritative policy requires deferral.

The model proposes dispositions, reasons, priorities, wording and exceptions.
Review the differences and local evidence, edit the human rationale, and select
recommendations explicitly. **Apply selected recommendations** creates project
decisions in one transaction. It preserves publication scope on edited candidates
and never publishes shared guidance. An unchanged current approval requires an
effective edit. Manual drafts must be saved or explicitly discarded first; older
drafts remain recoverable after another tab changes the saved revision.

## Runner configuration and disclosure

The CLI parent owns the runner; Next routes only enqueue and read production runs.
The runner reads inherited `OPENAI_API_KEY`. An environment file is optional.
Keep the key out of shared and Next `.env` files. The optional ignored
`.design-passport-local/model-review.env` must have mode `600` in a mode `700`
directory. Restart the CLI to reload credentials. Its Next child receives only a
non-secret configured flag. Fixture servers never load real model credentials.

The retained request uses `gpt-6.1-sol`, high reasoning, standard service
(`service_tier: default`), background storage, no tools or conversation, disabled
truncation and 16,384 output tokens. Counting and generation share the exact
retained projection, including instructions and the strict output schema. Input
is limited to 64,000 tokens and the full request to 1 MB. Oversized selections
fail visibly. Invalid, refused or incomplete output exposes no partial
recommendations and triggers no paid repair.

Snapshots retain candidate revisions, decision history, project/shared guidance,
observations, positively linked audits, versions and guide provenance. Opaque
references map back to local evidence. Finding aggregates preserve exact counts,
numeric ranges, boolean counts and at most three samples per audit/rule/status/
severity group. Failed, waived and successful findings remain distinct. Repeated
exports retain one semantic recurrence identity. Versions, positive titles,
waivers and suggested fixes do not establish retirement or success.

An explicit allowlist excludes raw reports, node identifiers/paths, URLs, source
references and waiver metadata. Recognizable credentials are rejected before
disclosure, provider requests or recommendation retention, with generic errors.
Original evidence stays separate from the sanitized snapshot and its SHA-256.

## Accounting and recovery

Each run reserves USD `0.323840000000` before provider work. Available balance is
allowance minus settled costs minus held reservations. Rates are frozen per run:
input USD 2, cached input USD 0.10, cache writes USD 2.50 and output USD 10 per
million tokens. Reasoning tokens are already included in output. These rates and
the sole accepted actual model ID were checked on 2026-10-05 against the
[official model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol).
The shared counting fields were checked against the
[official counting reference](https://developers.openai.com/api/reference/python/resources/responses/subresources/input_tokens/methods/count).
New documented model identifiers or rates require a new policy version; old runs
are never repriced. Money uses fixed-scale arithmetic and decimal JSON strings.

Known totals include usage-derived estimates and explicit billed reconciliations.
Incomplete totals are not a final bill. Missing or inconsistent usage, unpriced
categories, unknown actual models or a tier mismatch keep cost unknown and the
reservation held. Counting/admission failures and recognized pre-inference
generation rejections release the reservation with known zero generation cost.
Ambiguous dispatch or termination retains it.

Leases last 60 seconds, renew every 10 seconds and use increasing fencing
generations. Dispatch and queued cancellation use the same database lock. There
is at most one generation POST per run. Known response IDs recover by retrieval;
uncertain dispatch without an ID remains interrupted. Polling starts at two
seconds, backs off to 15 seconds on read failures and uses 30-second HTTP bounds.
A 15-minute generation deadline initiates confirmed cancellation. Completion
winning cancellation remains completed. Disconnecting the browser does not
cancel; graceful shutdown preserves recovery evidence.

Use **Retrieve accounting** first for unresolved costs. If retrieval is unavailable
or terminal accounting is unusable, an operator may record the final billed amount
with an evidence note/provider reference. A nonterminal response stays reserved.
Discrepancies settle their full amount once, even into a negative balance, and
block Start until an explicit acknowledgement of that settlement version. The
acknowledgement has no monetary effect and does not bypass ordinary admission.
Retries create linked new runs and separately reserve funds.

Terminal application outcome, observed duration, provider status/completion time
and accounting remain separate. Recovery and receipts append evidence; they do
not rewrite terminal history. Elapsed time starts at registration, uses a
monotonic browser anchor, reconciles after reconnect and freezes at termination.
Status changes are announced to screen readers; each second is not.

Stored provider responses are deleted only after terminal validation and complete
accounting are durable. Cleanup retries independently. Deletion does not remove
separate abuse-monitoring retention. Complete local backups include every feature
table, the exact request material, policy, evidence and application receipts.

## Verification and rollout

[Issue 78](https://github.com/JFusco/design-passport/issues/78) implements this
local feature. Deterministic/PGlite tests cover admission, evidence, budgets,
fencing, cancellation races, immutable records, replay, atomic application,
reconciliation and backups. Production-built browser fixtures cover disclosure,
timing, application, access and draft recovery. Fixtures are not provider proof
or cross-session hosted locking proof.

Hosted migration activation and a bounded paid synthetic smoke are separately
authorized rollout actions. The optional hosted locking probe requires stopped
companion runners, the restricted session-pooler configuration and explicit
authorization:

```sh
pnpm exec esbuild scripts/test-model-review-hosted-locks.ts \
  --bundle --platform=node --format=esm --target=node24 \
  --outfile=dist/model-review-hosted-locks.mjs
DESIGN_PASSPORT_HOSTED_MODEL_LOCK_PROBE=authorized \
  node dist/model-review-hosted-locks.mjs
```

The probe requires two distinct hosted connections, creates retained synthetic
project history, exercises concurrent reservation and claim admission, and
issues no provider request. It refuses fixture mode. It has not been executed
as part of this delivery.

Rollback disables **Allow new starts** per project while retaining history and
reservations. Leave the runner available to reconcile known responses; never
delete unresolved evidence or infer a zero charge. Shared publishing, Figma
mutation, certification, hosted app deployment and automatic review on import
remain outside this feature.

## Source

- [Repository and runner](../../src/companion/model-review/repository.ts)
- [Protected operations](../../apps/companion/app/api/model-reviews/route.ts)
- [Forward migration](../../supabase/migrations/20261005131949_model_learning_review.sql)
- [Deterministic and repository tests](../../tests/companion-model-review.test.ts)
- [Browser journeys](../../tests/e2e/model-review.spec.ts)
