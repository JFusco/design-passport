import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it, vi } from "vitest";
import { closeDatabases, legacyProviderDispatch, legacyWorkerEnabled } from "../src/companion/database";
import { captureMigration } from "../src/companion/migration";
import { importLearning, readKnowledgeState, recordDecision, workspacePaths } from "../src/companion/repository";
import { createTestDatabase } from "./helpers/companion-database.mjs";
import { learningFixture } from "./helpers/companion-fixtures";

it("captures independent legacy history and holds on both sides of the writer fence", async () => {
  const harness = await createTestDatabase();
  const root = await realpath(await mkdtemp(join(tmpdir(),"dp-migration-")));
  const paths = workspacePaths(root);
  const project = "project:migration";
  try {
    for (const [key,value] of Object.entries(harness.env)) vi.stubEnv(key,value);
    await importLearning(paths,[{name:"learning.json",content:JSON.stringify(learningFixture("migration",project))}]);
    const candidate = (await readKnowledgeState(paths)).candidates[0]!;
    await recordDecision(paths,{requestId:randomUUID(),candidateId:candidate.candidateId,candidateDigest:candidate.digest,
      action:"approve",scope:"project",rationale:"Synthetic project decision"});
    const run = randomUUID(), attempt = randomUUID();
    await harness.db.query("insert into design_passport.model_runs(id,project_scope,request_material,request_digest,frozen,reservation,outcome) values($1,$2,'{}','digest','{}',0.123456789012,'running')",[run,project]);
    await harness.db.query("insert into design_passport.model_accounting(id,project_scope,run_id,version,status,evidence) values($1,$2,$3,1,'reserved','{}')",[randomUUID(),project,run]);
    await harness.db.query("insert into design_passport.model_attempts(id,project_scope,run_id,dispatched_at,lease_generation,input_tokens) values($1,$2,$3,now(),1,120)",[attempt,project,run]);
    const rehearsal = await captureMigration(root,join(root,"rehearsal"));
    expect(rehearsal.fenced).toBe(false);
    expect(await legacyWorkerEnabled(root)).toBe(true);
    const generate = vi.fn(async()=>"provider-result");
    await expect(legacyProviderDispatch(root,generate)).resolves.toBe("provider-result");
    await harness.db.exec("reset role");
    await harness.db.exec(await readFile(new URL("../scripts/migration/fence-companion.sql",import.meta.url),"utf8"));
    await harness.db.exec("set role design_passport_test");
    await expect(legacyProviderDispatch(root,generate)).rejects.toMatchObject({status:409});
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await legacyWorkerEnabled(root)).toBe(false);
    await expect(harness.db.query("update design_passport.candidates set digest=digest")).rejects.toThrow();
    const final = await captureMigration(root,join(root,"final"));
    expect(final.fenced).toBe(true);
    const inventory = await readFile(join(final.path,"source-inventory.json"));
    expect(createHash("sha256").update(inventory).digest("hex")).toBe(final.inventorySha256);
    const witness = JSON.parse(inventory.toString());
    expect(witness.ledger).toEqual([{scope:project,allowance:"0.000000000000",spent:"0.000000000000",held:"0.123456789012",runs:1}]);
    const rows = (await readFile(join(final.path,"history.ndjson"),"utf8")).trim().split("\n").map(line=>JSON.parse(line));
    for (const table of witness.tables) {
      expect(rows.filter(row=>row.table===table.table).map(row=>createHash("sha256").update(row.document).digest("hex")).sort())
        .toEqual(table.rows.map((row:{sha256:string})=>row.sha256).sort());
    }
    expect(rows.some(row=>row.table==="model_attempts" && JSON.parse(row.document).id===attempt)).toBe(true);
    expect(rows.some(row=>row.table==="candidate_revisions")).toBe(true);
    expect(rows.some(row=>row.table==="decisions")).toBe(true);
  } finally {
    await closeDatabases(); await harness.close(); await rm(root,{recursive:true,force:true}); vi.unstubAllEnvs();
  }
});
