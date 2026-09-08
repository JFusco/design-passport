import type { ChangePlan, Finding } from "../../core/contracts";

export interface CleanupProps {
  disabled: boolean;
  plans: ChangePlan[];
  findings: Finding[];
  undoAcknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
  onApply: (planId: string) => void;
  onApplyAll: (planIds: string[]) => void;
}

const STRUCTURAL_OPERATIONS = new Set(["apply-inferred-auto-layout", "convert-to-component", "group-variants", "reconnect-instance"]);

export function Cleanup(props: CleanupProps) {
  if (props.plans.length === 0) return <section className="panel"><div className="empty-state"><h2>No previewable cleanup plans</h2><p>Run an audit. Manual findings remain in the Findings tab and are never guessed.</p></div></section>;
  const fixAllPlans = props.plans.filter((plan) => plan.risk !== "structural");
  const fixAllOperationCount = fixAllPlans.reduce((total, plan) => total + plan.operations.length, 0);
  return (
    <section className="panel stack">
      <div className="banner info">Every plan is previewed here, applied as its own undo group, and followed by one full-file rescan. Structural conversion is always isolated.</div>
      {fixAllPlans.length > 0 && <div className="fix-all-card"><div><strong>Fix all available</strong><small>{fixAllOperationCount} automatic or guarded operation{fixAllOperationCount === 1 ? "" : "s"}. Structural plans remain individually confirmed.</small></div><button className="button primary" disabled={props.disabled} onClick={() => props.onApplyAll(fixAllPlans.map((plan) => plan.id))}>Apply safe &amp; guarded</button></div>}
      {props.plans.map((plan) => (
        <article className="plan-card" key={plan.id}>
          <div className="plan-heading"><span className={`risk risk-${plan.risk}`}>{plan.risk}</span><strong>{plan.operations.length} operation{plan.operations.length === 1 ? "" : "s"}</strong></div>
          <ul>{plan.operations.map((operation, index) => {
            const source = props.findings.find((finding) => finding.nodeId === operation.nodeId && plan.findingIds.includes(finding.id));
            return <li key={`${operation.nodeId}:${operation.kind}:${index}`}><code>{operation.kind}</code><span title={operation.nodeId}>{source?.nodePath ?? operation.nodeId}</span></li>;
          })}</ul>
          {plan.operations.some((operation) => STRUCTURAL_OPERATIONS.has(operation.kind)) && <p className="fine-print">A version-history checkpoint is attempted first. If unavailable, applying requires the undo-only acknowledgement below.</p>}
          <button className="button primary" disabled={props.disabled} onClick={() => props.onApply(plan.id)}>Apply this risk group</button>
        </article>
      ))}
      <label className="check acknowledgement"><input type="checkbox" checked={props.undoAcknowledged} onChange={(event) => props.onAcknowledge(event.target.checked)} /> If version history is unavailable, I understand structural rollback is limited to Figma Undo.</label>
    </section>
  );
}
