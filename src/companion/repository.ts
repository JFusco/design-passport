import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import type { TransactionSql } from "postgres";
import type { DesignReferencePackV1, KnowledgeCandidateV1, KnowledgeDecisionV1, ReadinessReport, ReviewLearningEnvelopeV1, TeamKnowledgePackV1 } from "../core/contracts";
import { assertLearningEnvelope, buildKnowledgeDecision, buildReferencePack, compileTeamKnowledgePack, generateCandidateDrafts, projectGuidanceFact, reportIdentityDigest, reviseKnowledgeCandidate } from "../core/knowledge-loop";
import { hashValue, stableStringify } from "../core/stable";
import { transaction } from "./database";
import { CompanionError } from "./errors";
import { assertAudit, assertProjectScope, sha256, validateInputSizes, type ImportBatchResult, type ImportFileResult, type ImportInput } from "./imports";
import type { KnowledgeState, WorkspacePaths } from "./filesystem";
export type { KnowledgeState, WorkspacePaths } from "./filesystem";
export type { ImportBatchResult, ImportInput } from "./imports";
export { resolveWorkspaceRoot, workspacePaths } from "./filesystem";

const epoch = "1970-01-01T00:00:00.000Z";
function json(sql: TransactionSql, value: unknown) { return sql.json(value as postgres.JSONValue); }
function emptyPack(): TeamKnowledgePackV1 { return compileTeamKnowledgePack({ knowledgeVersion: "1.0.0", candidates: [], decisions: [], now: new Date(epoch) }); }

async function stateIn(sql: TransactionSql): Promise<KnowledgeState> {
  const envelopes = (await sql`select payload from design_passport.contributions order by source_at, id`).map((row) => row.payload as ReviewLearningEnvelopeV1);
  const candidates = (await sql`select payload from design_passport.candidates order by id`).map((row) => row.payload as KnowledgeCandidateV1);
  const decisions = (await sql`select payload from design_passport.decisions order by source_at, id`).map((row) => row.payload as KnowledgeDecisionV1);
  const pack = (await sql`select payload from design_passport.guidance_packs where id = 'shared'`)[0];
  return { envelopes, candidates, decisions, teamPack: pack?.payload as TeamKnowledgePackV1 ?? emptyPack() };
}
export async function readKnowledgeState(paths: WorkspacePaths): Promise<KnowledgeState> { return transaction(paths.root, stateIn); }
async function packsIn(sql: TransactionSql): Promise<DesignReferencePackV1[]> {
  return (await sql`select payload from design_passport.guidance_packs where project_scope is not null order by project_scope`)
    .map((row) => row.payload as DesignReferencePackV1).filter((pack) => pack.facts.length > 0);
}
export async function listProjectGuidancePacks(paths: WorkspacePaths): Promise<DesignReferencePackV1[]> { return transaction(paths.root, packsIn); }
export async function readDashboard(paths: WorkspacePaths) { return transaction(paths.root, async (sql) => ({ state: await stateIn(sql), projectPacks: await packsIn(sql) })); }

async function retainCandidate(sql: TransactionSql, candidate: KnowledgeCandidateV1, parent?: KnowledgeCandidateV1): Promise<void> {
  if (parent) {
    const updated = await sql`update design_passport.candidates set digest = ${candidate.digest}, payload = ${json(sql, candidate)} where id = ${candidate.candidateId} and project_scope = ${candidate.projectScope} and digest = ${parent.digest} returning id`;
    if (!updated.length) throw new CompanionError("conflict", "This draft changed. Reload it before saving.", 409);
  } else await sql`insert into design_passport.candidates(id, project_scope, observation_key, digest, payload) values (${candidate.candidateId}, ${candidate.projectScope}, ${candidate.observationKey}, ${candidate.digest}, ${json(sql, candidate)})`;
  await sql`insert into design_passport.candidate_revisions(project_scope, candidate_id, digest, source_at, payload) values (${candidate.projectScope}, ${candidate.candidateId}, ${candidate.digest}, ${candidate.generatedAt}, ${json(sql, candidate)}) on conflict do nothing`;
}
async function derive(sql: TransactionSql, regenerate: boolean): Promise<void> {
  const state = await stateIn(sql);
  if (regenerate) {
    const envelopeTime = state.envelopes.map((item) => item.generatedAt).sort().at(-1) ?? epoch;
    const generated = generateCandidateDrafts(state.envelopes, new Date(envelopeTime));
    const existing = new Map(state.candidates.map((candidate) => [candidate.groupKey, candidate]));
    for (const draft of generated) {
      const parent = existing.get(draft.groupKey);
      const unchanged = parent && stableStringify(parent.evidenceEnvelopeDigests) === stableStringify(draft.evidenceEnvelopeDigests)
        && parent.supportCount === draft.supportCount && parent.contradictCount === draft.contradictCount;
      if (unchanged) continue;
      const candidate = parent ? reviseKnowledgeCandidate(draft, parent, new Date(envelopeTime)) : draft;
      await retainCandidate(sql, candidate, parent);
    }
    state.candidates = (await sql`select payload from design_passport.candidates order by id`).map((row) => row.payload as KnowledgeCandidateV1);
  }
  const buildTime = [...state.decisions.map((item) => item.decidedAt), ...state.candidates.map((item) => item.generatedAt)].sort().at(-1) ?? epoch;
  const teamPack = compileTeamKnowledgePack({ knowledgeVersion: "1.0.0", candidates: state.candidates, decisions: state.decisions, now: new Date(buildTime) });
  await sql`insert into design_passport.guidance_packs(id, payload) values ('shared', ${json(sql, teamPack)}) on conflict(id) do update set payload = excluded.payload`;
  const latest = new Map<string, KnowledgeDecisionV1>();
  for (const decision of state.decisions) latest.set(decision.candidateId, decision);
  const scopes = [...new Set(state.candidates.map((candidate) => candidate.projectScope))].sort();
  for (const scope of scopes) {
    const approved = state.candidates.filter((candidate) => {
      const decision = latest.get(candidate.candidateId);
      return candidate.projectScope === scope && decision?.action === "approve" && decision.scope === "project" && decision.candidateDigest === candidate.digest;
    });
    const facts = approved.map(projectGuidanceFact);
    const source = { schemaVersion: 1 as const, sourceId: `project-guidance:${scope}`, projectScope: scope, role: "style-guide" as const,
      contentDigest: hashValue(approved.map((candidate) => candidate.digest).sort()), completeness: { complete: true, availableDomains: [...new Set(facts.map((fact) => fact.domain))].sort(), warnings: [] } };
    const pack = buildReferencePack({ packVersion: "1.0.0", source, facts }, new Date(buildTime));
    await sql`insert into design_passport.guidance_packs(id, project_scope, payload) values (${`project:${scope}`}, ${scope}, ${json(sql, pack)}) on conflict(id) do update set payload = excluded.payload`;
  }
}
async function ensureProject(sql: TransactionSql, scope: string): Promise<void> {
  await sql`insert into design_passport.projects(scope) values (${scope}) on conflict do nothing`;
}
function batch(files: ImportFileResult[]): ImportBatchResult {
  return { files, imported: files.filter((item) => item.status === "imported").length, duplicates: files.filter((item) => item.status === "duplicate").length,
    invalid: files.filter((item) => item.status === "invalid").length, retryable: files.filter((item) => item.status === "retryable").length };
}
async function importBatch<T>(inputs: ImportInput[], validate: (value: unknown) => T, save: (value: T) => Promise<boolean>): Promise<ImportBatchResult> {
  const files: ImportFileResult[] = [];
  for (const input of inputs) {
    let value: T;
    try { value = validate(JSON.parse(input.content)); }
    catch { files.push({ name: input.name, status: "invalid", message: "File is not a valid Design Passport export." }); continue; }
    try {
      const imported = await save(value);
      files.push({ name: input.name, status: imported ? "imported" : "duplicate", message: imported ? "Imported." : "Already imported." });
    } catch (error) {
      if (!(error instanceof CompanionError) || !["invalid-input", "unavailable", "busy"].includes(error.code)) throw error;
      files.push({ name: input.name, status: error.code === "invalid-input" ? "invalid" : "retryable", message: error.message });
    }
  }
  return batch(files);
}
export async function importLearning(paths: WorkspacePaths, inputs: ImportInput[]): Promise<ImportBatchResult> {
  validateInputSizes(inputs, "learning");
  return importBatch(inputs, (value) => { assertLearningEnvelope(value); return value; }, (envelope) => transaction(paths.root, async (sql) => {
    await ensureProject(sql, envelope.projectScope);
    const rows = await sql`insert into design_passport.contributions(id, project_scope, report_identity_digest, source_at, search_text, payload)
      values (${envelope.digest}, ${envelope.projectScope}, ${envelope.reportDigest}, ${envelope.generatedAt}, ${envelope.observations.map((item) => `${item.context} ${item.ruleId ?? ""} ${item.canonicalLabel ?? ""}`).join(" ")}, ${json(sql, envelope)}) on conflict do nothing returning id`;
    if (!rows.length) { await sql`select id from design_passport.contributions where id = ${envelope.digest}`; return false; }
    for (const [index, observation] of envelope.observations.entries()) await sql`insert into design_passport.observations(project_scope, contribution_id, occurrence, observation_key, rule_id, direction, payload)
      values (${envelope.projectScope}, ${envelope.digest}, ${index}, ${observation.observationKey}, ${observation.ruleId ?? null}, ${observation.direction}, ${json(sql, observation)})`;
    await derive(sql, true);
    return true;
  }, true));
}
export async function importAudits(paths: WorkspacePaths, inputs: ImportInput[], projectScope: string): Promise<ImportBatchResult> {
  assertProjectScope(projectScope); validateInputSizes(inputs, "audit");
  return importBatch(inputs, assertAudit, ({ report, source }) => transaction(paths.root, async (sql) => {
    await ensureProject(sql, projectScope);
    const reportHash = sha256(report);
    const inserted = await sql`insert into design_passport.audits(id, project_scope, report_sha256, report_identity_digest, source_at, grade, ready, search_text, payload)
      values (${randomUUID()}, ${projectScope}, ${reportHash}, ${reportIdentityDigest(report)}, ${report.generatedAt}, ${report.grade.letter}, ${report.ready},
      ${report.frames.map((frame) => `${frame.rootName} ${frame.pageName}`).concat(report.findings.map((finding) => `${finding.ruleId} ${finding.title} ${finding.message} ${finding.nodePath}`)).join(" ")}, ${json(sql, report)}) on conflict do nothing returning id`;
    const retained = inserted[0] ?? (await sql`select id from design_passport.audits where project_scope = ${projectScope} and report_sha256 = ${reportHash}`)[0]!;
    if (inserted.length) {
      // Bound parameter counts and statement sizes for representative file-scope exports.
      for (let offset = 0; offset < report.findings.length; offset += 100) {
        const rows = report.findings.slice(offset, offset + 100).map((finding) => ({ project_scope: projectScope, audit_id: retained.id, finding_id: finding.id, rule_id: finding.ruleId, status: finding.status, payload: json(sql, finding) }));
        await sql`insert into design_passport.findings ${sql(rows)}`;
      }
    }
    const exports = await sql`insert into design_passport.audit_exports(id, project_scope, audit_id, payload_sha256, payload)
      values (${randomUUID()}, ${projectScope}, ${retained.id}, ${sha256(source)}, ${json(sql, source)}) on conflict do nothing returning id`;
    if (!exports.length) await sql`select id from design_passport.audit_exports where project_scope = ${projectScope} and payload_sha256 = ${sha256(source)}`;
    return exports.length > 0;
  }, true));
}
export interface RevisionInput { candidateId: string; candidateDigest: string; wording: string; proposedScope: "project" | "shared"; exceptions: string[] }
export async function reviseCandidate(paths: WorkspacePaths, input: RevisionInput): Promise<{ candidate: KnowledgeCandidateV1 }> {
  return transaction(paths.root, async (sql) => {
    const row = (await sql`select payload from design_passport.candidates where id = ${input.candidateId}`)[0];
    if (!row) throw new CompanionError("conflict", "This draft changed. Reload it before saving.", 409);
    const current = row.payload as KnowledgeCandidateV1;
    const parentRow = (await sql`select payload from design_passport.candidate_revisions where project_scope = ${current.projectScope} and candidate_id = ${input.candidateId} and digest = ${input.candidateDigest}`)[0];
    if (!parentRow) throw new CompanionError("conflict", "This draft changed. Reload it before saving.", 409);
    let successor: KnowledgeCandidateV1;
    try { successor = reviseKnowledgeCandidate(parentRow.payload as KnowledgeCandidateV1, input); }
    catch { throw new CompanionError("invalid-input", "The candidate edits are invalid or contain unsafe data.", 400); }
    if (current.digest !== input.candidateDigest) {
      if (stableStringify({ ...current, generatedAt: "" }) === stableStringify({ ...successor, generatedAt: "" })) return { candidate: current };
      throw new CompanionError("conflict", "This draft changed. Reload it before saving.", 409);
    }
    await retainCandidate(sql, successor, current);
    await derive(sql, false);
    return { candidate: successor };
  }, true);
}
export interface DecisionInput { requestId: string; candidateId: string; candidateDigest: string; action: "approve" | "reject" | "defer"; scope: "project" | "shared"; rationale: string }
export async function recordDecision(paths: WorkspacePaths, input: DecisionInput): Promise<{ decision: KnowledgeDecisionV1 }> {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(input.requestId)) throw new CompanionError("invalid-input", "A decision requires a client request UUID.", 400);
  const requestId = input.requestId.toLowerCase();
  const rationale = input.rationale.normalize("NFKC").trim();
  return transaction(paths.root, async (sql) => {
    const replay = (await sql`select payload from design_passport.decisions where request_id = ${requestId}`)[0];
    if (replay) {
      const decision = replay.payload as KnowledgeDecisionV1;
      if (decision.candidateId !== input.candidateId || decision.candidateDigest !== input.candidateDigest || decision.action !== input.action || decision.scope !== input.scope || decision.rationale !== rationale) throw new CompanionError("conflict", "This request ID already belongs to a different decision.", 409);
      return { decision };
    }
    const row = (await sql`select payload from design_passport.candidates where id = ${input.candidateId} and digest = ${input.candidateDigest}`)[0];
    if (!row) throw new CompanionError("conflict", "This draft changed. Reload it before deciding.", 409);
    const candidate = row.payload as KnowledgeCandidateV1;
    let decision: KnowledgeDecisionV1;
    try { decision = buildKnowledgeDecision({ decisionId: `decision:${requestId}`, candidateId: input.candidateId, candidateDigest: input.candidateDigest, action: input.action, scope: input.scope, rationale }); }
    catch { throw new CompanionError("invalid-input", "The decision is invalid or contains unsafe data.", 400); }
    await sql`insert into design_passport.decisions(id, request_id, project_scope, candidate_id, candidate_digest, action, scope, rationale, source_at, payload)
      values (${decision.decisionId}, ${requestId}, ${candidate.projectScope}, ${candidate.candidateId}, ${candidate.digest}, ${decision.action}, ${decision.scope}, ${decision.rationale}, ${decision.decidedAt}, ${json(sql, decision)})`;
    await derive(sql, false);
    return { decision };
  }, true);
}

export async function listProjects(paths: WorkspacePaths): Promise<Array<{ scope: string; displayName: string | null }>> {
  return transaction(paths.root, async (sql) => (await sql`select scope, display_name from design_passport.projects order by scope`).map((row) => ({ scope: row.scope as string, displayName: row.display_name as string | null })));
}
export async function previewAuditProjects(paths: WorkspacePaths, inputs: ImportInput[]) {
  validateInputSizes(inputs, "audit");
  const parsed = inputs.map((input) => {
    try { const { report } = assertAudit(JSON.parse(input.content)); return { name: input.name, identity: reportIdentityDigest(report) }; }
    catch { return { name: input.name }; }
  });
  return transaction(paths.root, async (sql) => {
    const files = [];
    for (const item of parsed) {
      const scopes = item.identity ? (await sql`select distinct project_scope from design_passport.contributions where report_identity_digest = ${item.identity} order by project_scope`).map((row) => row.project_scope as string) : [];
      files.push({ name: item.name, valid: Boolean(item.identity), scopes });
    }
    const scopes = [...new Set(files.flatMap((file) => file.scopes))];
    return { files, suggestedScope: scopes.length === 1 ? scopes[0] : null, ambiguous: scopes.length > 1 };
  });
}

export interface HistoryFilters { project?: string; from?: string; to?: string; rule?: string; status?: string; grade?: string; ready?: string; q?: string; cursor?: string; limit?: number }
export interface HistoryRow { id: string; projectScope: string; sourceAt: string; receivedAt: string; grade?: string; ready?: boolean; identity: string }
function cursor(value?: string): { time: string; id: string } | undefined {
  if (!value) return;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString()) as { time: string; id: string };
    if (typeof parsed.id !== "string" || !parsed.id || !Number.isFinite(Date.parse(parsed.time))) throw new Error();
    return parsed;
  } catch { throw new CompanionError("invalid-input", "The history cursor is invalid.", 400); }
}
export async function listHistory(paths: WorkspacePaths, kind: "audit" | "learning", filters: HistoryFilters = {}): Promise<{ rows: HistoryRow[]; nextCursor: string | null }> {
  const after = cursor(filters.cursor);
  const limit = Math.min(100, Math.max(1, Math.trunc(filters.limit ?? 25)));
  if (!Number.isFinite(limit) || [filters.from, filters.to].some((value) => value && !Number.isFinite(Date.parse(value)))) throw new CompanionError("invalid-input", "The history filters are invalid.", 400);
  if (filters.q && filters.q.length > 200) throw new CompanionError("invalid-input", "Search must be at most 200 characters.", 400);
  return transaction(paths.root, async (sql) => {
    const conditions = [sql`true`];
    if (filters.project) conditions.push(sql`h.project_scope = ${filters.project}`);
    if (filters.from) conditions.push(sql`h.source_at >= ${filters.from}::timestamptz`);
    if (filters.to) conditions.push(sql`h.source_at < ${filters.to}::timestamptz + interval '1 day'`);
    if (filters.q?.trim()) conditions.push(sql`h.search_vector @@ plainto_tsquery('simple', ${filters.q})`);
    if (after) conditions.push(sql`(h.source_at, h.id::text) < (${after.time}::timestamptz, ${after.id})`);
    if (kind === "audit") {
      if (filters.grade) conditions.push(sql`h.grade = ${filters.grade}`);
      if (filters.ready) conditions.push(sql`h.ready = ${filters.ready === "true"}`);
      if (filters.rule || filters.status) conditions.push(sql`exists (select 1 from design_passport.findings f where f.project_scope = h.project_scope and f.audit_id = h.id
        ${filters.rule ? sql`and f.rule_id = ${filters.rule}` : sql``} ${filters.status ? sql`and f.status = ${filters.status}` : sql``})`);
    } else {
      if (filters.rule) conditions.push(sql`exists (select 1 from design_passport.observations o where o.project_scope = h.project_scope and o.contribution_id = h.id and o.rule_id = ${filters.rule})`);
      if (filters.status) conditions.push(sql`exists (select 1 from design_passport.observations o join design_passport.candidates c on c.project_scope = o.project_scope and c.observation_key = o.observation_key
        left join lateral (select action, candidate_digest from design_passport.decisions where project_scope = c.project_scope and candidate_id = c.id order by source_at desc, id desc limit 1) d on true
        where o.project_scope = h.project_scope and o.contribution_id = h.id and
        (case when d.action is null then 'awaiting' when d.candidate_digest <> c.digest then 'changed' when d.action = 'approve' then 'approved' when d.action = 'reject' then 'rejected' else 'deferred' end) = ${filters.status})`);
    }
    const table = kind === "audit" ? sql`design_passport.audits` : sql`design_passport.contributions`;
    const where = conditions.reduce((left, right) => sql`${left} and ${right}`);
    const records = await sql`select h.id, h.project_scope, h.source_at, h.received_at, h.report_identity_digest ${kind === "audit" ? sql`, h.grade, h.ready` : sql``} from ${table} h where ${where} order by h.source_at desc, h.id desc limit ${limit + 1}`;
    const rows = records.slice(0, limit).map((row): HistoryRow => ({ id: row.id, projectScope: row.project_scope, sourceAt: new Date(row.source_at).toISOString(), receivedAt: new Date(row.received_at).toISOString(), identity: row.report_identity_digest,
      ...(kind === "audit" ? { grade: row.grade as string, ready: row.ready as boolean } : {}) }));
    const last = rows.at(-1);
    return { rows, nextCursor: records.length > limit && last ? Buffer.from(JSON.stringify({ time: last.sourceAt, id: last.id })).toString("base64url") : null };
  });
}
export async function auditDetail(paths: WorkspacePaths, id: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(id)) throw new CompanionError("not-found", "Audit not found.", 404);
  return transaction(paths.root, async (sql) => {
    const audit = (await sql`select * from design_passport.audits where id = ${id}`)[0];
    if (!audit) throw new CompanionError("not-found", "Audit not found.", 404);
    const exports = await sql`select id, received_at, payload_sha256, payload from design_passport.audit_exports where project_scope = ${audit.project_scope} and audit_id = ${id} order by received_at, id`;
    const links = await sql`select id from design_passport.contributions where project_scope = ${audit.project_scope} and report_identity_digest = ${audit.report_identity_digest} order by id`;
    return { id, projectScope: audit.project_scope as string, report: audit.payload as ReadinessReport, reportSha256: audit.report_sha256 as string,
      receivedAt: new Date(audit.received_at).toISOString(), exports: exports.map((row) => ({ id: row.id as string, receivedAt: new Date(row.received_at).toISOString(), sha256: row.payload_sha256 as string, source: row.payload as unknown })),
      contributionIds: links.map((row) => row.id as string), ambiguous: links.length > 1 };
  });
}
export async function auditDownload(paths: WorkspacePaths, id: string): Promise<unknown> {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(id)) throw new CompanionError("not-found", "Audit source not found.", 404);
  return transaction(paths.root, async (sql) => {
    const row = (await sql`select payload from design_passport.audit_exports where id = ${id}`)[0];
    if (!row) throw new CompanionError("not-found", "Audit source not found.", 404);
    return row.payload;
  });
}
export async function learningDetail(paths: WorkspacePaths, id: string) {
  return transaction(paths.root, async (sql) => {
    const row = (await sql`select * from design_passport.contributions where id = ${id}`)[0];
    if (!row) throw new CompanionError("not-found", "Learning contribution not found.", 404);
    const envelope = row.payload as ReviewLearningEnvelopeV1;
    const keys = envelope.observations.map((observation) => observation.observationKey);
    const candidates = keys.length ? (await sql`select payload from design_passport.candidates where project_scope = ${row.project_scope} and observation_key in ${sql(keys)}`).map((item) => item.payload as KnowledgeCandidateV1) : [];
    const ids = candidates.map((candidate) => candidate.candidateId);
    const revisions = ids.length ? (await sql`select payload from design_passport.candidate_revisions where project_scope = ${row.project_scope} and candidate_id in ${sql(ids)} order by received_at, digest`).map((item) => item.payload as KnowledgeCandidateV1) : [];
    const decisions = ids.length ? (await sql`select payload from design_passport.decisions where project_scope = ${row.project_scope} and candidate_id in ${sql(ids)} order by source_at, id`).map((item) => item.payload as KnowledgeDecisionV1) : [];
    const audits = await sql`select id from design_passport.audits where project_scope = ${row.project_scope} and report_identity_digest = ${row.report_identity_digest} order by id`;
    return { envelope, receivedAt: new Date(row.received_at).toISOString(), candidates, revisions, decisions, auditIds: audits.map((audit) => audit.id as string), ambiguous: audits.length > 1 };
  });
}
export async function databaseSnapshot(paths: WorkspacePaths) {
  return transaction(paths.root, async (sql) => {
    const tables = ["projects", "audits", "audit_exports", "findings", "contributions", "observations", "candidates", "candidate_revisions", "decisions", "guidance_packs"] as const;
    const records: Record<string, Record<string, unknown>[]> = {};
    for (const table of tables) records[table] = await sql`select * from ${sql(`design_passport.${table}`)}`;
    return { state: await stateIn(sql), projectPacks: await packsIn(sql), records };
  });
}
