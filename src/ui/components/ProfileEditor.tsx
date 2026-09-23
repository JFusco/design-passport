import { CONFIGURABLE_POLICY_IDS, type ConfigurablePolicyId, type ReadinessProfile, type RuleMode } from "../../core/contracts";
import type { BootstrapData, VariableCollectionOption } from "../../figma/adapter";
import { profileDomainErrors } from "../../core/profile-semantics";
import { cloneProfile } from "../operations/presentation";

export interface ProfileEditorProps {
  canPersist: boolean;
  profile: ReadinessProfile;
  suggestion: ReadinessProfile;
  pages: BootstrapData["pages"];
  collections: VariableCollectionOption[];
  configured: boolean;
  dirty: boolean;
  issues: string[];
  semanticErrors: string[];
  onChange: (profile: ReadinessProfile) => void;
  onSave: () => void;
  onAcceptSuggestion: () => void;
  onDiscard: () => void;
}

type PageRole = "foundations" | "components" | "screens" | "unmapped";

const POLICY_LABELS: Record<ConfigurablePolicyId, { label: string; help: string }> = {
  "layer-naming": { label: "Layer naming", help: "Figma defaults and whitespace normalization." },
  "component-property-grammar": { label: "Property grammar", help: "Semantic lower-camel component property names." },
  "component-value-grammar": { label: "Property values", help: "Readable variant values without team-specific abbreviations." },
  "canonical-component-names": { label: "Canonical aliases", help: "Pinned catalog aliases and contextual component terms." },
  "source-name-uniqueness": { label: "Source-name uniqueness", help: "Duplicate source names among sibling production targets." },
  "catalog-vocabulary": { label: "Novel terms", help: "Project terms that are not yet in the pinned catalog." },
  "component-descriptions": { label: "Component descriptions", help: "Descriptions are useful; external documentation links are never required." },
  "detached-designs": { label: "Detached designs", help: "Per-layer intent reviews with standalone acknowledgements." },
  "spacer-layers": { label: "Spacer layers", help: "Fixed unbound spacers; token-bound, FILL, and growing spacers are accepted." },
};

export function ProfileEditor(props: ProfileEditorProps) {
  const setRole = (pageId: string, role: PageRole) => {
    const next = cloneProfile(props.profile);
    next.pageRoles.foundations.pageIds = next.pageRoles.foundations.pageIds.filter((id) => id !== pageId);
    next.pageRoles.components.pageIds = next.pageRoles.components.pageIds.filter((id) => id !== pageId);
    next.pageRoles.screens.pageIds = next.pageRoles.screens.pageIds.filter((id) => id !== pageId);
    if (role !== "unmapped") next.pageRoles[role].pageIds.push(pageId);
    props.onChange(next);
  };
  const pageRole = (pageId: string): PageRole => {
    if (props.profile.pageRoles.foundations.pageIds.includes(pageId)) return "foundations";
    if (props.profile.pageRoles.components.pageIds.includes(pageId)) return "components";
    if (props.profile.pageRoles.screens.pageIds.includes(pageId)) return "screens";
    return "unmapped";
  };
  const setExternalKeys = (role: "foundations" | "components", value: string) => {
    const next = cloneProfile(props.profile);
    next.pageRoles[role].externalLibraryKeys = value.split(",").map((item) => item.trim()).filter(Boolean);
    props.onChange(next);
  };
  const mappedCounts = {
    foundations: props.profile.pageRoles.foundations.pageIds.length,
    components: props.profile.pageRoles.components.pageIds.length,
    screens: props.profile.pageRoles.screens.pageIds.length,
  };
  const status = props.semanticErrors.length > 0 || props.issues.length > 0
    ? "Needs attention"
    : !props.configured
      ? "Needs confirmation"
      : props.dirty
        ? "Unsaved changes"
        : "Ready";
  const statusHelp = props.semanticErrors.length > 0 || props.issues.length > 0
    ? "Fix the items below before auditing or applying fixes."
    : !props.configured
      ? "The automatic classification needs a quick confirmation before auditing."
      : props.dirty
        ? "Audits and fixes are paused until you save or discard this draft."
        : "No setup is required. Return to Overview and run the audit.";
  const needsSetup = !props.configured || props.issues.length > 0 || props.semanticErrors.length > 0;
  const suggestionErrors = profileDomainErrors(props.suggestion, new Set(props.pages.map((page) => page.id)));
  return (
    <section className="panel stack profile-form">
      <div><span className="section-label">Advanced</span><h2>Audit setup</h2><p>Design Passport normally configures this automatically. Open it only when the plugin asks for help or when this file uses an unusual page structure.</p></div>
      <div className="profile-status" aria-label={`Audit setup status: ${status}`}>
        <div><span className="section-label">Audit setup status</span><strong>{status}</strong><small>{statusHelp}</small></div>
        <span>{mappedCounts.foundations} foundations · {mappedCounts.components} components · {mappedCounts.screens} screens</span>
      </div>
      {props.issues.length > 0 && <div className="banner error"><div><strong>Audit setup needs attention</strong><ul>{props.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div></div>}
      {!props.configured && props.issues.length === 0 && <div className="banner warning">Confirm the suggested setup so Design Passport can run this audit.</div>}
      {needsSetup && <div className="profile-suggestion">
        <div><strong>Recommended fix</strong><p>Uses page names, component section dividers, local Semantic variable collections, and standard breakpoints. It never renames or moves Figma content.</p>{suggestionErrors.length > 0 && <small>Automatic setup needs manual help: {suggestionErrors.join("; ")}</small>}</div>
        <button className="button primary" disabled={!props.canPersist || suggestionErrors.length > 0} onClick={props.onAcceptSuggestion}>Use recommended setup</button>
      </div>}
      <details className="advanced-setup">
        <summary><span><strong>Manual setup</strong><small>File type, page roles, token sources, and breakpoints</small></span><span>Advanced</span></summary>
        <div className="stack">
          <div className="segmented"><button className={props.profile.artifactKind === "product" ? "active" : ""} onClick={() => props.onChange({ ...cloneProfile(props.profile), artifactKind: "product" })}>Product screens</button><button className={props.profile.artifactKind === "library" ? "active" : ""} onClick={() => props.onChange({ ...cloneProfile(props.profile), artifactKind: "library" })}>Component library</button></div>
          <p className="fine-print profile-kind-help">{props.profile.artifactKind === "product" ? "Product files must map at least one Screens page. Components and foundations provide reusable context for those screens." : "Library files grade reusable components and foundations. They do not require a Screens page."}</p>
          <fieldset><legend>Page roles</legend><p className="fine-print">Foundations contain tokens and styles; Components contain reusable source components; Screens contain product flows. Leave cover, usage, archive, and divider pages unmapped.</p>{props.pages.map((page) => <label className="page-role" key={page.id}><span>{page.name}</span><select value={pageRole(page.id)} onChange={(event) => setRole(page.id, event.target.value as PageRole)}><option value="unmapped">Unmapped</option><option value="foundations">Foundations</option><option value="components">Components</option><option value="screens">Screens</option></select></label>)}</fieldset>
          <fieldset><legend>External role sources (optional)</legend><label>Foundations library keys<input value={props.profile.pageRoles.foundations.externalLibraryKeys.join(", ")} onChange={(event) => setExternalKeys("foundations", event.target.value)} placeholder="comma-separated library keys" /></label><label>Components library keys<input value={props.profile.pageRoles.components.externalLibraryKeys.join(", ")} onChange={(event) => setExternalKeys("components", event.target.value)} placeholder="comma-separated library keys" /></label></fieldset>
          <fieldset><legend>Approved token collections</legend>{props.collections.length === 0 ? <p className="fine-print">No local or enabled-library variable collections are available.</p> : props.collections.map((collection) => <label className="collection-row" key={collection.id}><input type="checkbox" checked={props.profile.tokenSourceCollectionKeys.includes(collection.key)} onChange={(event) => { const next = cloneProfile(props.profile); next.tokenSourceCollectionKeys = event.target.checked ? [...new Set([...next.tokenSourceCollectionKeys, collection.key])] : next.tokenSourceCollectionKeys.filter((key) => key !== collection.key); props.onChange(next); }} /><span><strong>{collection.name}</strong><small>{collection.remote ? `Enabled library · ${collection.libraryName ?? "library"}` : `Local · ${collection.modeNames.join(", ") || "default mode"}`}</small></span></label>)}</fieldset>
          <fieldset><legend>Breakpoints</legend>{props.profile.breakpoints.map((breakpoint, index) => <div className="breakpoint-row" key={`${breakpoint.name}:${index}`}><input aria-label="Breakpoint name" value={breakpoint.name} onChange={(event) => { const next = cloneProfile(props.profile); const target = next.breakpoints[index]; if (target) target.name = event.target.value; props.onChange(next); }} /><input aria-label="Breakpoint width" type="number" min="1" value={breakpoint.width} onChange={(event) => { const next = cloneProfile(props.profile); const target = next.breakpoints[index]; if (target) target.width = Number(event.target.value); props.onChange(next); }} /><button className="icon-button" aria-label="Remove breakpoint" disabled={props.profile.breakpoints.length === 1} onClick={() => { const next = cloneProfile(props.profile); next.breakpoints.splice(index, 1); props.onChange(next); }}>×</button></div>)}<button className="button subtle" onClick={() => { const next = cloneProfile(props.profile); next.breakpoints.push({ name: "New", width: 1024 }); props.onChange(next); }}>Add breakpoint</button></fieldset>
          <fieldset><legend>Team-convention rules</legend><p className="fine-print">Required affects grade and readiness. Advisory creates review guidance only. Off records one not-applicable result and never affects the grade.</p>{CONFIGURABLE_POLICY_IDS.map((policyId) => <label className="policy-row" key={policyId}><span><strong>{POLICY_LABELS[policyId].label}</strong><small>{POLICY_LABELS[policyId].help}</small></span><select value={props.profile.ruleModes[policyId]} onChange={(event) => { const next = cloneProfile(props.profile); next.ruleModes[policyId] = event.target.value as RuleMode; props.onChange(next); }} aria-label={`${POLICY_LABELS[policyId].label} policy mode`}><option value="required">Required</option><option value="advisory">Advisory</option><option value="off">Off</option></select></label>)}</fieldset>
          <div className="banner info">Accessibility, token correctness, evidence integrity, and certification safety are locked. Naming grammar remains <code>code-aligned-strict</code>; contextual aliases are never resolved without designer confirmation.</div>
          <p className="fine-print">Audits always use the last saved manual setup. Save confirms this draft and invalidates current verification; completed results remain available for browsing and historical export. Discard restores the last saved setup.</p>
          <div className="scope-actions">
            <button className="button primary large" disabled={!props.canPersist || props.semanticErrors.length > 0 || (props.configured && !props.dirty && props.issues.length === 0)} onClick={props.onSave}>{props.canPersist ? "Save manual setup" : "Save in Design mode"}</button>
            <button className="button" disabled={props.configured && !props.dirty} onClick={props.onDiscard}>{props.configured ? "Discard changes" : "Restore suggestions"}</button>
          </div>
        </div>
      </details>
    </section>
  );
}
