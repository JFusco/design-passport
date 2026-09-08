import { AXIS_LABELS } from "../../core/constants";
import { getPatternChecklist } from "../../core/catalog";
import type { Axis, BindableField, Finding, JsonValue } from "../../core/contracts";
import type { VariableCollectionOption } from "../../figma/adapter";
import { statusClass } from "../operations/presentation";
import { defaultTokenCollectionId } from "../operations/token-wizard";
import { isWaiverReasonValid } from "../operations/waivers";
import type { TokenWizardState, WaiverDraft } from "../types";

export interface FindingsProps {
  findings: Finding[];
  showPassing: boolean;
  axisFilter: Axis | "all";
  expanded: string | undefined;
  collections: VariableCollectionOption[];
  tokenWizard: TokenWizardState | undefined;
  waiverDraft: WaiverDraft | undefined;
  disabled: boolean;
  canMutateDocument: boolean;
  onTogglePassing: (value: boolean) => void;
  onAxisFilter: (value: Axis | "all") => void;
  onExpand: (id: string) => void;
  onNavigate: (nodeId: string) => void;
  onWaiverDraft: (value?: WaiverDraft) => void;
  onWaive: () => void;
  onClearWaiver: (findingId: string) => void;
  onConfirmPattern: (findingId: string, canonicalName: string) => void;
  onTokenWizard: (value?: TokenWizardState) => void;
  onCreateToken: () => void;
}

export function Findings(props: FindingsProps) {
  return (
    <section className="panel stack">
      <div className="filters">
        <select value={props.axisFilter} onChange={(event) => props.onAxisFilter(event.target.value as Axis | "all")} aria-label="Filter by axis">
          <option value="all">All axes</option>
          {Object.entries(AXIS_LABELS).map(([axis, label]) => <option key={axis} value={axis}>{label}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={props.showPassing} onChange={(event) => props.onTogglePassing(event.target.checked)} /> Show passing</label>
      </div>
      {props.findings.length === 0 ? <div className="empty-state compact"><h2>No findings in this view</h2><p>Run an audit or change the filters.</p></div> : props.findings.map((finding) => {
        const isExpanded = props.expanded === finding.id;
        const checklist = finding.patternResolution?.canonicalName ? getPatternChecklist(finding.patternResolution.canonicalName) : [];
        return (
          <article className={`finding-card severity-${finding.severity}`} key={finding.id}>
            <button className="finding-summary" onClick={() => props.onExpand(finding.id)} aria-expanded={isExpanded}>
              <span className={statusClass(finding.status)}>{finding.status}</span>
              <span className="finding-title"><strong>{finding.title}</strong><small>{AXIS_LABELS[finding.axis]} · severity {finding.severity}{finding.hardBlocker ? " · blocker" : ""}</small></span>
              <span className="chevron" aria-hidden="true">{isExpanded ? "−" : "+"}</span>
            </button>
            {isExpanded && (
              <div className="finding-detail">
                <p>{finding.message}</p>
                <button className="node-link" onClick={() => props.onNavigate(finding.nodeId)}>{finding.nodePath}</button>
                <dl><dt>Evidence</dt><dd>{finding.evidence.summary}</dd><dt>Fixability</dt><dd>{finding.fixability}</dd><dt>Confidence</dt><dd>{Math.round(finding.confidence * 100)}%</dd></dl>
                {finding.patternResolution && <div className="resolution"><strong>Pattern resolution</strong><span>{finding.patternResolution.kind}{finding.patternResolution.canonicalName ? ` → ${finding.patternResolution.canonicalName}` : ""}{finding.patternResolution.candidates ? `: ${finding.patternResolution.candidates.join(" / ")}` : ""}</span></div>}
                {finding.patternResolution?.kind === "contextual" && finding.patternResolution.candidates && <div className="candidate-actions"><span>Confirm the intended pattern:</span>{finding.patternResolution.candidates.map((candidate) => <button className="button" disabled={props.disabled || !props.canMutateDocument} key={candidate} onClick={() => props.onConfirmPattern(finding.id, candidate)}>{candidate}</button>)}</div>}
                {checklist.length > 0 && <div className="checklist"><strong>UI Design Brain checklist (advisory)</strong><ul>{checklist.map((item) => <li key={item}>{item}</li>)}</ul></div>}
                {finding.ruleId === "token.application.repeated-literal" && <TokenWizard disabled={props.disabled || !props.canMutateDocument} finding={finding} collections={props.collections} state={props.tokenWizard} onChange={props.onTokenWizard} onCreate={props.onCreateToken} />}
                <div className="finding-actions">
                  {finding.status === "waived" ? <button className="button subtle" disabled={props.disabled} onClick={() => props.onClearWaiver(finding.id)}>Remove waiver</button> : finding.status !== "pass" && finding.status !== "not-applicable" && props.waiverDraft?.findingId !== finding.id ? <button className="button subtle" disabled={props.disabled} onClick={() => props.onWaiverDraft({ findingId: finding.id, reason: "" })}>Waive with deduction</button> : null}
                </div>
                {props.waiverDraft?.findingId === finding.id && (
                  <div className="waiver-editor">
                    <label>Waiver reason<input autoFocus value={props.waiverDraft.reason} placeholder="Explain why this exception is accepted" onChange={(event) => props.onWaiverDraft({ ...props.waiverDraft!, reason: event.target.value })} /></label>
                    <small>The finding remains a score deduction and the reason is stored locally.</small>
                    <div><button className="button primary" disabled={props.disabled || !isWaiverReasonValid(props.waiverDraft.reason)} onClick={props.onWaive}>Apply waiver</button><button className="button subtle" onClick={() => props.onWaiverDraft(undefined)}>Cancel</button></div>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function TokenWizard(props: {
  finding: Finding;
  collections: VariableCollectionOption[];
  state: TokenWizardState | undefined;
  onChange: (value?: TokenWizardState) => void;
  onCreate: () => void;
  disabled: boolean;
}) {
  const suggested = props.finding.suggestedValue as { field?: BindableField; nodeIds?: string[]; rawValue?: JsonValue } | undefined;
  if (!suggested?.field || !suggested.nodeIds || suggested.rawValue === undefined) return null;
  const { field, nodeIds, rawValue } = suggested;
  const state = props.state?.findingId === props.finding.id ? props.state : undefined;
  const start = () => props.onChange({
    findingId: props.finding.id,
    collectionId: defaultTokenCollectionId(field, props.collections),
    name: "",
    field,
    nodeIds,
    rawValue,
  });
  if (!state) return <button className="button" disabled={props.disabled || props.collections.length === 0} onClick={start}>Create semantic token…</button>;
  return (
    <div className="token-wizard">
      <strong>Token creation wizard</strong>
      <label>Existing local collection<select value={state.collectionId} onChange={(event) => props.onChange({ ...state, collectionId: event.target.value })}>{props.collections.map((collection) => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></label>
      <label>Semantic slash-separated name<input value={state.name} placeholder="semantic/space/card-gap" onChange={(event) => props.onChange({ ...state, name: event.target.value })} /></label>
      <small>The raw value is used only as the initial value. You choose and own the semantic name.</small>
      <div><button className="button primary" disabled={props.disabled || !state.collectionId || !state.name.includes("/")} onClick={props.onCreate}>Create and bind {state.nodeIds.length}</button><button className="button subtle" onClick={() => props.onChange(undefined)}>Cancel</button></div>
    </div>
  );
}
