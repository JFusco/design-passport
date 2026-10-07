import type { PageOption } from "../../figma/adapter";

export function suggestedExcludedPage(name: string): boolean {
  return /^(?:(?:cover|separator)(?:\s|$)|[-—_=·•\s]+$)|\barchive(?:d)?\b/iu.test(name.trim());
}
export function PageExclusions(props: { pages: PageOption[]; excluded: readonly string[]; disabled: boolean; onChange: (ids: string[]) => void; onConfirm: () => void; dirty: boolean }) {
  return <section className="page-exclusions" aria-label="Skipped pages">
    <h2>Skipped pages</h2><p>Avoid pages that aren’t relevant to the report, such as mood boards and archives. Confirmed skips are excluded from context.</p>
    <div className="excluded-page-list"><ul>{props.pages.filter((page) => props.excluded.includes(page.id)).map((page) => <li key={page.id}>{page.name}</li>)}{props.excluded.length === 0 ? <li>No pages skipped</li> : null}</ul>
    <details className="page-batch">
    <summary>Skip additional pages +</summary>
    <div className="page-batch-body stack"><p>Suggestions stay included until you confirm. Page roles are separate.</p>
    {props.pages.map((page) => <label className="check" key={page.id}><input type="checkbox" disabled={props.disabled} checked={props.excluded.includes(page.id)} onChange={(event) => props.onChange(event.target.checked ? [...new Set([...props.excluded, page.id])].sort() : props.excluded.filter((id) => id !== page.id))} /><span>Skip {page.name}{suggestedExcludedPage(page.name) ? <small>Suggested</small> : null}</span></label>)}
    </div></details></div>
    {props.dirty ? <p role="status">Page exclusions have unsaved changes.</p> : null}
    <button className="button primary" disabled={props.disabled || !props.dirty} onClick={props.onConfirm}>Confirm page exclusions</button>
  </section>;
}
