import { useEffect, useState } from "react";
import { designerText, fieldLabel } from "../operations/presentation";
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

function operationPreview(operation: ChangePlan["operations"][number], source: Finding | undefined): { label: string; before: string; after: string } {
  if (operation.kind === "rename-node" || operation.kind === "normalize-export-name") {
    const current = source?.evidence.measured.currentName;
    return { label: "Rename layer", before: typeof current === "string" ? current : source?.nodePath ?? "Current layer name", after: operation.value.name };
  }
  if (operation.kind === "bind-variable") {
    const variableName = source?.evidence.measured.variableName;
    return { label: "Bind design token", before: `${fieldLabel(operation.value.field)} is unbound`, after: `Bind ${fieldLabel(operation.value.field)} to ${typeof variableName === "string" ? variableName : "the approved compatible variable"}` };
  }
  if (operation.kind === "apply-inferred-auto-layout") {
    return { label: "Apply Auto Layout", before: "Freeform positioning", after: `Auto Layout with at most ${operation.value.tolerance} px geometry change` };
  }
  if (operation.kind === "set-annotation") return { label: "Add annotation", before: "Source annotation missing", after: operation.value.label };
  if (operation.kind === "confirm-pattern") return { label: "Confirm naming pattern", before: operation.value.sourceName, after: operation.value.canonicalName };
  if (operation.kind === "convert-to-component") return { label: "Convert to component", before: "Regular design layer", after: `Component named ${operation.value.name}` };
  if (operation.kind === "group-variants") return { label: "Group variants", before: `${operation.value.componentIds.length} separate components`, after: "One component set" };
  if (operation.kind === "reconnect-instance") return { label: "Reconnect instance", before: "Detached design", after: "Connected component instance" };
  return { label: "Apply cleanup", before: source?.evidence.summary ?? "Current state", after: source?.message ?? "Proposed state" };
}

export function Cleanup(props: CleanupProps) {
  const [optedOut, setOptedOut] = useState<string[]>([]);
  useEffect(() => setOptedOut([]), [props.plans]);
  if (props.plans.length === 0) return <section className="panel"><div className="empty-state"><h2>No previewable cleanup plans</h2><p>Run an audit. Manual findings remain in the Report and are never guessed.</p></div></section>;
  const fixAllPlans = props.plans.filter((plan) => plan.risk !== "structural" && !optedOut.includes(plan.id));
  const fixAllOperationCount = fixAllPlans.reduce((total, plan) => total + plan.operations.length, 0);
  return (
    <section className="panel stack">
      <div className="banner info">Review the current and proposed value for each fix. Apply fixes individually, or apply the safe and guarded set in isolated undo groups.</div>
      {props.plans.some((plan) => plan.risk !== "structural") && <div className="fix-all-card"><div><strong>{fixAllPlans.length} plans selected</strong><small>{fixAllOperationCount} automatic or guarded operation{fixAllOperationCount === 1 ? "" : "s"}. Structural plans remain individually confirmed.</small></div><button className="button primary" disabled={props.disabled || fixAllPlans.length === 0} onClick={() => props.onApplyAll(fixAllPlans.map((plan) => plan.id))}>Apply safe &amp; guarded</button></div>}
      {props.plans.map((plan) => (
        <article className="plan-card" key={plan.id}>
          <div className="plan-heading"><span className={`risk risk-${plan.risk}`}>{plan.risk}</span><strong>{plan.operations.length} fix{plan.operations.length === 1 ? "" : "es"}</strong></div>
          {plan.risk !== "structural" ? <label className="check"><input type="checkbox" disabled={props.disabled} checked={!optedOut.includes(plan.id)} onChange={(event) => setOptedOut((current) => event.target.checked ? current.filter((id) => id !== plan.id) : [...current, plan.id])} /> Include complete plan in batch</label> : null}
          <ul>{plan.operations.map((operation, index) => {
            const source = props.findings.find((finding) => finding.nodeId === operation.nodeId && plan.findingIds.includes(finding.id));
            const preview = operationPreview(operation, source);
            return <li key={`${operation.nodeId}:${operation.kind}:${index}`}><strong>{preview.label}</strong><span title={operation.nodeId}>{source?.nodePath ?? operation.nodeId}</span><dl><dt>Current</dt><dd>{designerText(preview.before)}</dd><dt>Proposed</dt><dd>{designerText(preview.after)}</dd></dl></li>;
          })}</ul>
          {plan.operations.some((operation) => STRUCTURAL_OPERATIONS.has(operation.kind)) && <p className="fine-print">A version-history checkpoint is attempted first. If unavailable, applying requires the undo-only acknowledgement below.</p>}
          <button className="button primary" disabled={props.disabled} onClick={() => props.onApply(plan.id)}>Apply this fix</button>
        </article>
      ))}
      <label className="check acknowledgement"><input type="checkbox" checked={props.undoAcknowledged} onChange={(event) => props.onAcknowledge(event.target.checked)} /> If version history is unavailable, I understand structural rollback is limited to Figma Undo.</label>
    </section>
  );
}
