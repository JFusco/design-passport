import type { ReadinessProfile } from "../../core/contracts";
import type { BootstrapData, VariableCollectionOption } from "../../figma/adapter";
import { cloneProfile } from "../operations/presentation";

export interface ProfileEditorProps {
  canPersist: boolean;
  profile: ReadinessProfile;
  pages: BootstrapData["pages"];
  collections: VariableCollectionOption[];
  onChange: (profile: ReadinessProfile) => void;
  onSave: () => void;
}

type PageRole = "foundations" | "components" | "screens" | "unmapped";

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
  return (
    <section className="panel stack profile-form">
      <div><span className="section-label">File purpose</span><h2>Profile</h2><p>Roles describe source intent without renaming or moving pages.</p></div>
      <div className="segmented"><button className={props.profile.artifactKind === "product" ? "active" : ""} onClick={() => props.onChange({ ...cloneProfile(props.profile), artifactKind: "product" })}>Product file</button><button className={props.profile.artifactKind === "library" ? "active" : ""} onClick={() => props.onChange({ ...cloneProfile(props.profile), artifactKind: "library" })}>Library file</button></div>
      <fieldset><legend>Page roles</legend>{props.pages.map((page) => <label className="page-role" key={page.id}><span>{page.name}</span><select value={pageRole(page.id)} onChange={(event) => setRole(page.id, event.target.value as PageRole)}><option value="unmapped">Unmapped</option><option value="foundations">Foundations</option><option value="components">Components</option><option value="screens">Screens</option></select></label>)}</fieldset>
      <fieldset><legend>External role sources (optional)</legend><label>Foundations library keys<input value={props.profile.pageRoles.foundations.externalLibraryKeys.join(", ")} onChange={(event) => setExternalKeys("foundations", event.target.value)} placeholder="comma-separated library keys" /></label><label>Components library keys<input value={props.profile.pageRoles.components.externalLibraryKeys.join(", ")} onChange={(event) => setExternalKeys("components", event.target.value)} placeholder="comma-separated library keys" /></label></fieldset>
      <fieldset><legend>Approved token collections</legend>{props.collections.length === 0 ? <p className="fine-print">No local or enabled-library variable collections are available.</p> : props.collections.map((collection) => <label className="collection-row" key={collection.id}><input type="checkbox" checked={props.profile.tokenSourceCollectionKeys.includes(collection.key)} onChange={(event) => { const next = cloneProfile(props.profile); next.tokenSourceCollectionKeys = event.target.checked ? [...new Set([...next.tokenSourceCollectionKeys, collection.key])] : next.tokenSourceCollectionKeys.filter((key) => key !== collection.key); props.onChange(next); }} /><span><strong>{collection.name}</strong><small>{collection.remote ? `Enabled library · ${collection.libraryName ?? "library"}` : `Local · ${collection.modeNames.join(", ") || "default mode"}`}</small></span></label>)}</fieldset>
      <fieldset><legend>Breakpoint profile</legend>{props.profile.breakpoints.map((breakpoint, index) => <div className="breakpoint-row" key={`${breakpoint.name}:${index}`}><input aria-label="Breakpoint name" value={breakpoint.name} onChange={(event) => { const next = cloneProfile(props.profile); const target = next.breakpoints[index]; if (target) target.name = event.target.value; props.onChange(next); }} /><input aria-label="Breakpoint width" type="number" min="1" value={breakpoint.width} onChange={(event) => { const next = cloneProfile(props.profile); const target = next.breakpoints[index]; if (target) target.width = Number(event.target.value); props.onChange(next); }} /><button className="icon-button" aria-label="Remove breakpoint" disabled={props.profile.breakpoints.length === 1} onClick={() => { const next = cloneProfile(props.profile); next.breakpoints.splice(index, 1); props.onChange(next); }}>×</button></div>)}<button className="button subtle" onClick={() => { const next = cloneProfile(props.profile); next.breakpoints.push({ name: "New", width: 1024 }); props.onChange(next); }}>Add breakpoint</button></fieldset>
      <div className="banner info">Naming policy is fixed to <code>code-aligned-strict</code>. Contextual aliases are never resolved without designer confirmation.</div>
      <button className="button primary large" disabled={!props.canPersist} onClick={props.onSave}>{props.canPersist ? "Save profile" : "Save in Design mode"}</button>
    </section>
  );
}
