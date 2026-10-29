import { useState } from "react";
import type { DesignChangeState } from "../../plugin/conductor-change-controller";
import type { ConductorCommand } from "../../plugin/conductor-state";
export function ConductorDesignChange({ state, disabled, send }: {
  state: DesignChangeState; disabled: boolean; send: (command: ConductorCommand) => void;
}) {
  const [summary, setSummary] = useState(state.review?.summary ?? "");
  const [checked, setChecked] = useState<string[]>(state.review?.annotationIds ?? []);
  const review = state.review;
  return <section className="conductor-connection" aria-labelledby="design-change-heading">
    <h3 id="design-change-heading">{review ? "Confirm design changes" : "Send design changes"}</h3>
    <p><strong>{state.project} / {state.deliverable} / {state.feature}</strong> → Design discussion</p>
    <ul>{state.frames.map(frame => <li key={frame.id}><strong>{frame.name}</strong>: {frame.variantName} · {frame.appearance} · {frame.breakpoint} · {frame.width}px{frame.newLink ? " · New design link" : ""}</li>)}</ul>
    {review ? <><p><strong>Design-change summary</strong></p><p>{review.summary}</p>
      <p><strong>Checked annotations</strong></p>{review.annotationIds.length ? <ul>{state.annotations.filter(note => review.annotationIds.includes(note.id)).map(note => <li key={note.id}>{note.text}</li>)}</ul> : <p>No annotations included.</p>}
      <button className="button primary" disabled={disabled} onClick={() => send({ type: "conductor-confirm-change" })}>Send design changes</button>
      <button className="button subtle" disabled={disabled} onClick={() => send({ type: "conductor-edit-change" })}>Back to summary</button>
    </> : <>
      <label htmlFor="design-change-summary">What changed? (required)</label><textarea id="design-change-summary" rows={4} maxLength={10000} disabled={disabled} value={summary} onChange={event => setSummary(event.target.value)} />
      <p>If nothing changed, cancel and use Design Notes in Conductor.</p>
      {state.annotations.length ? <fieldset><legend>Annotations to include</legend>{state.annotations.map(note => <label key={note.id} className="conductor-annotation"><input type="checkbox" disabled={disabled} checked={checked.includes(note.id)} onChange={event => setChecked(previous => event.target.checked ? [...previous, note.id] : previous.filter(id => id !== note.id))} /><span>{note.text}</span></label>)}</fieldset> : <p>No annotations selected. Select annotated layers inside these Design frames to include their notes.</p>}
      <button className="button primary" disabled={disabled || !summary.trim()} onClick={() => send({ type: "conductor-review-change", summary, annotationIds: checked })}>Review design changes</button>
    </>}
    <button className="button subtle" disabled={disabled} onClick={() => send({ type: "conductor-cancel-send" })}>Cancel</button>
    <p>Saves frame links, your summary and checked notes. Applicable workflow roles keep their Conductor inbox notices; authorized role holders who opted into Slack receive a message. Sending makes no workflow change or approval. Checked annotations require BA confirmation before becoming approved requirements.</p>
  </section>;
}
