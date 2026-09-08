import { Children, type ReactNode } from "react";
import type { KnowledgeSummary } from "../../plugin/messages";
import { relativeTime } from "../operations/presentation";

export interface ContextPanelProps {
  knowledge: KnowledgeSummary | undefined;
  codeConnectRaw: string;
  onCodeConnectRaw: (value: string) => void;
  onImport: () => void;
  onRefresh: () => void;
}

export function ContextPanel(props: ContextPanelProps) {
  return (
    <section className="panel stack">
      <div className="section-heading"><div><span className="section-label">Whole-file design knowledge</span><h2>{props.knowledge?.complete ? "Complete" : "Not built"}</h2></div><button className="button" onClick={props.onRefresh}>Rebuild context</button></div>
      {props.knowledge && <>
        <div className="context-grid">
          <Metric label="Pages loaded" value={`${props.knowledge.loadedPageCount} / ${props.knowledge.pageCount}`} />
          <Metric label="Nodes" value={props.knowledge.nodeCount.toLocaleString()} />
          <Metric label="Components" value={props.knowledge.componentCount.toLocaleString()} />
          <Metric label="Instances" value={props.knowledge.instanceCount.toLocaleString()} />
          <Metric label="Responsive families" value={props.knowledge.responsiveFamilyCount.toLocaleString()} />
          <Metric label="Repeated structures" value={props.knowledge.repeatedStructureGroupCount.toLocaleString()} />
        </div>
        <div className="snapshot"><span>Snapshot</span><code>{props.knowledge.snapshotHash}</code><small>Built {relativeTime(props.knowledge.builtAt)}</small></div>
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
      <div><span className="section-label">Optional Code Connect evidence</span><h2>Import `figma connect parse` JSON</h2><p className="fine-print">Only the current file key and existing node IDs are accepted. Template fields are validated for shape, then discarded without execution or rendering.</p></div>
      <textarea rows={8} value={props.codeConnectRaw} onChange={(event) => props.onCodeConnectRaw(event.target.value)} placeholder={'{"docs":[…]}'} />
      <button className="button" disabled={!props.codeConnectRaw.trim()} onClick={props.onImport}>Validate and import evidence</button>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}

function ContextList({ title, empty, totalCount, children }: { title: string; empty: string; totalCount: number; children: ReactNode }) {
  const items = Children.toArray(children);
  return <details className="context-list"><summary>{title}<span>{totalCount}</span></summary><div>{items.length > 0 ? children : <p className="fine-print">{empty}</p>}{totalCount > items.length && <p className="fine-print">Showing the first {items.length.toLocaleString()} of {totalCount.toLocaleString()} indexed items.</p>}</div></details>;
}
