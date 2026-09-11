import { Children, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import type { KnowledgeSummary } from "../../plugin/messages";
import type { ProjectStyleGuideStatus } from "../../figma/adapter";
import { friendlyReference, humanizeIdentifier, relativeTime } from "../operations/presentation";

export interface ContextPanelProps {
  knowledge: KnowledgeSummary | undefined;
  actionsBlocked: boolean;
  onRefresh: () => void;
  projectStyleGuide: ProjectStyleGuideStatus;
  referencePackRaw: string;
  onReferencePackRaw: (value: string) => void;
  onImportProjectStyleGuide: () => void;
  onRemoveProjectStyleGuide: () => void;
  onAddSessionReference: () => void;
  onClearSessionReferences: () => void;
  sessionReferenceCount: number;
  canMutateDocument: boolean;
  fileKeyAvailable: boolean;
}

export function ContextPanel(props: ContextPanelProps) {
  const selectedPack = useMemo(() => {
    try {
      const value = JSON.parse(props.referencePackRaw) as { packVersion?: unknown; source?: { role?: unknown }; facts?: unknown[] };
      if ((value.source?.role !== "style-guide" && value.source?.role !== "reference") || typeof value.packVersion !== "string" || !Array.isArray(value.facts)) return undefined;
      return { role: value.source.role, version: value.packVersion, factCount: value.facts.length };
    } catch {
      return undefined;
    }
  }, [props.referencePackRaw]);

  return (
    <section className="panel stack">
      <div className="section-heading"><div><span className="section-label">Whole-file design knowledge</span><h2>{props.knowledge?.complete ? "Complete" : "Not built"}</h2></div><button className="button" disabled={props.actionsBlocked} onClick={props.onRefresh}>Rebuild context</button></div>
      {props.knowledge && <>
        <div className="context-grid">
          <Metric label="Pages loaded" value={`${props.knowledge.loadedPageCount} / ${props.knowledge.pageCount}`} />
          <Metric label="Nodes" value={props.knowledge.nodeCount.toLocaleString()} />
          <Metric label="Components" value={props.knowledge.componentCount.toLocaleString()} />
          <Metric label="Instances" value={props.knowledge.instanceCount.toLocaleString()} />
          <Metric label="Responsive families" value={props.knowledge.responsiveFamilyCount.toLocaleString()} />
          <Metric label="Repeated structures" value={props.knowledge.repeatedStructureGroupCount.toLocaleString()} />
        </div>
        <div className="snapshot"><span>Knowledge snapshot</span><strong>{friendlyReference(props.knowledge.snapshotHash)}</strong><small>Built {relativeTime(props.knowledge.builtAt)}</small></div>
        <ContextList title="Page role map" empty="No pages indexed." totalCount={props.knowledge.pages.length}>
          {props.knowledge.pages.map((page) => <div className="inventory-row" key={page.id}><span><strong>{page.name}</strong><small>{page.role}</small></span><b>{page.nodeCount.toLocaleString()} nodes</b></div>)}
        </ContextList>
        <ContextList title="Resolved component patterns" empty="No component definitions or instances were resolved." totalCount={props.knowledge.patternInventory.length}>
          {props.knowledge.patternInventory.slice(0, 40).map((pattern) => <div className="inventory-row" key={`${pattern.kind}:${pattern.label}`}><span><strong>{pattern.label}</strong><small>{pattern.kind}</small></span><b>{pattern.definitions} definitions · {pattern.instances} uses</b></div>)}
        </ContextList>
        <ContextList title="Responsive specimen families" empty="No `<Artifact> / <Breakpoint> / <Width>` families were resolved." totalCount={props.knowledge.responsiveFamilies.length}>
          {props.knowledge.responsiveFamilies.slice(0, 40).map((family) => <div className="inventory-row" key={family.artifact}><span><strong>{family.artifact}</strong><small>{family.breakpointNames.join(" · ")}</small></span><b className={family.hasCollision ? "collision" : ""}>{family.widths.join(" / ")}{family.hasCollision ? " · collision" : ""}</b></div>)}
        </ContextList>
        <ContextList title="Token sources known" empty="No variable collections were indexed." totalCount={props.knowledge.tokenCollections.length}>
          {props.knowledge.tokenCollections.map((collection) => <div className="inventory-row" key={`${collection.remote}:${collection.name}`}><span><strong>{collection.name}</strong><small>{collection.remote ? "enabled library" : "local"}</small></span><b>{collection.variableCount.toLocaleString()} variables</b></div>)}
        </ContextList>
      </>}
      <div className="divider" />
      <div><span className="section-label">Project-scoped guidance</span><h2>Style guide and references</h2><p className="fine-print">A project style guide is bound privately to this Figma file. One-off references stay in this plugin session.</p></div>
      {props.projectStyleGuide.state === "active" ? (
        <div className="binding-card">
          <strong>{props.projectStyleGuide.persistent ? "Project style guide connected" : "Project style guide active for this session"}</strong>
          <span>Version {props.projectStyleGuide.packVersion}</span>
          <b>Pack reference {friendlyReference(props.projectStyleGuide.digest)}</b>
          <small>{humanizeIdentifier(props.projectStyleGuide.projectScope)} · {humanizeIdentifier(props.projectStyleGuide.sourceId)}</small>
        </div>
      ) : props.projectStyleGuide.state === "invalid" ? (
        <div className="banner error">Stored binding rejected: {props.projectStyleGuide.error}</div>
      ) : (
        <div className="banner info">No project style guide connected. Standard Passport rules remain active.</div>
      )}
      <JsonFilePicker
        id="reference-pack-file"
        label="Choose a guide or reference pack"
        help="Select the pack exported by the local companion. Design Passport validates it before anything changes."
        value={props.referencePackRaw}
        maximumBytes={90_000}
        onLoad={props.onReferencePackRaw}
      />
      {props.referencePackRaw && !selectedPack ? <div className="banner error">This file is not a readable Design Passport guide or reference pack.</div> : null}
      {selectedPack ? <div className="file-summary"><strong>{selectedPack.role === "style-guide" ? "Project style guide" : "Session reference"} ready</strong><span>Version {selectedPack.version} · {selectedPack.factCount} guidance item{selectedPack.factCount === 1 ? "" : "s"}</span></div> : null}
      <div className="scope-actions">
        <button className="button primary" disabled={!props.canMutateDocument || !props.fileKeyAvailable || selectedPack?.role !== "style-guide"} onClick={props.onImportProjectStyleGuide}>{props.projectStyleGuide.state === "active" && props.projectStyleGuide.persistent ? "Replace project style guide" : "Connect project style guide"}</button>
        <button className="button" disabled={selectedPack?.role !== "reference" && !(selectedPack?.role === "style-guide" && !props.fileKeyAvailable)} onClick={props.onAddSessionReference}>{selectedPack?.role === "style-guide" ? "Use guide for this session" : "Use for this session"}</button>
        {props.projectStyleGuide.state === "active" && props.projectStyleGuide.persistent ? <button className="button subtle" disabled={!props.canMutateDocument} onClick={props.onRemoveProjectStyleGuide}>Remove style guide</button> : null}
      </div>
      <div className="inventory-row"><span><strong>Session references</strong><small className="sentence">Cleared whenever the plugin restarts</small></span><b>{props.sessionReferenceCount}</b></div>
      {props.sessionReferenceCount > 0 ? <button className="button subtle" onClick={props.onClearSessionReferences}>Clear session references</button> : null}
      {!props.canMutateDocument ? <p className="fine-print">Dev Mode can read and apply a connected style guide, but cannot import, replace, or remove it.</p> : null}
      {!props.fileKeyAvailable ? <p className="fine-print">This file has not been saved yet, so a style guide can be used for this session but cannot be connected permanently.</p> : null}
    </section>
  );
}

function JsonFilePicker(props: { id: string; label: string; help: string; value: string; maximumBytes: number; onLoad: (value: string) => void }) {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (!props.value) setFileName(""); }, [props.value]);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > props.maximumBytes) {
      setFileName("");
      setError(`That file is too large. Choose one smaller than ${props.maximumBytes >= 1_000_000 ? "2 MB" : "90 KB"}.`);
      props.onLoad("");
      return;
    }
    try {
      props.onLoad(await file.text());
      setFileName(file.name);
      setError("");
    } catch {
      setFileName("");
      setError("Design Passport could not read that file. Export a fresh copy and try again.");
      props.onLoad("");
    }
  };

  return <div className="file-picker">
    <label className="button" htmlFor={props.id}>{fileName ? "Choose a different file" : props.label}</label>
    <input id={props.id} type="file" accept=".json,application/json" onChange={choose} />
    <small>{fileName ? `Selected: ${fileName}` : props.help}</small>
    {error ? <span className="file-error">{error}</span> : null}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}

function ContextList({ title, empty, totalCount, children }: { title: string; empty: string; totalCount: number; children: ReactNode }) {
  const items = Children.toArray(children);
  return <details className="context-list"><summary>{title}<span>{totalCount}</span></summary><div>{items.length > 0 ? children : <p className="fine-print">{empty}</p>}{totalCount > items.length && <p className="fine-print">Showing the first {items.length.toLocaleString()} of {totalCount.toLocaleString()} indexed items.</p>}</div></details>;
}
