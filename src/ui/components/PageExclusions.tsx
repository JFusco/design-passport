import type { PageOption } from "../../figma/adapter";

export function suggestedExcludedPage(name: string): boolean {
  return /^(?:(?:cover|separator)(?:\s|$)|[-—_=·•\s]+$)|\barchive(?:d)?\b/iu.test(name.trim());
}
export function PageExclusions(props: { pages: PageOption[]; excluded: readonly string[]; disabled: boolean; onChange: (ids: string[]) => void; onConfirm: () => void; dirty: boolean }) {
  return <details className="page-batch">
    <summary>Pages included in context · {props.pages.length - props.excluded.length} of {props.pages.length}</summary>
    <div className="page-batch-body stack"><p>Choose pages to skip. Suggested covers, separators and archives stay included until you confirm. Page roles are separate.</p>
    {props.pages.map((page) => <label className="check" key={page.id}><input type="checkbox" disabled={props.disabled} checked={props.excluded.includes(page.id)} onChange={(event) => props.onChange(event.target.checked ? [...new Set([...props.excluded, page.id])].sort() : props.excluded.filter((id) => id !== page.id))} /><span>Skip {page.name}{suggestedExcludedPage(page.name) ? <small>Suggested</small> : null}</span></label>)}
    <button className="button primary" disabled={props.disabled || !props.dirty} onClick={props.onConfirm}>Confirm page exclusions</button></div>
  </details>;
}
