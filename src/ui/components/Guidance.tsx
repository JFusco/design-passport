import type { KnowledgeInsight, ReviewLearningEnvelopeV1 } from "../../core/contracts";
import type { ProjectStyleGuideStatus } from "../../figma/adapter";
import { formatDateTime, friendlyReference, humanizeIdentifier } from "../operations/presentation";

export interface GuidanceProps {
  insights: KnowledgeInsight[];
  hasReport: boolean;
  contribution: { envelope: ReviewLearningEnvelopeV1; content: string } | undefined;
  projectStyleGuide: ProjectStyleGuideStatus;
  onNavigate: (nodeId: string) => void;
  onPreviewContribution: () => void;
  onExportContribution: (digest: string) => void;
  onCancelContribution: () => void;
}

function originLabel(origin: KnowledgeInsight["origin"]): string {
  if (origin === "project") return "Project guidance";
  if (origin === "reference") return "Reference suggestion";
  return "Shared guidance";
}

export function Guidance(props: GuidanceProps) {
  const contributionSummary = props.contribution ? summarizeContribution(props.contribution.envelope) : [];
  return (
    <section className="panel stack">
      <div>
        <span className="section-label">Advisory knowledge</span>
        <h2>Guidance, separate from the grade</h2>
        <p className="fine-print">These suggestions never change Passport findings, scores, readiness, or certification.</p>
      </div>
      {props.projectStyleGuide.state === "active" ? <div className="binding-card"><strong>{props.projectStyleGuide.persistent ? "Active project pack" : "Session project pack"} · v{props.projectStyleGuide.packVersion}</strong><span>Pack reference {friendlyReference(props.projectStyleGuide.digest)}</span></div> : null}
      {!props.hasReport ? <div className="empty-state compact">Run an audit to evaluate project, reference, and shared guidance.</div> : null}
      {props.hasReport && props.insights.length === 0 ? <div className="empty-state compact">No advisory guidance matched this review.</div> : null}
      {props.insights.map((insight) => (
        <article className={`guidance-card ${insight.origin}`} key={insight.id}>
          <div className="guidance-meta"><span>{originLabel(insight.origin)}</span><code>{insight.domain}</code></div>
          <h3>{insight.title.replace(/^.*? · /, "")}</h3>
          <p>{insight.message}</p>
          {insight.targetNodeId ? <button className="button subtle" onClick={() => props.onNavigate(insight.targetNodeId!)}>Show layer</button> : null}
        </article>
      ))}
      <div className="divider" />
      <div>
        <span className="section-label">Optional knowledge loop</span>
        <h2>Contribute learnings</h2>
        <p className="fine-print">Nothing is retained or shared by scanning. Preview the sanitized, structured envelope before choosing to export it.</p>
      </div>
      {!props.contribution ? (
        <button className="button" disabled={!props.hasReport} onClick={props.onPreviewContribution}>Preview contribution</button>
      ) : (
        <div className="contribution-preview">
          <div className="snapshot"><span>Contribution preview</span><strong>Reference {friendlyReference(props.contribution.envelope.digest)}</strong><small>Created {formatDateTime(props.contribution.envelope.generatedAt)}</small></div>
          <div className="contribution-summary">
            <strong>{props.contribution.envelope.observations.length} sanitized observations</strong>
            <span>Project context: {humanizeIdentifier(props.contribution.envelope.projectScope)}</span>
            {contributionSummary.map((item) => <span key={item.label}>{item.label}: {item.count}</span>)}
          </div>
          <div className="privacy-summary"><strong>Not included</strong><span>File links, file and layer IDs, screenshots, design copy, email addresses, local paths, source code, and waiver notes.</span></div>
          <p className="fine-print">Exporting creates a machine-readable file for the local companion. Nothing is sent automatically.</p>
          <div className="scope-actions">
            <button className="button primary" onClick={() => props.onExportContribution(props.contribution!.envelope.digest)}>Export contribution</button>
            <button className="button subtle" onClick={props.onCancelContribution}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

function summarizeContribution(envelope: ReviewLearningEnvelopeV1): Array<{ label: string; count: number }> {
  const labels: Record<string, string> = {
    "repeated-finding": "Review patterns",
    "waiver-applied": "Resolved exceptions",
    "accepted-fix": "Accepted fixes",
    "naming-decision": "Naming decisions",
    "rescan-outcome": "Rescan outcomes",
  };
  const totals = new Map<string, number>();
  for (const observation of envelope.observations) {
    const label = labels[observation.kind] ?? "Other observations";
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }
  return [...totals.entries()].map(([label, count]) => ({ label, count })).sort((left, right) => left.label.localeCompare(right.label));
}
