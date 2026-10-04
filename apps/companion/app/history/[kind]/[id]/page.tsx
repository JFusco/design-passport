import { databasePage } from "@/lib/server/database-page";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auditDetail, learningDetail } from "../../../../../../src/companion/repository";
import { requirePageAccess } from "@/lib/server/runtime";
export const dynamic = "force-dynamic";
export default async function HistoryDetailPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const paths = await requirePageAccess();
  return databasePage(async () => {
  const { kind, id: routeId } = await params;
  if (kind !== "audit" && kind !== "learning") notFound();
  let id: string;
  try { id = decodeURIComponent(routeId); } catch { notFound(); }
  if (kind === "audit") {
    const audit = await auditDetail(paths, id);
    return <main id="main-content" className="page"><Link href="/history/audit">Audit history</Link>
      <header className="page-heading"><h1>Recorded audit</h1><p>{audit.projectScope} · Grade {audit.report.grade.letter} · {audit.report.ready ? "Ready" : "Needs work"}</p>
        <p>Source: <time>{audit.report.generatedAt}</time> · Received: <time>{audit.receivedAt}</time></p><p>Historical evidence does not verify the current Figma design.</p></header>
      <section className="form-card"><h2>Original exports and provenance</h2><ul>{audit.exports.map((source) => {
        const value = source.source as Record<string, unknown>;
        return <li key={source.id}><a className="button" href={`/api/audits/download/${source.id}`} download>Download original {value.kind ? "historical" : "report"} export</a>
          <p>Received {source.receivedAt}</p><details><summary>Provenance and target</summary><pre>{JSON.stringify({ sha256: source.sha256, savedAt: value.savedAt, freshness: value.freshness, target: value.target, provenance: value.provenance }, null, 2)}</pre></details></li>;
      })}</ul></section>
      <section className="form-card"><h2>Linked learning contributions</h2>{audit.ambiguous ? <p>Multiple contributions share this semantic report identity. No unique assignment is inferred.</p> : null}
        {audit.contributionIds.length ? <ul>{audit.contributionIds.map((contribution) => <li key={contribution}><Link href={`/history/learning/${encodeURIComponent(contribution)}`}>{contribution}</Link></li>)}</ul> : <p>No matching contribution has been imported in this project.</p>}</section>
      <section className="form-card"><h2>Findings</h2><ul className="history-findings">{audit.report.findings.map((finding) => <li key={finding.id}><h3>{finding.title}</h3><p>{finding.ruleId} · {finding.status} · {finding.nodePath}</p><p>{finding.message}</p>
        <details><summary>Recorded finding evidence</summary><pre>{JSON.stringify(finding, null, 2)}</pre></details></li>)}</ul></section>
    </main>;
  }
  const learning = await learningDetail(paths, id);
  return <main id="main-content" className="page"><Link href="/history/learning">Learning history</Link>
    <header className="page-heading"><h1>Learning contribution</h1><p>{learning.envelope.projectScope}</p><p>Source: {learning.envelope.generatedAt} · Received: {learning.receivedAt}</p></header>
    <section className="form-card"><h2>Producer provenance</h2><pre>{JSON.stringify(learning.envelope.producer, null, 2)}</pre></section>
    <section className="form-card"><h2>Linked audits</h2>{learning.ambiguous ? <p>Multiple reports share this semantic identity. Inspect each recorded audit; no unique assignment is inferred.</p> : null}
      {learning.auditIds.length ? <ul>{learning.auditIds.map((audit) => <li key={audit}><Link href={`/history/audit/${audit}`}>{audit}</Link></li>)}</ul> : <p>No matching audit has been imported in this project.</p>}</section>
    <section className="form-card"><h2>Observations</h2><ul>{learning.envelope.observations.map((observation, index) => <li key={index}>{observation.ruleId ?? observation.context} · {observation.direction} · {observation.count} occurrences</li>)}</ul></section>
    <section className="form-card"><h2>Candidate revisions</h2><ul className="history-findings">{learning.revisions.map((candidate) => <li key={`${candidate.candidateId}:${candidate.digest}`}><p>{candidate.generatedAt} · {candidate.digest}</p><p>{candidate.wording}</p><p>{candidate.exceptions.join("; ")}</p><Link href={`/review?candidate=${encodeURIComponent(candidate.candidateId)}`}>Review current candidate</Link></li>)}</ul></section>
    <section className="form-card"><h2>Decisions</h2>{learning.decisions.length ? <ul>{learning.decisions.map((decision) => <li key={decision.decisionId}>{decision.decidedAt} · {decision.action} · {decision.scope}<p>{decision.rationale}</p><small>Candidate revision {decision.candidateDigest}</small></li>)}</ul> : <p>No human decision has been recorded.</p>}</section>
  </main>;
  });
}
