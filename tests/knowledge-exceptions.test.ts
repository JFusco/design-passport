import { describe, expect, it } from "vitest";
import { assertReferencePack, assertTeamKnowledgePack, buildKnowledgeDecision, buildKnowledgeInsights, buildLearningEnvelope, buildReferencePack, compileTeamKnowledgePack, generateCandidateDrafts, projectGuidanceFact, reviseKnowledgeCandidate } from "../src/core/knowledge-loop";
import { buildReadinessReport as readinessReport } from "../src/core/report";
import { hashValue } from "../src/core/stable";
import { healthyGraph, profile } from "./fixtures";

function draft() {
  const p=profile(); const graph=healthyGraph(p);
  const report=readinessReport({graph,profile:p,scope:"selection",targetRootIds:["root:desktop"],now:new Date("2026-09-14T12:00:00Z")});
  return generateCandidateDrafts([buildLearningEnvelope({projectScope:"project:qa",report,pluginVersion:"qa",knowledgeVersion:"1"})])[0]!;
}

function projectPack(candidate: ReturnType<typeof draft>) {
  return buildReferencePack({packVersion:"1", source:{schemaVersion:1,sourceId:"source:qa",projectScope:candidate.projectScope,role:"style-guide",contentDigest:hashValue(candidate.digest),completeness:{complete:true,availableDomains:["layout"],warnings:[]}},facts:[projectGuidanceFact(candidate)]});
}

describe("approved guidance applicability round trip", () => {
  it("preserves maintainer caveats in project and shared packs and visible insights", () => {
    const candidate=reviseKnowledgeCandidate(draft(),{wording:"Use the documented project pattern.",proposedScope:"project",exceptions:["Review semantic overrides.","Exclude disabled controls."]});
    const decision=buildKnowledgeDecision({decisionId:"decision:qa",candidateId:candidate.candidateId,candidateDigest:candidate.digest,action:"approve",scope:"shared",rationale:"Controlled QA approval."});
    const project=projectPack(candidate);
    const shared=compileTeamKnowledgePack({knowledgeVersion:"1",candidates:[candidate],decisions:[decision]});
    expect(project.facts[0]).toMatchObject({exceptions:candidate.exceptions});
    expect(shared.entries[0]).toMatchObject({exceptions:candidate.exceptions});
    expect(()=>assertReferencePack(JSON.parse(JSON.stringify(project)))).not.toThrow();
    expect(()=>assertTeamKnowledgePack(JSON.parse(JSON.stringify(shared)))).not.toThrow();
    const insights=buildKnowledgeInsights({graph:healthyGraph(),targetRootIds:["root:desktop"],projectPack:project,teamPack:shared});
    expect(insights.map(insight=>insight.origin).sort()).toEqual(["project","shared"]);
    for (const insight of insights) {
      expect(insight.message).toContain("Exceptions:");
      for (const exception of candidate.exceptions) expect(insight.message).toContain(exception);
    }
  });

  it("round-trips every valid candidate wording length into project guidance", () => {
    const candidate=reviseKnowledgeCandidate(draft(),{wording:"a".repeat(1000),proposedScope:"project",exceptions:[]});
    expect(()=>projectPack(candidate)).not.toThrow();
  });

  it("keeps existing no-exception pack material unchanged and detects modified caveats", () => {
    const candidate=draft();const pack=projectPack(candidate);const original=structuredClone(pack);
    expect(pack.facts[0]).not.toHaveProperty("exceptions");
    expect(()=>assertReferencePack(pack)).not.toThrow();
    expect(pack).toEqual(original);
    pack.facts[0]!.exceptions=["Unapproved caveat."];
    expect(()=>assertReferencePack(pack)).toThrow(/digest/i);
  });
});
