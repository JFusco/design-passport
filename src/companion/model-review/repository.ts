import { randomUUID } from "node:crypto";
import { CompanionError } from "../errors";
import type postgres from "postgres";
import type { TransactionSql } from "postgres";
import type { KnowledgeDecisionV1 } from "../../core/contracts";
import {
  buildKnowledgeDecision,
  parseReferencePack,
  reviseKnowledgeCandidate,
} from "../../core/knowledge-loop";
import { transaction } from "../database";
import type { WorkspacePaths } from "../filesystem";
import { derive, retainCandidate, stateIn } from "../repository";
import type {
  Accounting,
  ApplyInput,
  ApplyResult,
  CandidateRevision,
  FrozenReview,
  Outcome,
  ProjectSummary,
  ProviderResponse,
  Recommendation,
  RunDetail,
  RunHistory,
} from "./contracts";
import {
  assertSafe,
  conflict,
  decimal,
  digest,
  estimate,
  invalid,
  money,
  RESERVATION,
  uuid,
} from "./policy";
import { buildSnapshot, context, currentDecision } from "./snapshot";
export const MODEL_TABLES = [
  "model_settings",
  "model_guides",
  "model_runs",
  "model_attempts",
  "model_events",
  "model_recommendations",
  "model_applications",
  "model_application_decisions",
  "model_accounting",
  "model_reconciliations",
] as const;
export function json(sql: TransactionSql, value: unknown) {
  return sql.json(value as postgres.JSONValue);
}
export interface Lease {
  id: string;
  project: string;
  owner: string;
  generation: number;
  frozen: FrozenReview;
  outcome: Outcome;
  providerId: string | null;
  dispatchAt: string | null;
  cancel: boolean;
}
async function runIn(sql: TransactionSql, id: string) {
  const r = (
    await sql`select * from design_passport.model_runs where id = ${uuid(id)}`
  )[0];
  if (!r) invalid("The review run was not found.");
  return r;
}
export async function event(
  sql: TransactionSql,
  project: string,
  id: string,
  kind: string,
  payload: Record<string, unknown>,
) {
  assertSafe(payload);
  await sql`insert into design_passport.model_events(id,project_scope,run_id,kind,payload) values (${randomUUID()},${project},${id},${kind},${json(sql, payload)})`;
}
async function accountIn(
  sql: TransactionSql,
  run: Awaited<ReturnType<typeof runIn>>,
): Promise<Accounting> {
  const a = (
    await sql`select id,version,status,amount::text from design_passport.model_accounting where run_id = ${run.id} order by version desc limit 1`
  )[0]!;
  const discrepancy =
    a.amount !== null && money(a.amount) > money(String(run.reservation));
  const acknowledged =
    discrepancy &&
    (
      await sql`select id from design_passport.model_reconciliations where run_id = ${run.id} and settlement_id = ${a.id} and kind = 'discrepancy_acknowledgement'`
    ).length > 0;
  return {
    version: a.version,
    status: a.status,
    amount: a.amount,
    discrepancy,
    acknowledged,
    settlementId: a.amount !== null ? a.id : null,
  };
}
async function settle(
  sql: TransactionSql,
  run: Awaited<ReturnType<typeof runIn>>,
  status: Accounting["status"],
  amount: string | null,
  evidence: Record<string, unknown>,
): Promise<void> {
  const previous = await accountIn(sql, run);
  if (previous.amount !== null) return;
  await sql`insert into design_passport.model_accounting(id,project_scope,run_id,version,status,amount,evidence) values (${randomUUID()},${run.project_scope},${run.id},${previous.version + 1},${status},${amount},${json(sql, evidence)})`;
}
async function summaryIn(
  sql: TransactionSql,
  project: string,
): Promise<ProjectSummary> {
  const settings = (
    await sql`select allowance::text,enabled,active_guide from design_passport.model_settings where project_scope = ${project}`
  )[0];
  const runs = await ledger(sql, project);
  let spent = 0n,
    held = 0n,
    unresolved = 0,
    discrepancies = 0;
  for (const run of runs) {
    const a = ledgerAccounting(run);
    if (a.amount !== null) spent += money(a.amount);
    else {
      held += money(String(run.reservation));
      if (a.status === "unknown") unresolved++;
    }
    if (a.discrepancy && !a.acknowledged) discrepancies++;
  }
  const allowance = settings?.allowance ?? "0.000000000000";
  return {
    allowance,
    knownCost: decimal(spent),
    reservations: decimal(held),
    available: decimal(money(allowance) - spent - held),
    runCount: runs.length,
    unresolvedCostCount: unresolved,
    discrepancies,
    enabled: settings?.enabled ?? true,
    activeGuide: settings?.active_guide ?? null,
  };
}
async function ledger(
  sql: TransactionSql,
  project: string,
  limit: number | null = null,
) {
  return sql`select r.id,r.reservation::text,r.outcome,r.registered_at,r.ended_at,clock_timestamp() as now,
    a.id as settlement_id,a.version,a.status,a.amount::text,
    exists(select 1 from design_passport.model_reconciliations receipt where receipt.project_scope=r.project_scope and receipt.run_id=r.id and receipt.settlement_id=a.id and receipt.kind='discrepancy_acknowledgement') as acknowledged
    from design_passport.model_runs r join lateral
      (select id,version,status,amount from design_passport.model_accounting where run_id=r.id order by version desc limit 1) a on true
    where r.project_scope=${project} order by r.registered_at desc,r.id limit ${limit}`;
}
function ledgerAccounting(
  row: Awaited<ReturnType<typeof ledger>>[number],
): Accounting {
  const discrepancy =
    row.amount !== null && money(row.amount) > money(row.reservation);
  return {
    version: row.version,
    status: row.status,
    amount: row.amount,
    discrepancy,
    acknowledged: discrepancy && row.acknowledged,
    settlementId: row.amount === null ? null : row.settlement_id,
  };
}
export async function projectSummary(paths: WorkspacePaths, project: string) {
  return transaction(paths.root, (sql) => summaryIn(sql, project));
}
export async function projectHistory(
  paths: WorkspacePaths,
  project: string,
): Promise<RunHistory[]> {
  return transaction(paths.root, async (sql) => {
    const rows = await ledger(sql, project, 100);
    const result: RunHistory[] = [];
    for (const row of rows)
      result.push({
        id: row.id,
        outcome: row.outcome,
        registeredAt: new Date(row.registered_at).toISOString(),
        durationMs: Math.max(
          0,
          Date.parse(row.ended_at ?? row.now) - Date.parse(row.registered_at),
        ),
        accounting: ledgerAccounting(row),
      });
    return result;
  });
}
export async function settings(
  paths: WorkspacePaths,
  project: string,
  input: { allowance?: string; enabled?: boolean; activeGuide?: string | null },
): Promise<ProjectSummary> {
  return transaction(
    paths.root,
    async (sql) => {
      if (
        !(
          await sql`select scope from design_passport.projects where scope = ${project}`
        ).length
      )
        invalid("Select an existing project.");
      await sql`insert into design_passport.model_settings(project_scope) values (${project}) on conflict do nothing`;
      const totals = await summaryIn(sql, project);
      if (input.allowance !== undefined) {
        const n = money(input.allowance);
        if (n < money(totals.knownCost) + money(totals.reservations))
          invalid(
            "Allowance cannot be lower than settled spending and reservations.",
          );
        await sql`update design_passport.model_settings set allowance = ${decimal(n)} where project_scope = ${project}`;
      }
      if (input.enabled !== undefined)
        await sql`update design_passport.model_settings set enabled = ${input.enabled} where project_scope = ${project}`;
      if (input.activeGuide !== undefined)
        await sql`update design_passport.model_settings set active_guide = ${input.activeGuide === null ? null : uuid(input.activeGuide)} where project_scope = ${project}`;
      return summaryIn(sql, project);
    },
    true,
  );
}
export async function attachGuide(
  paths: WorkspacePaths,
  project: string,
  raw: string,
): Promise<string> {
  let pack;
  try {
    pack = parseReferencePack(raw, "style-guide");
    assertSafe(pack);
  } catch {
    invalid("The guide must be valid, safe style-guide JSON under 90 KB.");
  }
  if (pack.source.projectScope !== project)
    invalid("The guide belongs to a different project.");
  return transaction(
    paths.root,
    async (sql) => {
      const id = randomUUID();
      await sql`insert into design_passport.model_guides(id,project_scope,payload,digest) values (${id},${project},${json(sql, pack)},${pack.digest}) on conflict(project_scope,digest) do nothing`;
      const retained = (
        await sql`select id from design_passport.model_guides where project_scope = ${project} and digest = ${pack.digest}`
      )[0]!.id;
      await sql`insert into design_passport.model_settings(project_scope,active_guide) values (${project},${retained}) on conflict(project_scope) do update set active_guide = excluded.active_guide`;
      return retained as string;
    },
    true,
  );
}
export async function guideHistory(paths: WorkspacePaths, project: string) {
  return transaction(
    paths.root,
    async (sql) =>
      await sql`select id,digest,received_at from design_passport.model_guides where project_scope = ${project} order by received_at,id`,
  );
}
export async function preview(
  paths: WorkspacePaths,
  project: string,
  selection: CandidateRevision[],
) {
  return transaction(paths.root, async (sql) => {
    const { mappings, ...view } = await buildSnapshot(sql, project, selection);
    void mappings;
    return view;
  });
}
export interface StartInput {
  requestId: string;
  project: string;
  selection: CandidateRevision[];
  previewDigest: string;
  retryOf?: string;
}
export async function start(
  paths: WorkspacePaths,
  input: StartInput,
): Promise<RunDetail> {
  const id = uuid(input.requestId);
  const material = {
    project: input.project,
    selection: [...input.selection].sort((a, b) =>
      a.candidateId.localeCompare(b.candidateId),
    ),
    previewDigest: input.previewDigest,
    retryOf: input.retryOf ?? null,
  };
  await transaction(
    paths.root,
    async (sql) => {
      const replay = (
        await sql`select request_digest from design_passport.model_runs where id = ${id}`
      )[0];
      if (replay) {
        if (replay.request_digest !== digest(material))
          conflict("That request UUID belongs to different material.");
        return;
      }
      const frozen = await buildSnapshot(sql, input.project, input.selection);
      if (frozen.digest !== input.previewDigest)
        conflict("The disclosure preview changed. Preview it again.");
      const totals = await summaryIn(sql, input.project);
      // Signed available balance must not pass through the nonnegative money parser.
      const committed = money(totals.knownCost) + money(totals.reservations);
      if (
        !totals.enabled ||
        totals.discrepancies ||
        money(totals.allowance) < committed + money(RESERVATION)
      )
        invalid(
          "Increase the project allowance or resolve its outstanding discrepancy before Start.",
        );
      if (
        (
          await sql`select id from design_passport.model_runs where project_scope = ${input.project} and outcome in ('queued','running')`
        ).length
      )
        conflict("This project already has an active run.");
      if (input.retryOf) {
        const previous = await runIn(sql, input.retryOf);
        if (
          previous.project_scope !== input.project ||
          ["queued", "running"].includes(previous.outcome)
        )
          invalid("Retry requires a terminal run in this project.");
      }
      await sql`insert into design_passport.model_runs(id,project_scope,request_material,request_digest,frozen,reservation,retry_of) values (${id},${input.project},${json(sql, material)},${digest(material)},${json(sql, frozen)},${RESERVATION},${input.retryOf ?? null})`;
      await sql`insert into design_passport.model_accounting(id,project_scope,run_id,version,status,amount,evidence) values (${randomUUID()},${input.project},${id},1,'reserved',null,'{}')`;
      await event(sql, input.project, id, "registered", {
        snapshotSha256: frozen.snapshotSha256,
        promptVersion: frozen.promptVersion,
        schemaVersion: frozen.schemaVersion,
      });
    },
    true,
  );
  return runDetail(paths, id);
}
export async function runDetail(
  paths: WorkspacePaths,
  id: string,
): Promise<RunDetail> {
  return transaction(paths.root, async (sql) => {
    const run = await runIn(sql, id),
      frozen = run.frozen as FrozenReview;
    const events =
      await sql`select id,kind,payload,recorded_at from design_passport.model_events where run_id = ${id} order by recorded_at,id`;
    const observations = events
      .filter((e) => e.kind === "provider")
      .map((e) => e.payload as ProviderResponse);
    const response = observations.at(-1);
    const applications =
      await sql`select context_digest from design_passport.model_applications where run_id = ${id} order by ordinal desc limit 1`;
    const applied = new Set(
      (
        await sql`select recommendation_id from design_passport.model_application_decisions where run_id = ${id}`
      ).map((r) => r.recommendation_id),
    );
    const state = await stateIn(sql);
    const recommendations = (
      await sql`select id,payload from design_passport.model_recommendations where run_id = ${id} order by candidate_id`
    ).map((row) => {
      const r = row.payload as Recommendation,
        c = state.candidates.find((c) => c.candidateId === r.candidateId),
        d = c ? currentDecision(c, state.decisions) : undefined;
      return {
        ...r,
        id: row.id as string,
        applied: applied.has(row.id),
        alreadyApproved:
          r.disposition === "approve" &&
          d?.action === "approve" &&
          d.scope === "project" &&
          d.candidateDigest === c?.digest,
      };
    });
    const now = (await sql`select clock_timestamp() as now`)[0]!.now as string;
    const registeredAt = new Date(run.registered_at).toISOString(),
      endedAt = run.ended_at ? new Date(run.ended_at).toISOString() : null;
    return {
      id,
      project: run.project_scope as string,
      outcome: run.outcome as Outcome,
      registeredAt,
      endedAt,
      serverNow: new Date(now).toISOString(),
      durationMs: Math.max(
        0,
        Date.parse(endedAt ?? now) - Date.parse(registeredAt),
      ),
      providerId: response?.id ?? null,
      providerStatus: response?.status ?? null,
      providerCompletedAt: response?.completed_at
        ? new Date(response.completed_at * 1000).toISOString()
        : null,
      error: run.terminal?.error ?? null,
      frozen,
      recommendations,
      contextDigest: applications[0]?.context_digest ?? frozen.contextDigest,
      accounting: await accountIn(sql, run),
      events: events as unknown as RunDetail["events"],
      retryOf: run.retry_of as string | null,
    };
  });
}
async function owned(sql: TransactionSql, lease: Lease) {
  const run = await runIn(sql, lease.id);
  if (
    run.lease_owner !== lease.owner ||
    Number(run.lease_generation) !== lease.generation ||
    Date.parse(run.lease_expires_at ?? "") <= Date.now()
  )
    conflict("The runner lease expired.");
  return run;
}
export async function claim(
  paths: WorkspacePaths,
  owner: string,
  project?: string,
): Promise<Lease | null> {
  return transaction(
    paths.root,
    async (sql) => {
      // Recovery of sealed runs is additive, and only needed for cleanup/reconciliation.
      const rows =
        await sql`select r.* from design_passport.model_runs r where (${project ?? null}::text is null or r.project_scope=${project ?? null}) and (lease_expires_at is null or lease_expires_at <= clock_timestamp()) and
      (outcome in ('queued','running') or (not cleanup_done and exists(select 1 from design_passport.model_events e where e.run_id=r.id and e.kind='provider') and (exists(select 1 from design_passport.model_accounting a where a.run_id=r.id and a.amount is not null) or coalesce((select e.payload->>'status' from design_passport.model_events e where e.run_id=r.id and e.kind='provider' order by recorded_at desc,id desc limit 1),'queued') in ('queued','in_progress'))) or
       exists(select 1 from design_passport.model_events e where e.run_id=r.id and e.kind='reconcile-request' and not exists(select 1 from design_passport.model_reconciliations a where a.id::text=e.payload->>'requestId'))) order by (outcome in ('queued','running')) desc,registered_at,id limit 1`;
      const run = rows[0];
      if (!run) return null;
      const generation = Number(run.lease_generation) + 1;
      await sql`update design_passport.model_runs set lease_owner=${uuid(owner)},lease_generation=${generation},lease_expires_at=clock_timestamp()+interval '60 seconds' where id=${run.id}`;
      const attempt = (
        await sql`select dispatched_at from design_passport.model_attempts where run_id=${run.id}`
      )[0];
      const provider = (
        await sql`select payload from design_passport.model_events where run_id=${run.id} and kind='provider' order by recorded_at desc,id desc limit 1`
      )[0]?.payload as ProviderResponse | undefined;
      return {
        id: run.id as string,
        project: run.project_scope as string,
        owner,
        generation,
        frozen: run.frozen as FrozenReview,
        outcome: run.outcome as Outcome,
        providerId: provider?.id ?? null,
        dispatchAt: attempt?.dispatched_at ?? null,
        cancel: run.cancel_requested as boolean,
      };
    },
    true,
  );
}
export async function renew(
  paths: WorkspacePaths,
  lease: Lease,
): Promise<boolean> {
  return transaction(
    paths.root,
    async (sql) => {
      await owned(sql, lease);
      await sql`update design_passport.model_runs set lease_expires_at=clock_timestamp()+interval '60 seconds' where id=${lease.id}`;
      return true;
    },
    true,
  );
}
export async function releaseLease(paths: WorkspacePaths, lease: Lease) {
  return transaction(
    paths.root,
    async (sql) => {
      await owned(sql, lease);
      await sql`update design_passport.model_runs set lease_expires_at=clock_timestamp()+interval '15 seconds' where id=${lease.id}`;
    },
    true,
  );
}
async function seal(
  sql: TransactionSql,
  run: Awaited<ReturnType<typeof runIn>>,
  outcome: Outcome,
  error: string | null,
) {
  if (!["queued", "running"].includes(run.outcome)) return;
  await sql`update design_passport.model_runs set outcome=${outcome},ended_at=clock_timestamp(),terminal=${json(sql, { error })} where id=${run.id}`;
  await event(sql, run.project_scope, run.id, "terminal", { outcome, error });
}
export async function dispatch(
  paths: WorkspacePaths,
  lease: Lease,
  count: number,
): Promise<boolean> {
  return transaction(
    paths.root,
    async (sql) => {
      const run = await owned(sql, lease);
      if (run.outcome !== "queued" || run.cancel_requested) return false;
      if (
        !Number.isSafeInteger(count) ||
        count < 0 ||
        count > 64_000 ||
        Date.now() - Date.parse(run.registered_at) > 15 * 60_000
      )
        invalid("Input count or admission deadline exceeded.");
      if (
        (
          await sql`select id from design_passport.model_attempts where run_id=${lease.id}`
        ).length ||
        (await accountIn(sql, run)).amount !== null
      )
        return false;
      await sql`insert into design_passport.model_attempts(id,project_scope,run_id,dispatched_at,lease_generation,input_tokens) values (${randomUUID()},${lease.project},${lease.id},clock_timestamp(),${lease.generation},${count})`;
      await sql`update design_passport.model_runs set outcome='running' where id=${lease.id}`;
      await event(sql, lease.project, lease.id, "dispatch-intent", {
        inputTokens: count,
        generation: lease.generation,
      });
      return true;
    },
    true,
  );
}
export async function cancel(
  paths: WorkspacePaths,
  id: string,
): Promise<RunDetail> {
  await transaction(
    paths.root,
    async (sql) => {
      const run = await runIn(sql, id);
      if (!["queued", "running"].includes(run.outcome)) return;
      await sql`update design_passport.model_runs set cancel_requested=true where id=${id}`;
      await event(sql, run.project_scope, id, "cancel-requested", {});
      if (
        !(
          await sql`select id from design_passport.model_attempts where run_id=${id}`
        ).length
      ) {
        await settle(sql, run, "zero", "0.000000000000", {
          stage: "before-dispatch",
        });
        await seal(sql, run, "cancelled", null);
      }
    },
    true,
  );
  return runDetail(paths, id);
}
export function providerEvidence(
  response: ProviderResponse,
): Record<string, unknown> {
  if (
    response.id !== undefined &&
    !/^resp_[A-Za-z0-9_-]{1,200}$/u.test(response.id)
  )
    invalid("Provider identity is invalid.");
  if (
    response.status !== undefined &&
    ![
      "queued",
      "in_progress",
      "completed",
      "failed",
      "cancelled",
      "incomplete",
    ].includes(response.status)
  )
    invalid("Provider status is invalid.");
  if (
    response.completed_at !== undefined &&
    (!Number.isSafeInteger(response.completed_at) ||
      response.completed_at < 0 ||
      response.completed_at > 8_640_000_000_000)
  )
    invalid("Provider timing is invalid.");
  const fields = [
    "id",
    "status",
    "model",
    "service_tier",
    "completed_at",
    "usage",
    "incomplete_details",
    "requestId",
  ] as const;
  const result: Record<string, unknown> = {};
  for (const field of fields)
    if (response[field] !== undefined) result[field] = response[field];
  assertSafe(result);
  return result;
}
export async function observe(
  paths: WorkspacePaths,
  lease: Lease,
  response: ProviderResponse,
) {
  return transaction(
    paths.root,
    async (sql) => {
      await owned(sql, lease);
      await event(
        sql,
        lease.project,
        lease.id,
        "provider",
        providerEvidence(response),
      );
    },
    true,
  );
}
export async function finish(
  paths: WorkspacePaths,
  lease: Lease,
  input: {
    outcome: Outcome;
    error: string | null;
    response?: ProviderResponse;
    recommendations?: Recommendation[];
    zero?: boolean;
    transport?: Record<string, unknown>;
  },
) {
  return transaction(
    paths.root,
    async (sql) => {
      const run = await owned(sql, lease);
      const amount = input.zero
        ? "0.000000000000"
        : input.response
          ? estimate(input.response, lease.frozen.pricePolicy)
          : null;
      if (input.response)
        await event(
          sql,
          lease.project,
          lease.id,
          "provider",
          providerEvidence(input.response),
        );
      if (input.transport)
        await event(sql, lease.project, lease.id, "transport", input.transport);
      if (input.recommendations && ["queued", "running"].includes(run.outcome))
        for (const r of input.recommendations) {
          assertSafe(r);
          await sql`insert into design_passport.model_recommendations(id,project_scope,run_id,candidate_id,candidate_digest,payload) values (${randomUUID()},${lease.project},${lease.id},${r.candidateId},${r.candidateDigest},${json(sql, r)})`;
        }
      await settle(
        sql,
        run,
        amount === null ? "unknown" : input.zero ? "zero" : "estimated",
        amount,
        input.response
          ? providerEvidence(input.response)
          : (input.transport ?? {}),
      );
      await seal(sql, run, input.outcome, input.error);
    },
    true,
  );
}
export async function cleanupDone(paths: WorkspacePaths, lease: Lease) {
  return transaction(
    paths.root,
    async (sql) => {
      await owned(sql, lease);
      await sql`update design_passport.model_runs set cleanup_done=true where id=${lease.id}`;
      await event(sql, lease.project, lease.id, "provider-deleted", {});
    },
    true,
  );
}
export async function apply(
  paths: WorkspacePaths,
  input: ApplyInput,
): Promise<ApplyResult> {
  const id = uuid(input.requestId);
  const selections = input.selections
    .map((s) => ({ ...s, rationale: s.rationale.normalize("NFKC").trim() }))
    .sort((a, b) => a.recommendationId.localeCompare(b.recommendationId));
  const material = {
    runId: uuid(input.runId),
    expectedContext: input.expectedContext,
    selections,
  };
  assertSafe(material);
  return transaction(
    paths.root,
    async (sql) => {
      const receipt = (
        await sql`select request_material,result from design_passport.model_applications where id=${id}`
      )[0];
      if (receipt) {
        if (digest(receipt.request_material) !== digest(material))
          conflict("That application UUID belongs to different material.");
        return receipt.result as ApplyResult;
      }
      const run = await runIn(sql, input.runId),
        frozen = run.frozen as FrozenReview;
      if (
        run.outcome !== "completed" ||
        !selections.length ||
        selections.length > 8 ||
        new Set(selections.map((s) => s.recommendationId)).size !==
          selections.length
      )
        invalid("Select unapplied recommendations from a completed run.");
      const prior = (
        await sql`select context_digest,ordinal from design_passport.model_applications where run_id=${run.id} order by ordinal desc limit 1`
      )[0];
      const expected = prior?.context_digest ?? frozen.contextDigest;
      if (
        input.expectedContext !== expected ||
        (await context(sql, run.project_scope, frozen.selection)) !== expected
      )
        conflict();
      const state = await stateIn(sql);
      const decisions: KnowledgeDecisionV1[] = [],
        mappings: ApplyResult["mappings"] = [];
      for (const s of selections) {
        const row = (
          await sql`select payload from design_passport.model_recommendations where project_scope=${run.project_scope} and run_id=${run.id} and id=${uuid(s.recommendationId)}`
        )[0];
        if (
          !row ||
          (
            await sql`select recommendation_id from design_passport.model_application_decisions where recommendation_id=${s.recommendationId}`
          ).length
        )
          conflict(
            "A selected recommendation is unavailable or already applied.",
          );
        const r = row.payload as Recommendation;
        const c = state.candidates.find(
          (c) =>
            c.candidateId === r.candidateId &&
            c.projectScope === run.project_scope,
        );
        if (!c) conflict();
        const d = currentDecision(c, state.decisions);
        if (
          d?.action === "approve" &&
          d.scope === "shared" &&
          d.candidateDigest === c.digest
        )
          conflict("A selected candidate now has a shared approval.");
        let successor = c;
        try {
          if (s.edit)
            successor = reviseKnowledgeCandidate(c, {
              ...s.edit,
              proposedScope: c.proposedScope,
            });
        } catch {
          invalid();
        }
        if (
          r.disposition === "approve" &&
          successor.digest === c.digest &&
          d?.action === "approve" &&
          d.scope === "project" &&
          d.candidateDigest === c.digest
        )
          throw new CompanionError(
            "already_approved",
            "This candidate is already approved. Make an effective edit or omit it.",
            409,
          );
        let decision;
        const decisionUUID = randomUUID();
        try {
          decision = buildKnowledgeDecision({
            decisionId: `decision:${decisionUUID}`,
            candidateId: c.candidateId,
            candidateDigest: successor.digest,
            action: r.disposition,
            scope: "project",
            rationale: s.rationale,
          });
        } catch {
          invalid("Every selected recommendation requires a valid rationale.");
        }
        if (successor.digest !== c.digest)
          await retainCandidate(sql, successor, c);
        await sql`insert into design_passport.decisions(id,request_id,project_scope,candidate_id,candidate_digest,action,scope,rationale,source_at,payload) values (${decision.decisionId},${decisionUUID},${run.project_scope},${c.candidateId},${successor.digest},${decision.action},'project',${decision.rationale},${decision.decidedAt},${json(sql, decision)})`;
        decisions.push(decision);
        mappings.push({
          recommendationId: s.recommendationId,
          decisionId: decision.decisionId,
        });
      }
      await derive(sql, false);
      const successorContext = await context(
        sql,
        run.project_scope,
        frozen.selection,
      );
      const result = { decisions, mappings, contextDigest: successorContext };
      await sql`insert into design_passport.model_applications(id,project_scope,run_id,request_material,result,context_digest,ordinal) values (${id},${run.project_scope},${run.id},${json(sql, material)},${json(sql, result)},${successorContext},${Number(prior?.ordinal ?? 0) + 1})`;
      for (const mapping of mappings)
        await sql`insert into design_passport.model_application_decisions(project_scope,run_id,application_id,recommendation_id,decision_id) values (${run.project_scope},${run.id},${id},${mapping.recommendationId},${mapping.decisionId})`;
      return result;
    },
    true,
  );
}
export interface ReconcileInput {
  requestId: string;
  runId: string;
  expectedVersion: number;
  action: "retrieve" | "billed" | "discrepancy_acknowledgement";
  amount?: string;
  evidenceNote?: string;
}
export async function reconcile(paths: WorkspacePaths, input: ReconcileInput) {
  input = {
    ...input,
    requestId: uuid(input.requestId),
    runId: uuid(input.runId),
  };
  const id = input.requestId;
  assertSafe(input);
  if (
    input.action === "billed" &&
    (input.amount === undefined ||
      !input.evidenceNote?.normalize("NFKC").trim())
  )
    invalid("A billed amount requires an evidence note or provider reference.");
  if (input.amount !== undefined) money(input.amount);
  return transaction(
    paths.root,
    async (sql) => {
      const receipt = (
        await sql`select request_material,result from design_passport.model_reconciliations where id=${id}`
      )[0];
      if (receipt) {
        if (digest(receipt.request_material) !== digest(input)) conflict();
        return receipt.result;
      }
      const existing = (
        await sql`select payload from design_passport.model_events where run_id=${input.runId} and kind='reconcile-request' and payload->>'requestId'=${id}`
      )[0];
      if (existing) {
        if (digest(existing.payload) !== digest(input)) conflict();
        return { queued: true };
      }
      const run = await runIn(sql, input.runId),
        a = await accountIn(sql, run);
      if (a.version !== input.expectedVersion)
        conflict("Accounting changed. Reload before reconciling.");
      if (input.action === "discrepancy_acknowledgement") {
        if (!a.discrepancy || !a.settlementId)
          invalid("There is no discrepancy at that accounting version.");
        const result = { acknowledged: a.settlementId };
        await sql`insert into design_passport.model_reconciliations(id,project_scope,run_id,settlement_id,request_material,result,kind) values (${id},${run.project_scope},${run.id},${a.settlementId},${json(sql, input)},${json(sql, result)},'discrepancy_acknowledgement')`;
        return result;
      }
      if (["queued", "running"].includes(run.outcome) || a.amount !== null)
        invalid("Reconciliation requires terminal, unresolved accounting.");
      await event(
        sql,
        run.project_scope,
        run.id,
        "reconcile-request",
        input as unknown as Record<string, unknown>,
      );
      return { queued: true };
    },
    true,
  );
}
export async function pendingReconciliation(
  paths: WorkspacePaths,
  lease: Lease,
): Promise<ReconcileInput | null> {
  return transaction(paths.root, async (sql) => {
    await owned(sql, lease);
    const row = (
      await sql`select payload from design_passport.model_events e where run_id=${lease.id} and kind='reconcile-request' and not exists(select 1 from design_passport.model_reconciliations r where r.id::text=e.payload->>'requestId') order by recorded_at,id limit 1`
    )[0];
    return (row?.payload as ReconcileInput) ?? null;
  });
}
export async function completeReconciliation(
  paths: WorkspacePaths,
  lease: Lease,
  input: ReconcileInput,
  response: ProviderResponse | null,
) {
  return transaction(
    paths.root,
    async (sql) => {
      const run = await owned(sql, lease),
        a = await accountIn(sql, run);
      if (response)
        await event(
          sql,
          lease.project,
          lease.id,
          "provider",
          providerEvidence(response),
        );
      const nonterminal =
        response &&
        !["completed", "failed", "incomplete", "cancelled"].includes(
          response.status ?? "",
        );
      let result: Record<string, unknown> = { accountingUnresolved: true };
      if (a.version !== input.expectedVersion) result = { stale: true };
      else if (nonterminal) result = { nonterminal: true };
      else {
        const estimated = response
          ? estimate(response, lease.frozen.pricePolicy)
          : null;
        if (estimated !== null) {
          await settle(
            sql,
            run,
            "estimated",
            estimated,
            providerEvidence(response!),
          );
          result = { estimated };
        } else if (input.action === "billed") {
          const amount = decimal(money(input.amount!));
          await settle(sql, run, "billed", amount, {
            evidenceNote: input.evidenceNote!,
          });
          result = { billed: amount };
        }
      }
      await sql`insert into design_passport.model_reconciliations(id,project_scope,run_id,request_material,result,kind) values (${input.requestId},${lease.project},${lease.id},${json(sql, input)},${json(sql, result)},${input.action})`;
      return result;
    },
    true,
  );
}
