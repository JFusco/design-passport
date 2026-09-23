import { AXIS_LABELS } from "../../core/constants";
import { getPatternChecklist } from "../../core/catalog";
import type { Axis, BindableField, Finding, FindingCategory, FindingGroup, FrameResult, JsonValue } from "../../core/contracts";
import type { VariableCollectionOption } from "../../figma/adapter";
import type { TokenCoveragePageRequest, TokenCoveragePageResult } from "../../plugin/messages";
import { groupsForFindings } from "../../core/finding-groups";
import { findingImpactLabel } from "../../core/finding-policy";
import { statusClass } from "../operations/presentation";
import { defaultTokenCollectionId } from "../operations/token-wizard";
import { isWaiverReasonValid } from "../operations/waivers";
import type { TokenWizardState, WaiverDraft } from "../types";
import { TokenCoverage } from "./TokenCoverage";

export interface FindingsProps {
  findings: Finding[];
  groups?: FindingGroup[];
  categoryFilter?: FindingCategory | "all";
  onCategoryFilter?: (value: FindingCategory | "all") => void;
  onRecheckIssue?: (issueId: string) => void;
  recheckDisabled?: boolean;
  frames: FrameResult[];
  showPassing: boolean;
  axisFilter: Axis | "all";
  pageFilter: string;
  rootFilter: string;
  variantFilter: string;
  expanded: string | undefined;
  collections: VariableCollectionOption[];
  tokenWizard: TokenWizardState | undefined;
  waiverDraft: WaiverDraft | undefined;
  disabled: boolean;
  canMutateDocument: boolean;
  onTogglePassing: (value: boolean) => void;
  onAxisFilter: (value: Axis | "all") => void;
  onPageFilter: (pageId: string) => void;
  onRootFilter: (rootId: string) => void;
  onVariantFilter: (variantId: string) => void;
  onExpand: (id: string) => void;
  onNavigate: (nodeId: string) => void;
  onWaiverDraft: (value?: WaiverDraft) => void;
  onWaive: () => void;
  onClearWaiver: (findingId: string) => void;
  onConfirmPattern: (findingId: string, canonicalName: string) => void;
  onAcknowledgeDetachment?: (findingId: string) => void;
  onClearDetachmentAcknowledgement?: (findingId: string) => void;
  onOpenAuditSetup?: () => void;
  coverageCurrent?: boolean;
  coverageReportHash?: string;
  coveragePages?: Readonly<Record<string, TokenCoveragePageResult>>;
  onRequestCoveragePage?: (request: TokenCoveragePageRequest) => void;
  onTokenWizard: (value?: TokenWizardState) => void;
  onCreateToken: () => void;
}

export function Findings(props: FindingsProps) {
  const groups = groupsForFindings(props.findings, props.groups);
  const issueCount = groups.reduce((count, group) => count + (group.kind === "related" ? group.occurrenceCount : 1), 0);
  const byId = new Map(props.findings.map((finding) => [finding.id, finding]));
  const navigationTarget = (finding: Finding) => finding.provenance?.navigationNodeId ?? finding.nodeId;
  const pages = [...new Map(props.frames.map((frame) => [frame.pageId, frame.pageName])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]));
  const roots = props.frames
    .filter((frame) => props.pageFilter === "all" || frame.pageId === props.pageFilter)
    .sort((left, right) => left.rootName.localeCompare(right.rootName));
  const variants = props.frames.find((frame) => frame.rootId === props.rootFilter)?.variantCoverage ?? [];
  return (
    <section className="panel stack">
      <TokenCoverage
        frames={props.rootFilter === "all" ? props.frames : props.frames.filter((frame) => frame.rootId === props.rootFilter)}
        detailed
        {...(props.coverageCurrent !== undefined ? { current: props.coverageCurrent } : {})}
        {...(props.coverageReportHash ? { reportHash: props.coverageReportHash } : {})}
        {...(props.coveragePages ? { pages: props.coveragePages } : {})}
        {...(props.onRequestCoveragePage ? { onRequestPage: props.onRequestCoveragePage } : {})}
        onNavigate={props.onNavigate}
      />
      <div className="filters finding-filters">
        <select value={props.pageFilter} onChange={(event) => props.onPageFilter(event.target.value)} aria-label="Filter by page">
          <option value="all">All pages</option>
          {pages.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={props.rootFilter} onChange={(event) => props.onRootFilter(event.target.value)} aria-label="Filter by module or component">
          <option value="all">All modules</option>
          {roots.map((frame) => <option key={frame.rootId} value={frame.rootId}>{frame.rootName} · {frame.grade.letter} {frame.grade.score.toFixed(1)}</option>)}
        </select>
        <select value={props.variantFilter} disabled={variants.length === 0} onChange={(event) => props.onVariantFilter(event.target.value)} aria-label="Filter by component variant">
          <option value="all">All variants</option>
          {variants.map((variant) => <option key={variant.variantId} value={variant.variantId}>{variant.variantName}</option>)}
        </select>
        <select value={props.axisFilter} onChange={(event) => props.onAxisFilter(event.target.value as Axis | "all")} aria-label="Filter by axis">
          <option value="all">All axes</option>
          {Object.entries(AXIS_LABELS).map(([axis, label]) => <option key={axis} value={axis}>{label}</option>)}
        </select>
        <select disabled={props.findings.length > 0 && props.findings.every((finding) => finding.category === undefined)} value={props.categoryFilter ?? "all"} onChange={(event) => props.onCategoryFilter?.(event.target.value as FindingCategory | "all")} aria-label="Filter by category">
          <option value="all">All categories</option><option value="requirement">Requirements</option><option value="recommendation">Recommendations</option><option value="governance">Vocabulary governance</option>
        </select>
        <label className="check"><input type="checkbox" checked={props.showPassing} onChange={(event) => props.onTogglePassing(event.target.checked)} /> Show passing</label>
      </div>
      {props.findings.length > 0 && <p className="muted">{issueCount} issue{issueCount === 1 ? "" : "s"} · {props.findings.length} finding occurrences in this view. Filters do not change grades.</p>}
      {props.findings.length === 0 ? <div className="empty-state compact"><h2>No findings in this view</h2><p>Run an audit or change the filters.</p></div> : groups.map((group) => {
        const selectedId = props.expanded && group.findingIds.includes(props.expanded) ? props.expanded : group.primaryFindingId;
        const finding = byId.get(selectedId)!;
        const isExpanded = props.expanded === group.id || group.findingIds.includes(props.expanded ?? "");
        const checklist = finding.patternResolution?.canonicalName ? getPatternChecklist(finding.patternResolution.canonicalName) : [];
        return (
          <article className={`finding-card severity-${finding.severity}`} key={group.id}>
            <button className="finding-summary" onClick={() => props.onExpand(isExpanded ? props.expanded! : group.id)} aria-expanded={isExpanded}>
              <span className={statusClass(finding.status)}>{finding.status}</span>
              <span className="finding-title"><strong>{finding.title}</strong><small>{AXIS_LABELS[finding.axis]} · {findingImpactLabel(finding)}{group.findingIds.length > 1 ? ` · ${group.occurrenceCount} affected layers` : ""}{group.kind === "related" ? " · related findings" : ""}</small></span>
              <span className="chevron" aria-hidden="true">{isExpanded ? "−" : "+"}</span>
            </button>
            {isExpanded && (
              <div className="finding-detail">
                {group.kind === "related" && <p>These findings are related. A shared fix has not been verified; review each occurrence and its overrides.</p>}
                <p>{finding.message}</p>
                <p><strong>Score effect:</strong> {findingImpactLabel(finding)}</p>
                {group.sourceNodeId && <button className="button" onClick={() => props.onNavigate(group.sourceNodeId!)}>Go to source</button>}
                {group.sourceStyleId && <button className="button" onClick={() => props.onNavigate(navigationTarget(finding))}>Show layer using this style</button>}
                {group.sourceLabel && <small>Source: {group.sourceLabel}</small>}
                {group.sourceStyleId && <small>Style ID: {group.sourceStyleId}. Select an affected text layer to inspect its applied style.</small>}
                {group.findingIds.length > 1 && <details><summary>Show affected layers ({group.occurrenceCount})</summary><ul>{group.findingIds.map((id) => {
                  const occurrence = byId.get(id)!;
                  return <li key={id}><button className="node-link" onClick={() => props.onNavigate(navigationTarget(occurrence))}>{occurrence.nodePath}</button><button className="button subtle" onClick={() => props.onExpand(id)}>Inspect occurrence</button></li>;
                })}</ul></details>}
                {props.onRecheckIssue && <button className="button" disabled={props.recheckDisabled} onClick={() => props.onRecheckIssue!(group.id)}>Recheck this issue</button>}
                <button className="node-link" onClick={() => props.onNavigate(navigationTarget(finding))}>{finding.nodePath}</button>
                <dl><dt>Evidence</dt><dd>{finding.evidence.summary}</dd><dt>Fixability</dt><dd>{finding.fixability}</dd><dt>Confidence</dt><dd>{Math.round(finding.confidence * 100)}%</dd></dl>
                <details><summary>Measured evidence</summary><pre className="finding-evidence">{JSON.stringify(finding.evidence.measured, null, 2)}</pre></details>
                {finding.patternResolution && <div className="resolution"><strong>Pattern resolution</strong><span>{finding.patternResolution.kind}{finding.patternResolution.canonicalName ? ` → ${finding.patternResolution.canonicalName}` : ""}{finding.patternResolution.candidates ? `: ${finding.patternResolution.candidates.join(" / ")}` : ""}</span></div>}
                {finding.patternResolution?.kind === "contextual" && finding.patternResolution.candidates && <div className="candidate-actions"><span>Confirm the intended pattern:</span>{finding.patternResolution.candidates.map((candidate) => <button className="button" disabled={props.disabled || !props.canMutateDocument} key={candidate} onClick={() => props.onConfirmPattern(finding.id, candidate)}>{candidate}</button>)}</div>}
                {finding.patternResolution?.kind === "novel" && finding.status !== "pass" ? <button className="button" disabled={props.disabled || !props.canMutateDocument} onClick={() => props.onConfirmPattern(finding.id, finding.patternResolution!.input.split("/")[0]?.trim() ?? finding.patternResolution!.input.trim())}>Accept project term</button> : null}
                {finding.ruleId === "component.detached-design" ? Boolean(finding.evidence.measured.acknowledged)
                  ? <button className="button subtle" disabled={props.disabled || !props.canMutateDocument || !props.onClearDetachmentAcknowledgement} onClick={() => props.onClearDetachmentAcknowledgement?.(finding.id)}>Clear standalone acknowledgement</button>
                  : <button className="button" disabled={props.disabled || !props.canMutateDocument || !props.onAcknowledgeDetachment} onClick={() => props.onAcknowledgeDetachment?.(finding.id)}>Mark intentional standalone design</button> : null}
                {finding.ruleId === "token.foundation.sources" && finding.status !== "pass" && finding.status !== "not-applicable" ? <button className="button" disabled={!props.onOpenAuditSetup} onClick={() => props.onOpenAuditSetup?.()}>Open Audit Setup</button> : null}
                {checklist.length > 0 && <div className="checklist"><strong>UI Design Brain checklist (advisory)</strong><ul>{checklist.map((item) => <li key={item}>{item}</li>)}</ul></div>}
                {finding.ruleId === "token.application.repeated-literal" && <TokenWizard disabled={props.disabled || !props.canMutateDocument} finding={finding} collections={props.collections} state={props.tokenWizard} onChange={props.onTokenWizard} onCreate={props.onCreateToken} />}
                <div className="finding-actions">
                  {finding.status === "waived" ? <button className="button subtle" disabled={props.disabled} onClick={() => props.onClearWaiver(finding.id)}>Remove waiver</button> : (finding.category === undefined || finding.category === "requirement") && finding.status !== "pass" && finding.status !== "not-applicable" && props.waiverDraft?.findingId !== finding.id ? <button className="button subtle" disabled={props.disabled} onClick={() => props.onWaiverDraft({ findingId: finding.id, reason: "" })}>Waive with deduction</button> : null}
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
