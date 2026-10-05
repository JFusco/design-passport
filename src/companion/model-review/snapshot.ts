import type { TransactionSql } from "postgres";
import type {
  DesignReferencePackV1,
  Finding,
  KnowledgeCandidateV1,
  KnowledgeDecisionV1,
  ReadinessReport,
} from "../../core/contracts";
import { stateIn } from "../repository";
import {
  assertSafe,
  conflict,
  digest,
  invalid,
  POLICY,
  projection,
  PROMPT_VERSION,
  RESERVATION,
  SCHEMA_VERSION,
  prose,
  validateProjection,
} from "./policy";
import type { CandidateRevision, FrozenReview, Snapshot } from "./contracts";
export function currentDecision(
  candidate: KnowledgeCandidateV1,
  decisions: KnowledgeDecisionV1[],
): KnowledgeDecisionV1 | undefined {
  return decisions
    .filter((d) => d.candidateId === candidate.candidateId)
    .at(-1);
}
export async function context(
  sql: TransactionSql,
  project: string,
  selection: CandidateRevision[],
): Promise<string> {
  const state = await stateIn(sql);
  const guide = (
    await sql`select active_guide from design_passport.model_settings where project_scope = ${project}`
  )[0];
  const latest = (c: KnowledgeCandidateV1) =>
    currentDecision(c, state.decisions);
  return digest({
    selected: selection
      .map((pair) => {
        const c = state.candidates.find(
          (c) =>
            c.projectScope === project && c.candidateId === pair.candidateId,
        );
        return {
          id: pair.candidateId,
          digest: c?.digest ?? null,
          decision: c ? (latest(c)?.decisionId ?? null) : null,
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id)),
    approved: state.candidates
      .filter(
        (c) =>
          c.projectScope === project &&
          latest(c)?.action === "approve" &&
          latest(c)?.scope === "project" &&
          latest(c)?.candidateDigest === c.digest,
      )
      .map((c) => ({
        id: c.candidateId,
        digest: c.digest,
        decision: latest(c)!.decisionId,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    shared: state.teamPack.entries,
    guide: guide?.active_guide ?? null,
  });
}
const METRICS = new Set([
  "acknowledged",
  "activeTextNodeCount",
  "actual",
  "aliasEvidenceCount",
  "aliasedSemanticCount",
  "annotationSupported",
  "availableCollectionCount",
  "belowPreferredCount",
  "bindingParity",
  "cancelled",
  "candidateCount",
  "childCount",
  "clippedContainerCount",
  "completeMetadataCount",
  "componentCount",
  "configuredWidths",
  "containerCount",
  "contentSignaturesMatch",
  "coverage",
  "defaultCount",
  "detachedCount",
  "devResourceCount",
  "duplicateCount",
  "emptyNonInteractive",
  "expected",
  "exportedCount",
  "familyMemberCount",
  "fontSize",
  "fontWeight",
  "fullEvidenceCount",
  "hasAnnotations",
  "height",
  "inactiveInteractiveCount",
  "inactiveTextNodeCount",
  "instanceCount",
  "interactiveCount",
  "invalidNameCount",
  "isScreen",
  "loadedPageCount",
  "metadataCoverage",
  "minimum",
  "missing",
  "nodeCount",
  "occurrenceCount",
  "pageCount",
  "percentage",
  "propertyCount",
  "ratio",
  "resolved",
  "reviewCount",
  "selectedCollectionCount",
  "semanticCount",
  "semanticCoverage",
  "semanticVariableCount",
  "sizedWithoutPointerEvidenceCount",
  "spacingExceptionCount",
  "summaryEvidenceCount",
  "textNodeCount",
  "threshold",
  "thresholdUnresolved",
  "tokenCoverage",
  "tokenEligibleCount",
  "tolerancePx",
  "undersizedCount",
  "undescribedCount",
  "unresolved",
  "variableCount",
  "visible",
  "width",
  "widths",
  "withoutAutoLayoutCount",
  "count",
  "contrast",
  "score",
  "confidence",
  "enabled",
  "matches",
  "bound",
  "spacing",
  "gap",
  "padding",
  "radius",
  "size",
  "observed",
  "difference",
  "tolerance",
]);
export function aggregate(
  findings: Finding[],
  add: (
    kind: string,
    id: string,
    payload: Record<string, unknown>,
    ids?: string[],
  ) => string,
  audit: string,
  auditRef?: string,
): void {
  const groups = new Map<string, Finding[]>();
  for (const f of [...findings].sort((a, b) => a.id.localeCompare(b.id))) {
    const key = JSON.stringify([f.ruleId, f.status, f.severity]);
    const group = groups.get(key) ?? [];
    group.push(f);
    groups.set(key, group);
  }
  for (const [key, group] of [...groups].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const numbers: Record<string, { count: number; min: number; max: number }> =
        {},
      booleans: Record<string, { true: number; false: number }> = {};
    // Measurement keys are allowlisted to primitive metric names, never identifiers or paths.
    for (const f of group)
      for (const [name, value] of Object.entries(f.evidence.measured)) {
        if (!METRICS.has(name)) continue;
        for (const metric of Array.isArray(value) ? value : [value]) {
          if (typeof metric === "number" && Number.isFinite(metric)) {
            const n = numbers[name] ?? { count: 0, min: metric, max: metric };
            n.count++;
            n.min = Math.min(n.min, metric);
            n.max = Math.max(n.max, metric);
            numbers[name] = n;
          }
          if (typeof metric === "boolean") {
            const n = booleans[name] ?? { true: 0, false: 0 };
            n[metric ? "true" : "false"]++;
            booleans[name] = n;
          }
        }
      }
    const samples = group.slice(0, 3).map((f) =>
      add(
        "finding",
        audit,
        {
          rule: prose(f.ruleId),
          status: f.status,
          severity: f.severity,
          title: prose(f.title),
          message: prose(f.message),
          summary: prose(f.evidence.summary),
        },
        [f.id],
      ),
    );
    const f = group[0]!;
    add(
      "aggregate",
      `${audit}:${key}`,
      {
        ...(auditRef ? { auditRef } : {}),
        rule: prose(f.ruleId),
        status: f.status,
        severity: f.severity,
        representedCount: group.length,
        sampledCount: samples.length,
        numbers,
        booleans,
        samples,
      },
      group.map((f) => f.id),
    );
  }
}
export async function buildSnapshot(
  sql: TransactionSql,
  project: string,
  selection: CandidateRevision[],
): Promise<FrozenReview> {
  if (
    !Array.isArray(selection) ||
    selection.length < 1 ||
    selection.length > 8 ||
    new Set(selection.map((s) => s.candidateId)).size !== selection.length
  )
    invalid("Select 1–8 distinct candidates. Narrow larger selections.");
  const state = await stateIn(sql);
  const candidates = selection.map((pair) => {
    const c = state.candidates.find(
      (c) =>
        c.projectScope === project &&
        c.candidateId === pair.candidateId &&
        c.digest === pair.digest,
    );
    if (!c) conflict();
    const decision = currentDecision(c, state.decisions);
    if (
      decision?.action === "approve" &&
      decision.scope === "shared" &&
      decision.candidateDigest === c.digest
    )
      invalid("Current shared approvals are context only.");
    return c;
  });
  const evidence: Snapshot["evidence"] = [],
    mappings: FrozenReview["mappings"] = {};
  const add = (
    kind: string,
    id: string,
    payload: Record<string, unknown>,
    findingIds?: string[],
  ) => {
    const ref = `e_${digest({ kind, id, payload }).slice(0, 24)}`;
    evidence.push({ ref, kind, ...payload });
    mappings[ref] = { kind, id, ...(findingIds ? { findingIds } : {}) };
    return ref;
  };
  const selected = candidates.map((c) => ({
    candidateId: c.candidateId,
    digest: c.digest,
    wording: prose(c.wording),
    exceptions: c.exceptions.map(prose),
    ref: add("candidate", c.candidateId, {
      context: prose(c.context),
      sourceRoles: c.sourceRoles,
      generatedAt: c.generatedAt,
      supportCount: c.supportCount,
      contradictCount: c.contradictCount,
      distinctReportCount: new Set(
        state.envelopes
          .filter(
            (e) =>
              e.projectScope === project &&
              e.observations.some((o) => o.observationKey === c.observationKey),
          )
          .map((e) => e.reportDigest),
      ).size,
    }),
  }));
  for (const c of state.candidates.filter((c) => c.projectScope === project)) {
    const d = currentDecision(c, state.decisions);
    if (
      d?.action === "approve" &&
      d.scope === "project" &&
      d.candidateDigest === c.digest
    )
      add("approved-project", c.candidateId, {
        wording: prose(c.wording),
        exceptions: c.exceptions.map(prose),
        decisionRef: add("decision", d.decisionId, {
          action: d.action,
          rationale: prose(d.rationale),
          decidedAt: d.decidedAt,
        }),
        provenance: "approved-project",
      });
  }
  for (const entry of state.teamPack.entries)
    add("shared", entry.candidateId, {
      wording: prose(entry.wording),
      exceptions: (entry.exceptions ?? []).map(prose),
      provenance: "shared",
    });
  const ids = candidates.map((c) => c.candidateId);
  for (const row of await sql`select payload from design_passport.candidate_revisions where project_scope = ${project} and candidate_id in ${sql(ids)} order by candidate_id, source_at, digest`) {
    const c = row.payload as KnowledgeCandidateV1;
    add("revision", `${c.candidateId}:${c.digest}`, {
      candidateId: c.candidateId,
      digest: c.digest,
      wording: prose(c.wording),
      exceptions: c.exceptions.map(prose),
      generatedAt: c.generatedAt,
    });
  }
  for (const d of state.decisions.filter((d) => ids.includes(d.candidateId)))
    add("decision", d.decisionId, {
      candidateId: d.candidateId,
      candidateDigest: d.candidateDigest,
      action: d.action,
      scope: d.scope,
      rationale: prose(d.rationale),
      decidedAt: d.decidedAt,
    });
  const relevant = state.envelopes.filter(
    (e) =>
      e.projectScope === project &&
      e.observations.some((o) =>
        candidates.some((c) => c.observationKey === o.observationKey),
      ),
  );
  const reportRefs = new Map<string, string>();
  for (const identity of [
    ...new Set(relevant.map((e) => e.reportDigest)),
  ].sort())
    reportRefs.set(
      identity,
      add("semantic-report", identity, { recurrence: "one semantic report" }),
    );
  for (const envelope of relevant) {
    for (const [index, o] of envelope.observations.entries())
      if (candidates.some((c) => c.observationKey === o.observationKey))
        add("observation", `${envelope.digest}:${index}`, {
          semanticReport: reportRefs.get(envelope.reportDigest),
          kind: o.kind,
          context: prose(o.context),
          direction: o.direction,
          rule: o.ruleId ? prose(o.ruleId) : null,
          label: o.canonicalLabel ? prose(o.canonicalLabel) : null,
          count: o.count,
          producer: envelope.producer,
          observedAt: envelope.generatedAt,
        });
  }
  const rules = [
    ...new Set(
      relevant.flatMap((e) =>
        e.observations
          .filter((o) =>
            candidates.some((c) => c.observationKey === o.observationKey),
          )
          .flatMap((o) => (o.ruleId ? [o.ruleId] : [])),
      ),
    ),
  ];
  if (reportRefs.size && rules.length)
    for (const row of await sql`select id, report_identity_digest, payload from design_passport.audits where project_scope = ${project} and report_identity_digest in ${sql([...reportRefs.keys()])} order by id`) {
      const report = row.payload as ReadinessReport;
      const auditRef = add("audit", row.id, {
        semanticReport: reportRefs.get(row.report_identity_digest),
        producer: report.producer ?? null,
        rulesetVersion: report.rulesetVersion,
        catalogVersion: report.catalogVersion,
        generatedAt: report.generatedAt,
      });
      aggregate(
        report.findings.filter((f) => rules.includes(f.ruleId)),
        add,
        row.id,
        auditRef,
      );
    }
  const settings = (
    await sql`select active_guide from design_passport.model_settings where project_scope = ${project}`
  )[0];
  const guideVersion = settings?.active_guide as string | undefined;
  const authoritativeRefs: string[] = [];
  if (guideVersion) {
    const guide = (
      await sql`select payload from design_passport.model_guides where project_scope = ${project} and id = ${guideVersion}`
    )[0]!.payload as DesignReferencePackV1;
    const guideRef = add("guide", guideVersion, {
      packVersion: guide.packVersion,
      generatedAt: guide.generatedAt,
      complete: guide.source.completeness.complete,
      availableDomains: guide.source.completeness.availableDomains,
      warnings: guide.source.completeness.warnings.map(prose),
    });
    for (const f of guide.facts) {
      const ref = add("guide-fact", `${guideVersion}:${f.factId}`, {
        guideRef,
        domain: f.domain,
        label: prose(f.label),
        guidance: prose(f.guidance),
        exceptions: (f.exceptions ?? []).map(prose),
        matcher: f.matcher,
        provenance: f.provenance,
      });
      if (f.provenance === "figma-derived") authoritativeRefs.push(ref);
    }
  }
  const snapshot: Snapshot = {
    version: 1,
    candidates: selected,
    evidence,
    currentness:
      "Current rule applicability and retirement are unknown unless explicitly established by supplied guide or decision evidence. Versions alone are historical evidence.",
    authoritativeRefs,
  };
  assertSafe(snapshot);
  const shared = projection(snapshot);
  validateProjection(shared);
  const preview = {
    project,
    selection: [...selection].sort((a, b) =>
      a.candidateId.localeCompare(b.candidateId),
    ),
    snapshot,
    snapshotSha256: digest(snapshot),
    contextDigest: await context(sql, project, selection),
    projection: shared,
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    pricePolicy: POLICY,
    reservation: RESERVATION,
    omissions: [
      "Raw reports",
      "Node identifiers and paths",
      "URLs and emails",
      "Source references",
      "Waiver metadata",
      "Credentials",
    ],
    guideVersion: guideVersion ?? null,
  };
  return { ...preview, digest: digest(preview), mappings };
}
