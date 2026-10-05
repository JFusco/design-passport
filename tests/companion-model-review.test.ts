import { randomUUID } from "node:crypto";
import { mkdtemp, rm, readFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeDatabases,
  database,
  transaction,
  runtimeChildEnvironment,
} from "../src/companion/database";
import {
  databaseSnapshot,
  importAudits,
  importLearning,
  readKnowledgeState,
  recordDecision,
  reviseCandidate,
  workspacePaths,
} from "../src/companion/repository";
import {
  apply,
  attachGuide,
  cancel,
  claim,
  completeReconciliation,
  dispatch,
  finish,
  MODEL_TABLES,
  observe,
  preview,
  projectSummary,
  reconcile,
  runDetail,
  settings,
  start,
} from "../src/companion/model-review/repository";
import {
  assertSafe,
  decimal,
  digest,
  estimate,
  generationBody,
  money,
  POLICY,
  projection,
  recommendations,
  RESPONSE_SCHEMA,
  RESERVATION,
} from "../src/companion/model-review/policy";
import { aggregate } from "../src/companion/model-review/snapshot";
import { ModelReviewRunner } from "../src/companion/model-review/runner";
import {
  openAITransport,
  TransportError,
  type Transport,
} from "../src/companion/model-review/transport";
import { assertFixtureEnvironment } from "../src/companion/model-review/fixture";
import type {
  ApplyInput,
  ProviderResponse,
  Recommendation,
  Snapshot,
} from "../src/companion/model-review/contracts";
import { createTestDatabase } from "./helpers/companion-database.mjs";
import {
  buildLearningEnvelope,
  buildReferencePack,
} from "../src/core/knowledge-loop";
import { hashValue } from "../src/core/stable";
import {
  exportKnowledge,
  verifyKnowledgeExport,
} from "../src/companion/exports";
import { auditFixture, learningFixture } from "./helpers/companion-fixtures";
const usage = {
  input_tokens: 4000,
  input_tokens_details: { cached_tokens: 1000, cache_write_tokens: 500 },
  output_tokens: 600,
  output_tokens_details: { reasoning_tokens: 200 },
  total_tokens: 4600,
};
function response(extra: Partial<ProviderResponse> = {}): ProviderResponse {
  return {
    id: "resp_test",
    status: "completed",
    model: "gpt-6.1-sol",
    service_tier: "default",
    usage,
    ...extra,
  };
}
describe("model review data and provider boundaries", () => {
  it("calculates fixed-scale costs, cache writes and reasoning once with frozen exact model/tier matching", () => {
    expect(estimate(response(), POLICY)).toBe("0.012350000000");
    expect(decimal(money("0.000000000001") + money("0.323840"))).toBe(
      "0.323840000001",
    );
    expect(
      estimate(response({ model: "gpt-6.1-sol-unlisted" }), POLICY),
    ).toBeNull();
    expect(estimate(response({ service_tier: "priority" }), POLICY)).toBeNull();
    const synthetic = {
      ...POLICY,
      acceptedModelIds: ["synthetic-snapshot"],
      output: "20",
    };
    expect(estimate(response({ model: "synthetic-snapshot" }), synthetic)).toBe(
      "0.018350000000",
    );
    expect(estimate(response({ status: "in_progress" }), POLICY)).toBeNull();
    expect(
      estimate(response({ usage: { ...usage, total_tokens: 3 } }), POLICY),
    ).toBeNull();
    expect(
      estimate(response({ usage: { ...usage, tool_tokens: 1 } }), POLICY),
    ).toBeNull();
    expect(
      estimate(
        response({ usage: { ...usage, input_tokens_details: {} } }),
        POLICY,
      ),
    ).toBeNull();
  });
  it("rejects recognizable credentials without echoing them and refuses fixture hosting without every gate", () => {
    for (const text of [
      "sk-syntheticCredential123456",
      "Bearer syntheticToken123456",
      "-----BEGIN PRIVATE KEY-----",
      "api_key=synthetic123456",
    ]) {
      try {
        assertSafe({ reason: text });
        throw new Error("Expected rejection");
      } catch (e) {
        expect((e as Error).message).not.toContain(text);
      }
    }
    expect(() =>
      assertSafe({ reason: "https://private.example/path" }),
    ).toThrow();
    expect(() =>
      assertFixtureEnvironment({
        DESIGN_PASSPORT_TEST_MODEL_REVIEW: "fixture",
      }),
    ).toThrow();
    expect(() =>
      assertFixtureEnvironment({
        DESIGN_PASSPORT_TEST_MODEL_REVIEW: "fixture",
        DESIGN_PASSPORT_DATABASE_TEST_MODE: "pglite",
        DESIGN_PASSPORT_DATABASE_URL:
          "postgres://design_passport_test@127.0.0.1:12/pglite",
      }),
    ).not.toThrow();
  });
  it("sends byte-identical counting context and rejects redirects and ambiguous generation failures", async () => {
    const snapshot: Snapshot = {
      version: 1,
      candidates: [],
      evidence: [],
      authoritativeRefs: [],
      currentness: "unknown",
    };
    const body = projection(snapshot);
    const requests: RequestInit[] = [];
    const fetcher = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        requests.push(init!);
        return Response.json(
          requests.length === 1
            ? { input_tokens: 4000 }
            : {
                error: { type: "invalid_request_error", code: "invalid_model" },
              },
          { status: requests.length === 1 ? 200 : 400 },
        );
      },
    );
    const transport = openAITransport("synthetic-key", fetcher);
    expect(await transport.count(body)).toBe(4000);
    await expect(transport.generate(body)).rejects.toMatchObject({
      knownRejection: true,
    });
    const counted = JSON.parse(requests[0]!.body as string),
      generated = JSON.parse(requests[1]!.body as string);
    expect(counted).toEqual(body);
    for (const key of [
      "background",
      "store",
      "service_tier",
      "max_output_tokens",
    ])
      delete generated[key];
    expect(digest(counted)).toBe(digest(generated));
    expect(requests.every((r) => r.redirect === "error" && !!r.signal)).toBe(
      true,
    );
    for (const status of [408, 409, 500]) {
      const transport = openAITransport("synthetic-key", async () =>
        Response.json({ error: { type: "invalid_request_error" } }, { status }),
      );
      await expect(transport.generate(body)).rejects.toMatchObject({
        knownRejection: false,
      });
    }
    const contradictory = openAITransport("synthetic-key", async () =>
      Response.json(
        { id: "resp_contradictory", error: { type: "invalid_request_error" } },
        { status: 400 },
      ),
    );
    await expect(contradictory.generate(body)).rejects.toMatchObject({
      knownRejection: false,
    });
    expect(generationBody(body)).toMatchObject({
      background: true,
      store: true,
      service_tier: "default",
      max_output_tokens: 16384,
    });
  });
  it("keeps failed, waived and successful findings separate with exact ranges and three stable samples", () => {
    const f = auditFixture().findings[0]!;
    const findings = Array.from({ length: 100 }, (_, i) => ({
      ...f,
      id: `f_${String(i).padStart(3, "0")}`,
      title: "Looks successful",
      status: (i % 3 === 0
        ? "fail"
        : i % 3 === 1
          ? "waived"
          : "pass") as typeof f.status,
      evidence: { ...f.evidence, measured: { width: i, visible: i % 2 === 0 } },
    }));
    const groups: Record<string, unknown>[] = [];
    aggregate(
      findings,
      (_kind, id, payload) => {
        groups.push(payload);
        return id;
      },
      "audit",
    );
    const aggregated = groups.filter(
      (g) => typeof g.representedCount === "number",
    );
    expect(aggregated).toHaveLength(3);
    expect(aggregated.reduce((n, g) => n + Number(g.representedCount), 0)).toBe(
      100,
    );
    expect(aggregated.every((g) => g.sampledCount === 3)).toBe(true);
    expect(aggregated.find((g) => g.status === "fail")?.numbers).toEqual({
      width: { count: 34, min: 0, max: 99 },
    });
  });
});
let harness: Awaited<ReturnType<typeof createTestDatabase>>,
  paths: ReturnType<typeof workspacePaths>;
const project = "project:companion-test";
async function manyCandidates() {
  const report = auditFixture();
  report.findings = Array.from({ length: 9 }, (_, i) => ({
    ...report.findings[0]!,
    id: `finding:synthetic:${i}`,
    ruleId: `synthetic.rule.${i}`,
    status: "fail",
  }));
  const envelope = buildLearningEnvelope({
    projectScope: project,
    report,
    pluginVersion: "test",
    knowledgeVersion: "1.0.0",
  });
  await importLearning(paths, [
    { name: "many", content: JSON.stringify(envelope) },
  ]);
}
async function register(count = 1) {
  const candidates = (await readKnowledgeState(paths)).candidates.slice(
    0,
    count,
  );
  const selection = candidates.map((c) => ({
    candidateId: c.candidateId,
    digest: c.digest,
  }));
  const disclosure = await preview(paths, project, selection);
  const input = {
    requestId: randomUUID(),
    project,
    selection,
    previewDigest: disclosure.digest,
  };
  return { run: await start(paths, input), input, candidates };
}
async function completed(
  count = 1,
  disposition: Recommendation["disposition"] = "defer",
) {
  const registered = await register(count),
    lease = (await claim(paths, randomUUID()))!;
  await dispatch(paths, lease, 4000);
  const recs = registered.candidates.map((c) => ({
    candidateId: c.candidateId,
    candidateDigest: c.digest,
    disposition,
    reason:
      "Current project policy is unavailable; defer pending authoritative evidence.",
    evidenceRefs: [
      registered.run.frozen.snapshot.candidates.find(
        (s) => s.candidateId === c.candidateId,
      )!.ref,
    ],
    priority: "normal" as const,
    edit: null,
  }));
  await finish(paths, lease, {
    outcome: "completed",
    error: null,
    response: response(),
    recommendations: recs,
  });
  return {
    ...registered,
    lease,
    run: await runDetail(paths, registered.run.id),
  };
}
function applyInput(
  run: Awaited<ReturnType<typeof completed>>["run"],
): ApplyInput {
  return {
    requestId: randomUUID(),
    runId: run.id,
    expectedContext: run.contextDigest,
    selections: run.recommendations.map((r) => ({
      recommendationId: r.id,
      rationale: r.reason,
      edit: null,
    })),
  };
}
describe("transactional model review and runner", () => {
  beforeEach(async () => {
    harness = await createTestDatabase();
    for (const [key, value] of Object.entries(harness.env))
      vi.stubEnv(key, value);
    paths = workspacePaths(
      await realpath(await mkdtemp(join(tmpdir(), "model-review-"))),
    );
    await importLearning(paths, [
      { name: "learning", content: JSON.stringify(learningFixture()) },
    ]);
    await settings(paths, project, { allowance: "5" });
  });
  afterEach(async () => {
    await closeDatabases();
    await harness.close();
    await rm(paths.root, { recursive: true, force: true });
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  it("admits 1/8, rejects 9 and shared approvals, replays UUIDs and atomically reserves allowance", async () => {
    await manyCandidates();
    const state = await readKnowledgeState(paths);
    expect(state.candidates.length).toBeGreaterThanOrEqual(9);
    await expect(
      preview(
        paths,
        project,
        state.candidates
          .slice(0, 9)
          .map((c) => ({ candidateId: c.candidateId, digest: c.digest })),
      ),
    ).rejects.toThrow("1–8");
    const one = await register();
    expect((await projectSummary(paths, project)).reservations).toBe(
      RESERVATION,
    );
    expect((await start(paths, one.input)).id).toBe(one.run.id);
    await expect(
      start(paths, { ...one.input, previewDigest: "different" }),
    ).rejects.toMatchObject({ code: "conflict" });
    await expect(register()).rejects.toMatchObject({ code: "conflict" });
    await expect(
      settings(paths, project, { allowance: "0" }),
    ).rejects.toThrow();
    await cancel(paths, one.run.id);
    expect((await projectSummary(paths, project)).reservations).toBe(
      "0.000000000000",
    );
    const eight = await register(8);
    expect(eight.run.frozen.selection).toHaveLength(8);
    await cancel(paths, eight.run.id);
    await settings(paths, project, { allowance: "0" });
    await expect(register()).rejects.toThrow("allowance");
    const c = state.candidates[0]!;
    await recordDecision(paths, {
      requestId: randomUUID(),
      candidateId: c.candidateId,
      candidateDigest: c.digest,
      action: "approve",
      scope: "shared",
      rationale: "Reviewed client neutral guidance.",
    });
    await expect(
      preview(paths, project, [
        { candidateId: c.candidateId, digest: c.digest },
      ]),
    ).rejects.toThrow("shared approvals");
  });
  it("builds stable evidence identities and snapshot hashes with positive audit links and unknown retirement", async () => {
    const state = await readKnowledgeState(paths),
      selected = state.candidates
        .slice(0, 1)
        .map((c) => ({ candidateId: c.candidateId, digest: c.digest }));
    await importAudits(
      paths,
      [{ name: "audit", content: JSON.stringify(auditFixture()) }],
      project,
    );
    await importAudits(
      paths,
      [{ name: "other-audit", content: JSON.stringify(auditFixture()) }],
      "project:other",
    );
    const before = await preview(paths, project, selected);
    expect(
      before.snapshot.evidence.filter((e) => e.kind === "semantic-report"),
    ).toHaveLength(1);
    expect(
      before.snapshot.evidence.filter((e) => e.kind === "audit"),
    ).toHaveLength(1);
    expect(JSON.stringify(before.snapshot)).not.toMatch(
      /nodeId|nodePath|sourceRefs|waiver|https:/u,
    );
    expect(before.snapshot.currentness).toContain("unknown");
    const other = state.candidates[1]!;
    await recordDecision(paths, {
      requestId: randomUUID(),
      candidateId: other.candidateId,
      candidateDigest: other.digest,
      action: "defer",
      scope: "project",
      rationale: "Unselected pending evidence.",
    });
    const after = await preview(paths, project, selected);
    expect(after.digest).toBe(before.digest);
    await recordDecision(paths, {
      requestId: randomUUID(),
      candidateId: other.candidateId,
      candidateDigest: other.digest,
      action: "approve",
      scope: "project",
      rationale: "Reviewed project policy.",
    });
    expect((await preview(paths, project, selected)).contextDigest).not.toBe(
      before.contextDigest,
    );
  });
  it("applies a multi-candidate batch once, rolls invalid rationale back, advances context and preserves project scope", async () => {
    const { run } = await completed(2);
    const before = await readKnowledgeState(paths);
    const bad = applyInput(run);
    bad.selections[1]!.rationale = "   ";
    await expect(apply(paths, bad)).rejects.toThrow();
    expect((await readKnowledgeState(paths)).decisions).toEqual(
      before.decisions,
    );
    const request = applyInput(run);
    request.selections[0]!.edit = {
      wording: "Keep the reviewed project pattern.",
      exceptions: ["Context-specific only."],
    };
    const applied = await apply(paths, request);
    expect(new Set(applied.decisions.map((d) => d.decisionId)).size).toBe(2);
    expect(applied.decisions.every((d) => d.scope === "project")).toBe(true);
    expect(
      (await readKnowledgeState(paths)).candidates.find(
        (c) => c.candidateId === applied.decisions[0]!.candidateId,
      )?.proposedScope,
    ).toBe(
      before.candidates.find(
        (c) => c.candidateId === applied.decisions[0]!.candidateId,
      )?.proposedScope,
    );
    expect(await apply(paths, request)).toEqual(applied);
    await expect(
      apply(paths, {
        ...request,
        requestId: randomUUID(),
        expectedContext: applied.contextDigest,
      }),
    ).rejects.toThrow();
    await expect(
      apply(paths, { ...request, selections: request.selections.slice(0, 1) }),
    ).rejects.toMatchObject({ code: "conflict" });
    expect((await readKnowledgeState(paths)).teamPack.entries).toEqual(
      before.teamPack.entries,
    );
    expect((await runDetail(paths, run.id)).contextDigest).toBe(
      applied.contextDigest,
    );
  });
  it("keeps remaining recommendations actionable but refuses selected decision and shared-approval races", async () => {
    const { run, candidates } = await completed(2);
    const first = applyInput(run);
    first.selections = first.selections.slice(0, 1);
    await apply(paths, first);
    const second = applyInput(await runDetail(paths, run.id));
    second.selections = second.selections.slice(1);
    expect((await apply(paths, second)).decisions).toHaveLength(1);
    const another = await completed();
    const c = candidates[0]!;
    await recordDecision(paths, {
      requestId: randomUUID(),
      candidateId: c.candidateId,
      candidateDigest: c.digest,
      action: "approve",
      scope: "shared",
      rationale: "Shared review race.",
    });
    await expect(apply(paths, applyInput(another.run))).rejects.toMatchObject({
      code: "conflict",
    });
  });
  it("rejects redundant approvals including rationale-only changes and permits effective edits", async () => {
    const c = (await readKnowledgeState(paths)).candidates[0]!;
    await recordDecision(paths, {
      requestId: randomUUID(),
      candidateId: c.candidateId,
      candidateDigest: c.digest,
      action: "approve",
      scope: "project",
      rationale: "Reviewed project guidance.",
    });
    const { run } = await completed(1, "approve");
    expect(run.recommendations[0]!.alreadyApproved).toBe(true);
    const input = applyInput(run);
    await expect(apply(paths, input)).rejects.toMatchObject({
      code: "already_approved",
    });
    input.selections[0]!.edit = {
      wording: "Revised project guidance with an effective wording change.",
      exceptions: [],
    };
    expect((await apply(paths, input)).decisions[0]!.action).toBe("approve");
  });
  it("protects terminal records and backups with restricted grants while additive accounting remains possible", async () => {
    const { run } = await completed();
    const sql = await database(paths.root);
    const denied = (query: string) =>
      expect(
        transaction(paths.root, (tx) => tx.unsafe(query), true),
      ).rejects.toMatchObject({ code: "invalid-input" });
    for (const table of MODEL_TABLES) {
      await denied(`delete from design_passport.${table}`);
      await denied(`truncate design_passport.${table}`);
    }
    await denied(
      `update design_passport.model_runs set frozen='{}' where id='${run.id}'`,
    );
    await denied(
      `update design_passport.model_runs set ended_at=ended_at+interval '1 day' where id='${run.id}'`,
    );
    await denied(
      `update design_passport.model_runs set outcome='interrupted' where id='${run.id}'`,
    );
    expect(
      (
        await sql`select current_user as role,has_column_privilege(current_user,'design_passport.model_accounting','amount','UPDATE') as allowed`
      )[0],
    ).toEqual({ role: "design_passport_test", allowed: false });
    await denied(
      `update design_passport.model_accounting set amount=0 where run_id='${run.id}'`,
    );
    const sealed = await runDetail(paths, run.id);
    expect(sealed.endedAt).toBe(run.endedAt);
    expect(sealed.outcome).toBe("completed");
    expect(sealed.accounting.amount).toBe(run.accounting.amount);
    const backup = await databaseSnapshot(paths);
    expect(MODEL_TABLES.every((t) => Array.isArray(backup.records[t]))).toBe(
      true,
    );
    expect(
      (backup.records.model_runs![0]!.frozen as typeof run.frozen).projection,
    ).toEqual(run.frozen.projection);
  });
  it("settles full discrepant billing once, acknowledges a version and still requires budget admission", async () => {
    const { run } = await register(),
      lease = (await claim(paths, randomUUID()))!;
    await dispatch(paths, lease, 4000);
    await finish(paths, lease, {
      outcome: "interrupted",
      error: "Unconfirmed response.",
    });
    const detail = await runDetail(paths, run.id),
      input = {
        requestId: randomUUID(),
        runId: run.id,
        expectedVersion: detail.accounting.version,
        action: "billed" as const,
        amount: "6",
        evidenceNote: "Operator invoice reference synthetic-123.",
      };
    await reconcile(paths, input);
    await completeReconciliation(paths, lease, input, null);
    expect((await projectSummary(paths, project)).available).toBe(
      "-1.000000000000",
    );
    expect((await projectSummary(paths, project)).knownCost).toBe(
      "6.000000000000",
    );
    expect(await reconcile(paths, input)).toEqual({ billed: "6.000000000000" });
    await expect(register()).rejects.toThrow();
    const settled = await runDetail(paths, run.id);
    const acknowledgement = {
      requestId: randomUUID(),
      runId: run.id,
      expectedVersion: settled.accounting.version,
      action: "discrepancy_acknowledgement" as const,
    };
    await reconcile(paths, acknowledgement);
    await reconcile(paths, acknowledgement);
    expect((await projectSummary(paths, project)).discrepancies).toBe(0);
    await expect(register()).rejects.toThrow();
    await settings(paths, project, { allowance: "7" });
    expect((await register()).run.outcome).toBe("queued");
  });
  it("permits billed reconciliation for unusable terminal usage but never settles partial nonterminal usage", async () => {
    const { run } = await register(),
      lease = (await claim(paths, randomUUID()))!;
    await dispatch(paths, lease, 4000);
    await finish(paths, lease, {
      outcome: "failed",
      error: "Bad output.",
      response: response({ usage: {} }),
    });
    const input = {
      requestId: randomUUID(),
      runId: run.id,
      expectedVersion: (await runDetail(paths, run.id)).accounting.version,
      action: "billed" as const,
      amount: "0.02",
      evidenceNote: "Invoice reference synthetic-456.",
    };
    await reconcile(paths, input);
    expect(
      await completeReconciliation(
        paths,
        lease,
        input,
        response({ status: "in_progress" }),
      ),
    ).toEqual({ nonterminal: true });
    expect((await runDetail(paths, run.id)).accounting.amount).toBeNull();
    const terminalInput = { ...input, requestId: randomUUID() };
    await reconcile(paths, terminalInput);
    await completeReconciliation(
      paths,
      lease,
      terminalInput,
      response({ usage: {} }),
    );
    expect((await runDetail(paths, run.id)).accounting.amount).toBe(
      "0.020000000000",
    );
    expect((await runDetail(paths, run.id)).outcome).toBe("failed");
  });
  it("cancellation winning during counting sends no generation, and recognized versus uncertain dispatch errors retain correct accounting", async () => {
    const { run } = await register();
    let resolveCount!: (n: number) => void, counting!: () => void;
    const counted = new Promise<void>((resolve) => {
      counting = resolve;
    });
    let posts = 0;
    const transport: Transport = {
      count: () => {
        counting();
        return new Promise((resolve) => {
          resolveCount = resolve;
        });
      },
      generate: async () => {
        posts++;
        return response();
      },
      retrieve: async () => response(),
      cancel: async () => response({ status: "cancelled" }),
      delete: async () => {},
    };
    const runner = new ModelReviewRunner(paths, transport),
      work = runner.step();
    await counted;
    await cancel(paths, run.id);
    resolveCount(4000);
    await work;
    expect(posts).toBe(0);
    expect((await runDetail(paths, run.id)).accounting.status).toBe("zero");
    for (const [stage, known, status] of [
      ["count", false, "zero"],
      ["generate", true, "zero"],
      ["generate", false, "unknown"],
    ] as const) {
      const next = await register();
      const failures = {
        ...transport,
        count: async () => {
          if (stage === "count") throw new TransportError(stage);
          return 4000;
        },
        generate: async () => {
          posts++;
          throw new TransportError(stage, known);
        },
      };
      await new ModelReviewRunner(paths, failures).step();
      expect((await runDetail(paths, next.run.id)).accounting.status).toBe(
        status,
      );
    }
  });
  it("never regenerates after dispatch crash and rejects expired owner writes", async () => {
    const { run } = await register(),
      first = (await claim(paths, randomUUID()))!;
    await dispatch(paths, first, 4000);
    await transaction(
      paths.root,
      async (sql) => {
        await sql`update design_passport.model_runs set lease_expires_at=clock_timestamp()-interval '1 second' where id=${run.id}`;
      },
      true,
    );
    const posts = vi.fn(async () => response());
    const transport: Transport = {
      count: async () => 4000,
      generate: posts,
      retrieve: async () => response(),
      cancel: async () => response({ status: "cancelled" }),
      delete: async () => {},
    };
    await new ModelReviewRunner(paths, transport).step();
    expect(posts).not.toHaveBeenCalled();
    expect((await runDetail(paths, run.id)).outcome).toBe("interrupted");
    await expect(observe(paths, first, response())).rejects.toMatchObject({
      code: "conflict",
    });
  });
  it("keeps frozen prompt/schema during ID recovery and settles output-limit failure without partial recommendations", async () => {
    const { run } = await register(),
      first = (await claim(paths, randomUUID()))!;
    await dispatch(paths, first, 4000);
    await observe(paths, first, response({ status: "in_progress" }));
    await transaction(
      paths.root,
      async (sql) => {
        await sql`update design_passport.model_runs set lease_expires_at=clock_timestamp()-interval '1 second' where id=${run.id}`;
      },
      true,
    );
    const transport: Transport = {
      count: async () => {
        throw new Error("No recount");
      },
      generate: async () => {
        throw new Error("No regenerate");
      },
      retrieve: async () =>
        response({
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
        }),
      cancel: async () => response({ status: "cancelled" }),
      delete: async () => {},
    };
    await new ModelReviewRunner(paths, transport).step();
    const saved = await runDetail(paths, run.id);
    expect(saved.error).toContain("Output limit");
    expect(saved.recommendations).toEqual([]);
    expect(saved.accounting.amount).toBe("0.012350000000");
    expect(saved.frozen.projection).toEqual(run.frozen.projection);
  });
  it("validates all eight complete edits, rejects missing/duplicate/invented/refused/unsafe output and requires evidence for policy", async () => {
    await manyCandidates();
    const { run, candidates } = await register(8);
    const snapshot = run.frozen.snapshot;
    const list = candidates.map((c) => ({
      candidateId: c.candidateId,
      candidateDigest: c.digest,
      disposition: "defer",
      reason:
        "Current project policy is missing; defer until authoritative guide evidence is provided.",
      evidenceRefs: [
        snapshot.candidates.find((s) => s.candidateId === c.candidateId)!.ref,
      ],
      priority: "normal",
      edit: {
        wording:
          "Use the reviewed pattern when the project policy permits this design.",
        exceptions: ["Exceptions require project-specific approval."],
      },
    }));
    const provider = (recommendations: unknown) =>
      response({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({ recommendations }),
              },
            ],
          },
        ],
      });
    expect(
      recommendations(provider(list), snapshot, candidates, RESPONSE_SCHEMA),
    ).toHaveLength(8);
    for (const bad of [
      list.slice(1),
      [list[0], ...list.slice(0, 7)],
      list.map((r) => ({ ...r, evidenceRefs: ["invented"] })),
      list.map((r) => ({
        ...r,
        evidenceRefs: [...r.evidenceRefs, ...r.evidenceRefs],
      })),
      list.map((r) => ({ ...r, reason: "   short   " })),
      list.map((r) => ({ ...r, edit: { wording: " ", exceptions: [] } })),
      list.map((r) => ({ ...r, reason: "Bearer syntheticCredential1234" })),
      list.map((r) => ({ ...r, disposition: "approve" })),
    ])
      expect(() =>
        recommendations(provider(bad), snapshot, candidates, RESPONSE_SCHEMA),
      ).toThrow();
    expect(() =>
      recommendations(
        response({ output: [{ content: [{ type: "refusal" }] }] }),
        snapshot,
        candidates,
        RESPONSE_SCHEMA,
      ),
    ).toThrow();
  });
  it("retains explicit retirement provenance and invalidates guide changes without counting repeated exports as recurrence", async () => {
    const repeated = buildLearningEnvelope({
      projectScope: project,
      report: auditFixture(),
      pluginVersion: "test",
      knowledgeVersion: "1.0.0",
      now: new Date("2026-09-24T12:00:00Z"),
    });
    await importLearning(paths, [
      { name: "repeated-export", content: JSON.stringify(repeated) },
    ]);
    const c = (await readKnowledgeState(paths)).candidates[0]!;
    const selection = [{ candidateId: c.candidateId, digest: c.digest }];
    const original = await preview(paths, project, selection);
    expect(
      original.snapshot.evidence.filter((e) => e.kind === "semantic-report"),
    ).toHaveLength(1);
    expect(
      original.snapshot.evidence.find((e) => e.kind === "candidate")
        ?.distinctReportCount,
    ).toBe(1);
    const guide = (
      provenance: "figma-derived" | "approved-project",
      guidance: string,
    ) =>
      buildReferencePack({
        packVersion: "1.0.0",
        source: {
          schemaVersion: 1,
          sourceId: "source:synthetic",
          projectScope: project,
          role: "style-guide",
          contentDigest: hashValue("source"),
          completeness: {
            complete: true,
            availableDomains: ["layout"],
            warnings: [],
          },
        },
        facts: [
          {
            factId: "fact:retirement",
            domain: "layout",
            label: "Current applicability",
            guidance,
            matcher: { kind: "informational" },
            provenance,
          },
        ],
      });
    const approved = guide(
      "approved-project",
      "A previously approved policy is context only.",
    );
    await attachGuide(paths, project, JSON.stringify(approved));
    expect(
      (await preview(paths, project, selection)).snapshot.authoritativeRefs,
    ).toEqual([]);
    const { run } = await completed();
    const authority = guide(
      "figma-derived",
      "The source policy explicitly retires responsive.token-parity for this project from 2026-10-05.",
    );
    const guideId = await attachGuide(
      paths,
      project,
      JSON.stringify(authority),
    );
    const changed = await preview(paths, project, selection);
    expect(changed.guideVersion).toBe(guideId);
    expect(changed.contextDigest).not.toBe(original.contextDigest);
    expect(
      changed.snapshot.evidence.find((e) => e.kind === "guide-fact")?.guidance,
    ).toContain("explicitly retires");
    await expect(apply(paths, applyInput(run))).rejects.toMatchObject({
      code: "conflict",
    });
    const count = (await databaseSnapshot(paths)).records.model_guides!.length;
    await attachGuide(paths, project, JSON.stringify(authority));
    expect((await databaseSnapshot(paths)).records.model_guides).toHaveLength(
      count,
    );
    await expect(
      attachGuide(paths, "project:other", JSON.stringify(authority)),
    ).rejects.toThrow("different project");
    await expect(
      attachGuide(paths, project, " ".repeat(90_001)),
    ).rejects.toThrow();
    await expect(
      attachGuide(
        paths,
        project,
        JSON.stringify(
          guide("figma-derived", "Bearer syntheticCredential1234"),
        ),
      ),
    ).rejects.toThrow();
  });
  it("rejects credential prose in candidates and prior rationales before registration while preserving original evidence", async () => {
    const secret = "sk-syntheticCredential123456";
    const c = (await readKnowledgeState(paths)).candidates[0]!;
    await recordDecision(paths, {
      requestId: randomUUID(),
      candidateId: c.candidateId,
      candidateDigest: c.digest,
      action: "defer",
      scope: "project",
      rationale: `Waiting on ${secret}`,
    });
    const selected = [{ candidateId: c.candidateId, digest: c.digest }];
    await expect(preview(paths, project, selected)).rejects.toThrow(
      "unsafe content",
    );
    expect((await projectSummary(paths, project)).runCount).toBe(0);
    expect((await readKnowledgeState(paths)).decisions[0]!.rationale).toContain(
      secret,
    );
    const other = (await readKnowledgeState(paths)).candidates[1]!;
    const revised = await reviseCandidate(paths, {
      candidateId: other.candidateId,
      candidateDigest: other.digest,
      wording: `Use ${secret}`,
      exceptions: [],
      proposedScope: other.proposedScope,
    });
    try {
      await preview(paths, project, [
        { candidateId: other.candidateId, digest: revised.candidate.digest },
      ]);
      throw new Error("Expected rejection");
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
    }
  });
  it("recovers known IDs with read backoff and preserves interruption while settling later usage", async () => {
    const { run } = await register(),
      lease = (await claim(paths, randomUUID()))!;
    await dispatch(paths, lease, 4000);
    await observe(paths, lease, response({ status: "in_progress" }));
    await finish(paths, lease, {
      outcome: "interrupted",
      error: "Confirmation failed.",
    });
    await transaction(
      paths.root,
      async (sql) => {
        await sql`update design_passport.model_runs set lease_expires_at=clock_timestamp()-interval '1 second' where id=${run.id}`;
      },
      true,
    );
    let reads = 0,
      now = Date.now();
    const sleeps: number[] = [];
    const transport: Transport = {
      count: async () => {
        throw new Error("No recount");
      },
      generate: async () => {
        throw new Error("No regeneration");
      },
      retrieve: async () => {
        if (++reads <= 4) throw new TransportError("retrieve");
        return response({
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
        });
      },
      cancel: async () => response({ status: "cancelled" }),
      delete: vi.fn(async () => {}),
    };
    await new ModelReviewRunner(paths, transport, {
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    }).step();
    const settled = await runDetail(paths, run.id);
    expect(sleeps).toEqual([2000, 4000, 8000, 15000]);
    expect(settled.outcome).toBe("interrupted");
    expect(settled.accounting.amount).toBe("0.012350000000");
    expect(transport.delete).toHaveBeenCalledOnce();
    const backup = await exportKnowledge(paths, join(paths.root, "backup"));
    await verifyKnowledgeExport(backup);
    const saved = JSON.parse(
      await readFile(join(backup, "database-history.v1.json"), "utf8"),
    );
    expect(saved.tables.model_accounting).toHaveLength(3);
    expect(saved.tables.model_runs[0].frozen.projection).toEqual(
      run.frozen.projection,
    );
  });
  it("keeps the dispatch reservation through cancellation and lets confirmed completion win", async () => {
    const { run } = await register();
    let generated!: () => void,
      finishGeneration!: (r: ProviderResponse) => void;
    const reached = new Promise<void>((resolve) => {
      generated = resolve;
    });
    const transport: Transport = {
      count: async () => 4000,
      generate: () => {
        generated();
        return new Promise((resolve) => {
          finishGeneration = resolve;
        });
      },
      retrieve: async () => response(),
      cancel: async () => response(),
      delete: async () => {},
    };
    const work = new ModelReviewRunner(paths, transport).step();
    await reached;
    await cancel(paths, run.id);
    expect((await projectSummary(paths, project)).reservations).toBe(
      RESERVATION,
    );
    const snapshot = run.frozen.snapshot,
      c = snapshot.candidates[0]!;
    finishGeneration(
      response({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  recommendations: [
                    {
                      candidateId: c.candidateId,
                      candidateDigest: c.digest,
                      disposition: "defer",
                      reason:
                        "Current policy is unavailable; await authoritative guidance.",
                      priority: "normal",
                      edit: null,
                      evidenceRefs: [c.ref],
                    },
                  ],
                }),
              },
            ],
          },
        ],
      }),
    );
    await work;
    const completed = await runDetail(paths, run.id);
    expect(completed.outcome).toBe("completed");
    expect(completed.accounting.status).toBe("estimated");
  });
  it("keeps the inherited runner key out of the Next child environment", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-syntheticCredential12345");
    vi.stubEnv("DESIGN_PASSPORT_TEST_MODEL_REVIEW", "fixture");
    expect(runtimeChildEnvironment().OPENAI_API_KEY).toBeUndefined();
    expect(
      runtimeChildEnvironment().DESIGN_PASSPORT_TEST_MODEL_REVIEW,
    ).toBeUndefined();
  });
});
