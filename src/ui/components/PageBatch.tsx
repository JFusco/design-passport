import { useState } from "react";
import type { PageOption } from "../../figma/adapter";

export interface PageBatchProps {
  pages: PageOption[];
  disabled: boolean;
  excludedPageIds?: readonly string[];
  canSave?: boolean;
  onReview: (pageIds: string[]) => void;
}

export function PageBatch(props: PageBatchProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const included = props.pages.filter((page) => !props.excludedPageIds?.includes(page.id));
  const selectedPageIds = included.filter((page) => selected.includes(page.id)).map((page) => page.id);
  const allSelected = included.length > 0 && selectedPageIds.length === included.length;
  const disabled = props.disabled || props.canSave === false;
  return (
    <details className="page-batch">
      <summary>Review pages</summary>
      <div className="page-batch-body">
        <p className="fine-print">Prepare file context once and save a separate report for each selected page. You can stop between pages.</p>
        {props.canSave === false ? <p className="fine-print" role="status">Saving isn’t available for this file, so page batches are unavailable. Run individual audits and export their results before closing.</p> : null}
        <label className="check"><input type="checkbox" checked={allSelected} disabled={disabled || included.length === 0} onChange={(event) => setSelected(event.target.checked ? included.map((page) => page.id) : [])} />Select all included ({included.length})</label>
        <fieldset className="page-batch-list" disabled={disabled}>
          <legend>Pages to review</legend>
          {props.pages.map((page) => <label className="check" key={page.id}><input type="checkbox" disabled={props.excludedPageIds?.includes(page.id)} checked={selectedPageIds.includes(page.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, page.id] : current.filter((id) => id !== page.id))} /><span>{page.name}{props.excludedPageIds?.includes(page.id) ? " · excluded" : ""}</span></label>)}
        </fieldset>
        <button className="button" disabled={disabled || selectedPageIds.length === 0} onClick={() => props.onReview(selectedPageIds)}>Review selected pages ({selectedPageIds.length})</button>
      </div>
    </details>
  );
}
