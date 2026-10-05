import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, realpath, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importLearning, importAudits, auditDetail, auditDownload, learningDetail, listHistory, previewAuditProjects, readKnowledgeState, recordDecision, reviseCandidate, workspacePaths } from "../src/companion/repository";
import { closeDatabases, database, databaseError, transaction } from "../src/companion/database";
import { CompanionError } from "../src/companion/errors";
import { readFilesystemKnowledgeState, listFilesystemProjectGuidancePacks, withWorkspaceWrite } from "../src/companion/filesystem";
import * as filesystem from "../src/companion/filesystem";
import { exportKnowledge, exportRelease, verifyKnowledgeExport } from "../src/companion/exports";
import { assertAudit, boundedBody, multipartInputs, readImportFiles } from "../src/companion/imports";
import { reviewView } from "../src/companion/view-models";
import { createTestDatabase } from "./helpers/companion-database.mjs";
import { auditFixture, fileScopeFixture, learningFixture } from "./helpers/companion-fixtures";
import { assertContract } from "../src/core/schema";

let harness: Awaited<ReturnType<typeof createTestDatabase>>;
let paths: ReturnType<typeof workspacePaths>;
function learning(identity = "base", projectScope?: string) { return { name: "learning.json", content: JSON.stringify(learningFixture(identity, projectScope)) }; }
function audit(report = auditFixture()) { return { name: "audit.json", content: JSON.stringify(report) }; }
async function firstCandidate() { await importLearning(paths, [learning()]); return (await readKnowledgeState(paths)).candidates[0]!; }

describe("companion database errors and pool", () => {
  afterEach(async () => { vi.restoreAllMocks(); await closeDatabases(); vi.unstubAllEnvs(); });
  it("distinguishes deterministic failures from availability and contention without exposing details", () => {
    for (const code of [undefined, "22P02", "23514", "54000", "42501"]) {
      const error = databaseError(Object.assign(new Error("private fixture detail"), { code }));
      expect(error).toBeInstanceOf(CompanionError);
      expect(error).toMatchObject({ code: "invalid-input", status: 422 });
      expect(error.message).not.toContain("private fixture detail");
    }
    for (const code of ["08006", "08P01", "53300", "57P01", "57P02", "57P03", "57P04", "57P05", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN", "EPIPE", "EHOSTUNREACH", "ENETUNREACH", "CONNECT_TIMEOUT", "CONNECTION_CLOSED", "CONNECTION_DESTROYED", "CONNECTION_ENDED"]) {
      expect(databaseError({ code })).toMatchObject({ code: "unavailable", status: 503 });
    }
    for (const code of ["55P03", "57014", "40P01"]) expect(databaseError({ code })).toMatchObject({ code: "busy", status: 423 });
    const conflict = new CompanionError("conflict", "This draft changed.", 409);
    expect(databaseError(conflict)).toBe(conflict);
  });
  it("keeps an ended Postgres.js client retryable and rejects malformed audit IDs before querying", async () => {
    vi.stubEnv("DESIGN_PASSPORT_DATABASE_TEST_MODE", "pglite");
    vi.stubEnv("DESIGN_PASSPORT_DATABASE_URL", "postgres://design_passport_test@127.0.0.1:1/pglite");
    const synthetic = workspacePaths(join(process.cwd(), "synthetic-closed-pool"));
    const sql = await database(synthetic.root);
    // End the lazy client before any query so this probe never opens a socket.
    await sql.end({ timeout: 5 });
    await expect(readKnowledgeState(synthetic)).rejects.toMatchObject({ code: "unavailable", status: 503 });
    expect(await importLearning(synthetic, [learning()])).toMatchObject({ imported: 0, invalid: 0, retryable: 1, files: [{ status: "retryable" }] });
    await expect(auditDetail(synthetic, "-".repeat(36))).rejects.toMatchObject({ code: "not-found", status: 404 });
    await expect(auditDownload(synthetic, "-".repeat(36))).rejects.toMatchObject({ code: "not-found", status: 404 });
  });
  it("shares one hosted client across concurrent CA reads and closes it once", async () => {
    const root = join(process.cwd(), "synthetic-pool");
    let releaseCA!: (value: string) => void;
    const ca = new Promise<string>((resolve) => { releaseCA = resolve; });
    let reads = 0;
    const read = vi.fn(async (path: string) => {
      if (path === join(root, ".env.local")) return "";
      if (path === join(root, "fixture-ca.pem")) { reads += 1; return ca; }
      throw new Error("Unexpected synthetic configuration path");
    });
    const end = vi.fn().mockResolvedValue(undefined);
    const client = { end };
    const factory = vi.fn(() => client);
    vi.stubEnv("DESIGN_PASSPORT_DATABASE_TEST_MODE", "");
    vi.stubEnv("DESIGN_PASSPORT_DATABASE_URL", "postgres://design_passport_runtime.abcdefghijklmnopqrst@synthetic.pooler.supabase.com:5432/postgres");
    vi.stubEnv("DESIGN_PASSPORT_DATABASE_CA_PATH", "fixture-ca.pem");
    vi.resetModules();
    vi.doMock("postgres", () => ({ default: factory }));
    vi.doMock("node:fs/promises", () => ({ readFile: read }));
    const isolated = await import("../src/companion/database");
    const calls = [isolated.database(root), isolated.database(root)];
    try {
      await vi.waitFor(() => expect(reads).toBe(2));
      expect(factory).not.toHaveBeenCalled();
      releaseCA("synthetic CA");
      const [first, second] = await Promise.all(calls);
      expect(first).toBe(client); expect(second).toBe(first);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(factory.mock.calls[0]).toEqual([process.env.DESIGN_PASSPORT_DATABASE_URL, expect.objectContaining({
        ssl: { ca: "synthetic CA", rejectUnauthorized: true }, max: 2, connect_timeout: 10, idle_timeout: 20,
        connection: { statement_timeout: 15_000, lock_timeout: 2_000, application_name: "design-passport" },
      })]);
      await isolated.closeDatabases();
      expect(end).toHaveBeenCalledExactlyOnceWith({ timeout: 5 });
    } finally {
      releaseCA("synthetic CA"); await Promise.allSettled(calls); await isolated.closeDatabases();
      vi.doUnmock("postgres"); vi.doUnmock("node:fs/promises"); vi.resetModules();
    }
  });
});

describe("companion SQL repository", () => {
  beforeEach(async () => {
    harness = await createTestDatabase();
    for (const [key, value] of Object.entries(harness.env)) vi.stubEnv(key, value);
    paths = workspacePaths(await realpath(await mkdtemp(join(tmpdir(), "dp-sql-"))));
  });
  afterEach(async () => {
    vi.restoreAllMocks(); await closeDatabases(); await harness.close();
    await rm(paths.root, { recursive: true, force: true }); vi.unstubAllEnvs();
  });
  it("rolls back a plain transaction error as non-retryable invalid input", async () => {
    const sql = await database(paths.root);
    await expect(transaction(paths.root, async (tx) => {
      await tx`insert into design_passport.projects(scope) values ('project:rolled-back')`;
      throw new Error("private fixture failure");
    }, true)).rejects.toMatchObject({ code: "invalid-input", status: 422, message: "The request contains invalid data or exceeds a supported limit." });
    expect(await sql`select scope from design_passport.projects where scope = 'project:rolled-back'`).toHaveLength(0);
  });
  it("uses the restricted role and denies evidence mutation, deletion, DDL and public access", async () => {
    const sql = await database(paths.root);
    expect((await sql`select current_user`)[0]?.current_user).toBe("design_passport_test");
    // Poolers may ignore startup options or retain older backend role defaults.
    await sql`set statement_timeout = '2min'`;
    await sql`set lock_timeout = '0'`;
    const limits = await transaction(paths.root, async (tx) => (await tx`select current_setting('statement_timeout') as statement_timeout, current_setting('lock_timeout') as lock_timeout`)[0]);
    expect(limits).toEqual({ statement_timeout: "15s", lock_timeout: "2s" });
    await firstCandidate();
    for (const table of ["audits", "audit_exports", "findings", "contributions", "observations", "candidate_revisions", "decisions"]) {
      await expect(sql.unsafe(`update design_passport.${table} set payload = '{}'`)).rejects.toMatchObject({ code: "42501" });
      await expect(sql.unsafe(`delete from design_passport.${table}`)).rejects.toMatchObject({ code: "42501" });
    }
    await expect(sql`create table design_passport.forbidden(id int)`).rejects.toMatchObject({ code: "42501" });
    const rows = await sql`select relname, relrowsecurity from pg_class join pg_namespace on pg_namespace.oid = relnamespace where nspname = 'design_passport' and relkind = 'r'`;
    expect(rows).toHaveLength(20); expect(rows.every((row) => row.relrowsecurity)).toBe(true);
    expect((await sql`select has_schema_privilege('anon', 'design_passport', 'USAGE') as allowed`)[0]?.allowed).toBe(false);
    await expect(sql`update design_passport.projects set scope = 'other'`).rejects.toMatchObject({ code: "42501" });
    await closeDatabases();
    await harness.db.exec("reset role; create table public.future_grant_probe(id int); create function public.future_function_probe() returns int language sql as 'select 1'; set role design_passport_test;");
    const defaults = await (await database(paths.root))`select has_table_privilege('anon', 'public.future_grant_probe', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as table_access, has_function_privilege('anon', 'public.future_function_probe()', 'EXECUTE') as function_access`;
    expect(defaults[0]).toEqual({ table_access: false, function_access: false });
  });
  it("retains valid mixed-batch files, deduplicates retries and leaves release files untouched", async () => {
    expect(await importLearning(paths, [learning(), { name: "invalid", content: "{" }])).toMatchObject({ imported: 1, invalid: 1 });
    expect(await importLearning(paths, [learning()])).toMatchObject({ imported: 0, duplicates: 1 });
    const before = await readKnowledgeState(paths);
    expect(before.envelopes).toHaveLength(1);
    expect((await readKnowledgeState(paths)).candidates).toEqual(before.candidates);
    expect(await stat(paths.teamPack).catch(() => null)).toBeNull();
  });
  it("preserves a long audit-only scope while learning mutations and approval withdrawal succeed elsewhere", async () => {
    const scope = `project:${"a".repeat(192)}`;
    expect(scope).toHaveLength(200);
    expect(await importAudits(paths, [audit()], scope)).toMatchObject({ imported: 1 });
    const original = await firstCandidate();
    const { candidate } = await reviseCandidate(paths, { candidateId: original.candidateId, candidateDigest: original.digest,
      wording: "Use the reviewed project pattern.", proposedScope: "project", exceptions: [] });
    const decision = { candidateId: candidate.candidateId, candidateDigest: candidate.digest, scope: "project" as const, rationale: "Reviewed project evidence." };
    await recordDecision(paths, { ...decision, requestId: randomUUID(), action: "approve" });
    const sql = await database(paths.root);
    const approved = (await sql`select payload from design_passport.guidance_packs where project_scope = ${candidate.projectScope}`)[0]!.payload;
    expect(approved.facts).toHaveLength(1);
    await recordDecision(paths, { ...decision, requestId: randomUUID(), action: "defer" });
    const withdrawn = (await sql`select payload from design_passport.guidance_packs where project_scope = ${candidate.projectScope}`)[0]!.payload;
    expect(withdrawn.facts).toEqual([]);
    expect(withdrawn.source.projectScope).toBe(candidate.projectScope);
    const state = await readKnowledgeState(paths);
    expect(state.envelopes).toHaveLength(1);
    expect(state.envelopes.every((envelope) => envelope.projectScope === candidate.projectScope)).toBe(true);
    expect(state.candidates.every((item) => item.projectScope === candidate.projectScope)).toBe(true);
    expect(await sql`select scope from design_passport.projects where scope = ${scope}`).toEqual([{ scope }]);
    expect(await sql`select id from design_passport.guidance_packs where project_scope = ${scope}`).toHaveLength(0);
    const row = (await listHistory(paths, "audit", { project: scope })).rows[0]!;
    const detail = await auditDetail(paths, row.id);
    expect(detail.projectScope).toBe(scope); expect(detail.contributionIds).toEqual([]);
    expect(await auditDownload(paths, detail.exports[0]!.id)).toEqual(auditFixture());
  });
  it("preserves distinct wrappers and metadata, links within project in either order and surfaces ambiguity", async () => {
    const report = auditFixture();
    const wrapper = { kind: "historical-audit", schemaVersion: 1, freshness: "historical", target: { scope: "selection", nodeIds: ["root:desktop"] }, savedAt: "2026-09-24T12:00:00Z", provenance: { pluginVersion: "0.4", knowledgeVersion: "1" }, report };
    expect(await importAudits(paths, [audit(), { name: "saved", content: JSON.stringify(wrapper) }], "project:companion-test")).toMatchObject({ imported: 2 });
    expect(await importAudits(paths, [audit()], "project:companion-test")).toMatchObject({ duplicates: 1 });
    const rows = (await listHistory(paths, "audit")).rows;
    expect(rows).toHaveLength(1);
    expect((await auditDetail(paths, rows[0]!.id)).contributionIds).toEqual([]);
    await importLearning(paths, [learning()]);
    const detail = await auditDetail(paths, rows[0]!.id);
    expect(detail.exports).toHaveLength(2); expect(detail.report).toEqual(report); expect(detail.contributionIds).toEqual([learningFixture().digest]);
    expect(await auditDownload(paths, detail.exports.find((source) => (source.source as { kind?: string }).kind)!.id)).toEqual(wrapper);
    await importLearning(paths, [learning("base", "project:other")]);
    expect(await previewAuditProjects(paths, [audit()])).toMatchObject({ ambiguous: true, suggestedScope: null });
    expect((await learningDetail(paths, learningFixture("base", "project:other").digest)).auditIds).toEqual([]);
    await importAudits(paths, [audit()], "project:other");
    expect((await learningDetail(paths, learningFixture("base", "project:other").digest)).auditIds).toHaveLength(1);
    const changed = { ...report, generatedAt: "2026-09-25T12:00:00Z" };
    await importAudits(paths, [audit(changed)], "project:companion-test");
    expect((await learningDetail(paths, learningFixture().digest)).ambiguous).toBe(true);
    const sql = await database(paths.root);
    await expect(sql.begin(async (tx) => { await tx`insert into design_passport.audit_exports(id, project_scope, audit_id, payload_sha256, payload) values (${randomUUID()}, 'project:other', ${rows[0]!.id}, ${"0".repeat(64)}, '{}')`; })).rejects.toMatchObject({ code: "23503" });
    expect((await sql`select count(*)::int as count from design_passport.findings where project_scope = 'project:companion-test'`)[0]?.count).toBe(report.findings.length * 2);
  });
  it("rejects stale writes, replays committed decisions and revisions, and preserves edits with stale approvals", async () => {
    const original = await firstCandidate();
    const edit = { candidateId: original.candidateId, candidateDigest: original.digest, wording: "Use the reviewed project pattern.", proposedScope: "shared" as const, exceptions: ["Except in compact navigation."] };
    const saved = await reviseCandidate(paths, edit);
    expect(await reviseCandidate(paths, edit)).toEqual(saved);
    await expect(reviseCandidate(paths, { ...edit, wording: "A competing edit." })).rejects.toMatchObject({ code: "conflict" });
    const decision = { requestId: randomUUID(), candidateId: original.candidateId, candidateDigest: saved.candidate.digest, action: "approve" as const, scope: "project" as const, rationale: "Reviewed against the current library." };
    const retained = await recordDecision(paths, decision);
    expect(await recordDecision(paths, decision)).toEqual(retained);
    await expect(recordDecision(paths, { ...decision, action: "reject" })).rejects.toMatchObject({ code: "conflict" });
    await expect(recordDecision(paths, { ...decision, requestId: randomUUID(), candidateDigest: original.digest })).rejects.toMatchObject({ code: "conflict" });
    await importLearning(paths, [learning("second-audit")]);
    const state = await readKnowledgeState(paths);
    const current = state.candidates.find((item) => item.candidateId === original.candidateId)!;
    expect(current).toMatchObject({ wording: edit.wording, exceptions: edit.exceptions, proposedScope: "shared", supportCount: 2 });
    expect(reviewView(state).find((item) => item.id === current.candidateId)).toMatchObject({ status: "changed", previousDecision: { rationale: decision.rationale } });
    expect(await recordDecision(paths, decision)).toEqual(retained);
    await expect(reviseCandidate(paths, edit)).rejects.toMatchObject({ code: "conflict" });
    expect((await learningDetail(paths, learningFixture().digest)).revisions.filter((item) => item.candidateId === original.candidateId)).toHaveLength(3);
  });
  it("rolls back evidence and derivations together and retains earlier batch successes", async () => {
    // Controlled owner fixture injects a derived-write failure; runtime stays restricted.
    await harness.db.exec("reset role; alter table design_passport.guidance_packs add constraint fixture_pack_failure check (payload->>'generatedAt' <> '2026-09-24T12:00:00.000Z'); set role design_passport_test;");
    const later = { ...learningFixture("later"), generatedAt: "2026-09-24T12:00:00.000Z" };
    const retry = { name: "later.json", content: JSON.stringify(later) };
    const following = learning("after-invalid", "project:after-invalid");
    const result = await importLearning(paths, [learning(), retry, following]);
    expect(result).toMatchObject({ retryable: 0, invalid: 1, imported: 2, files: [{ status: "imported" }, { name: "later.json", status: "invalid" }, { status: "imported" }] });
    expect(result.files[1]!.message).not.toContain("fixture_pack_failure");
    const retained = await readKnowledgeState(paths);
    expect(retained.envelopes.map((envelope) => envelope.digest).sort()).toEqual([learningFixture().digest, learningFixture("after-invalid", "project:after-invalid").digest].sort());
    expect(retained.candidates.every((candidate) => candidate.supportCount === 1)).toBe(true);
    const sql = await database(paths.root);
    expect(await sql`select id from design_passport.contributions where id = ${later.digest}`).toHaveLength(0);
    expect(await sql`select contribution_id from design_passport.observations where contribution_id = ${later.digest}`).toHaveLength(0);
    expect((await sql`select payload from design_passport.candidate_revisions`).every((row) => row.payload.supportCount === 1)).toBe(true);
    await closeDatabases(); await harness.db.exec("reset role; alter table design_passport.guidance_packs drop constraint fixture_pack_failure; set role design_passport_test;");
    expect(await importLearning(paths, [learning(), retry])).toMatchObject({ imported: 1, duplicates: 1 });
    expect((await readKnowledgeState(paths)).envelopes).toHaveLength(3);
  });
  it("filters history with stable cursors and validates historical and v1-v3 audit contracts", async () => {
    const base = auditFixture();
    const old = { ...base }; delete old.producer; delete old.issueGroups;
    const v1 = { ...old, schemaVersion: 1 as const, findings: old.findings.map(({ category: _category, ...finding }) => finding) };
    assertAudit(v1); assertAudit({ ...base, schemaVersion: 2 }); assertAudit(base);
    expect(() => assertAudit({ schemaVersion: 1, kind: "historical-audit", freshness: "current", report: base })).toThrow();
    const second = { ...base, generatedAt: "2026-09-24T12:00:00Z" };
    await importAudits(paths, [audit(base), audit(second)], "project:companion-test");
    const first = await listHistory(paths, "audit", { limit: 1, project: "project:companion-test", rule: base.findings[0]!.ruleId, status: base.findings[0]!.status, grade: base.grade.letter });
    expect(first.rows).toHaveLength(1); expect(first.nextCursor).toBeTruthy();
    const next = await listHistory(paths, "audit", { limit: 1, cursor: first.nextCursor! });
    expect(next.rows).toHaveLength(1); expect(next.rows[0]!.id).not.toBe(first.rows[0]!.id);
    expect((await listHistory(paths, "audit", { project: "project:no-match" })).rows).toEqual([]);
    expect((await listHistory(paths, "audit", { from: "2026-09-24", to: "2026-09-24" })).rows).toHaveLength(1);
    await importLearning(paths, [learning()]);
    expect((await listHistory(paths, "learning", { status: "awaiting" })).rows).toHaveLength(1);
    expect((await listHistory(paths, "audit", { q: base.frames[0]!.rootName.split(" ")[0]! })).rows.length).toBeGreaterThan(0);
    await expect(listHistory(paths, "audit", { cursor: "invalid" })).rejects.toMatchObject({ code: "invalid-input" });
  });
  it("round-trips a completed backup, preserves database-only history, and repairs explicit release exports", async () => {
    const candidate = await firstCandidate();
    await recordDecision(paths, { requestId: randomUUID(), candidateId: candidate.candidateId, candidateDigest: candidate.digest, action: "approve", scope: "project", rationale: "Reviewed." });
    await importAudits(paths, [audit()], "project:companion-test");
    const before = await readKnowledgeState(paths);
    const out = await exportKnowledge(paths, join(paths.root, "backup"));
    await verifyKnowledgeExport(out);
    const compatible = workspacePaths(out);
    const time = (await stat(compatible.candidates)).mtimeMs;
    expect(await readFilesystemKnowledgeState(compatible)).toEqual(before);
    expect((await stat(compatible.candidates)).mtimeMs).toBe(time);
    expect((await listFilesystemProjectGuidancePacks(compatible))[0]?.facts.length).toBeGreaterThan(0);
    const history = JSON.parse(await readFile(join(out, "database-history.v1.json"), "utf8"));
    expect(history.tables.candidate_revisions.length).toBeGreaterThan(0); expect(history.tables.audit_exports).toHaveLength(1);
    await expect(exportKnowledge(paths, out)).rejects.toMatchObject({ code: "invalid-input" });
    await exportRelease(paths);
    expect(await readFile(paths.teamPack, "utf8")).toBe(await readFile(paths.bundledTeamPack, "utf8"));
    const releaseBefore = await readFile(paths.teamPack, "utf8");
    await importLearning(paths, [learning("new-release-evidence")]);
    expect(await readFile(paths.teamPack, "utf8")).toBe(releaseBefore);
    expect(await readFile(paths.bundledTeamPack, "utf8")).toBe(releaseBefore);
    const write = filesystem.atomicWriteJson;
    vi.spyOn(filesystem, "atomicWriteJson").mockImplementation(async (p, dest, value) => {
      if (dest === paths.bundledTeamPack) throw new Error("fixture interrupted release");
      return write(p, dest, value);
    });
    await expect(exportRelease(paths)).rejects.toThrow("fixture interrupted release");
    vi.restoreAllMocks();
    await exportRelease(paths);
    expect(await readFile(paths.teamPack, "utf8")).toBe(await readFile(paths.bundledTeamPack, "utf8"));
  });
  it("retains interrupted backups without a completion manifest and rejects symlinks and export contention", async () => {
    await firstCandidate();
    const original = filesystem.atomicWriteJson;
    vi.spyOn(filesystem, "atomicWriteJson").mockImplementation(async (p, dest, value) => { if (dest.endsWith("database-history.v1.json")) throw new Error("fixture interrupted export"); return original(p, dest, value); });
    const incomplete = join(paths.root, "incomplete");
    await expect(exportKnowledge(paths, incomplete)).rejects.toThrow("fixture interrupted");
    await expect(verifyKnowledgeExport(incomplete)).rejects.toMatchObject({ code: "invalid-input" });
    expect(await stat(join(incomplete, "completion-manifest.v1.json")).catch(() => null)).toBeNull();
    vi.restoreAllMocks();
    await exportKnowledge(paths, join(paths.root, "retry"));
    await mkdir(join(paths.root, "outside")); await symlink(join(paths.root, "outside"), join(paths.root, "link"));
    await expect(exportKnowledge(paths, join(paths.root, "link", "backup"))).rejects.toMatchObject({ code: "invalid-input" });
    await mkdir(join(paths.root, "src")); await symlink(join(paths.root, "outside"), join(paths.root, "src", "generated"));
    await expect(exportRelease(paths)).rejects.toMatchObject({ code: "invalid-input" });
    expect(await stat(join(paths.root, "outside", "team-knowledge.pack.json")).catch(() => null)).toBeNull();
    await withWorkspaceWrite(paths, async () => { await expect(exportRelease(paths)).rejects.toMatchObject({ code: "busy" }); });
    await expect(filesystem.atomicWriteJson(paths, join(paths.root, "..", "escaped.json"), {})).rejects.toMatchObject({ code: "invalid-input" });
  });
  it("enforces streamed byte limits without trusting content length and measures representative file-scope sizing", async () => {
    const request = (header?: string) => new Request("http://localhost", { method: "POST", headers: header ? { "content-length": header } : {}, body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(50)); controller.enqueue(new Uint8Array(51)); controller.close(); } }), duplex: "half" } as RequestInit);
    await expect(boundedBody(request(), 100)).rejects.toMatchObject({ status: 413 });
    await expect(boundedBody(request("1"), 100)).rejects.toMatchObject({ status: 413 });
    const form = new FormData(); form.append("files", new File([new Uint8Array(1_000_001)], "large"));
    await expect(multipartInputs(new Request("http://localhost", { method: "POST", body: form }), "learning")).rejects.toMatchObject({ status: 413 });
    const report = fileScopeFixture();
    const content = JSON.stringify(report); assertContract("readiness-report", JSON.parse(content));
    expect(report.frames).toHaveLength(100); expect(Buffer.byteLength(content)).toBeLessThan(10_000_000);
    await filesystem.atomicWriteExternalJson(join(paths.root, "oversize.json"), "x".repeat(1_000_000));
    await expect(readImportFiles([join(paths.root, "oversize.json")], "learning")).rejects.toMatchObject({ status: 413 });
  });
});
