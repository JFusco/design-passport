import {it,expect} from "vitest";


import {readFileSync} from "node:fs";
import {assertAudit,sha256,validateInputSizes} from "../src/companion/imports";
import {assertLearningEnvelope,buildKnowledgeDecision,compileTeamKnowledgePack,generateCandidateDrafts,reportIdentityDigest} from "../src/core/knowledge-loop";
import type {ReviewLearningEnvelopeV1} from "../src/core/contracts";
const read=(path:string)=>readFileSync(new URL(path,import.meta.url));
it("runs pinned shared audit, historical, sanitized learning, size and team pack fixtures",()=>{
  const audit=JSON.parse(read("./e2e/fixtures/valid-audit.json").toString());
  const report=assertAudit(audit).report;
  const historic={schemaVersion:1,kind:"historical-audit",freshness:"historical",target:{scope:"selection",nodeIds:report.target.rootIds},provenance:{pluginVersion:"golden",knowledgeVersion:"1"},report};
  expect(sha256(assertAudit(historic).report)).toBe("c17f388302a33c195d688b0c03eeb23f8240d9a5b4e48a819f2cee37ca5fb6c5");
  expect(reportIdentityDigest(report)).toBe("h53:1535ebadb894f8");
  expect(()=>assertAudit({...historic,target:{scope:"file"}})).toThrow();
  const e=JSON.parse(read("./e2e/fixtures/valid-learning.json").toString()) as ReviewLearningEnvelopeV1;
  assertLearningEnvelope(e);expect(()=>assertLearningEnvelope({...e,digest:"h53:00000000000000"})).toThrow();
  expect(()=>validateInputSizes([{name:"test",content:"x".repeat(1_000_001)}],"learning")).toThrow();
  const now=new Date(0),c=generateCandidateDrafts([e],now);
  const decision=buildKnowledgeDecision({decisionId:"decision:golden",candidateId:c[0]!.candidateId,candidateDigest:c[0]!.digest,action:"approve",scope:"shared",rationale:"Approved neutral wording."},now);
  expect(compileTeamKnowledgePack({knowledgeVersion:"1.0.0",candidates:c,decisions:[decision],now}).digest).toBe("h53:058fec69872a48");
});
