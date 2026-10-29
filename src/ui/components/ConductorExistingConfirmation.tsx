import type { ExistingFrameState } from "../../plugin/conductor-existing-state";
import type { ConductorCommand } from "../../plugin/conductor-state";

export function ConductorExistingConfirmation({ state, disabled, busy, send }: {
  state: ExistingFrameState;
  disabled: boolean;
  busy: boolean;
  send: (command: ConductorCommand) => void;
}) {
  const destination = state.destination!;
  const review = state.review!;
  const notes = state.frame.annotations.filter((note) => review.annotationIds.includes(note.id));
  return <div className="handoff-confirmation">
    <header className="handoff-confirmation-heading">
      <span className="handoff-step">Step 3 of 3</span>
      <h4>{state.intent ? "Confirm design changes · New design link" : "Confirm your handoff"}</h4>
      <p>Check the destination and design before sending.</p>
    </header>

    <section className="handoff-destination" aria-label="Confirmed destination">
      <span className="handoff-label">Destination</span>
      <p className="handoff-project">{destination.project.name}</p>
      <p className="handoff-deliverable">{destination.deliverable.name}<span aria-hidden="true"> / </span><span>Design tab</span></p>
      <h5>{destination.component.name}</h5>
    </section>

    <section className="handoff-design-summary" aria-label="Design details">
      <span className="handoff-label">Design name</span>
      <p className="handoff-design-name">{review.variantName}</p>
      <div className="handoff-badges">
        <span>{review.isDefaultAppearance ? "Default appearance" : "Named variant"}</span>
        <span>{review.deviceTargetSlug} · {state.frame.width}px</span>
      </div>
      <p className="handoff-source"><span>Figma frame</span>{state.frame.name}</p>
    </section>

    {review.message ? <section className="handoff-message" aria-label="Message for the Design discussion">
      <span className="handoff-label">Message · Design discussion</span>
      <p>{review.message}</p>
    </section> : null}

    {notes.length ? <details className="handoff-notes">
      <summary>{notes.length} {notes.length === 1 ? "annotation" : "annotations"} included</summary>
      <p>Checked annotations also become Functional Spec source evidence for BA confirmation.</p>
      <ul>{notes.map((note) => <li key={note.id}>{note.text}</li>)}</ul>
    </details> : <p className="handoff-reassurance">No annotations included.</p>}

    {state.intent ? <p>Authorized role holders from the current workflow stage who opted into Slack receive the design-change summary. Conductor inbox notices remain available.</p> : null}
    <p className="handoff-reassurance">Adds a frame link to Design. Your message and checked notes go to Design discussion. Approval and workflow stay unchanged.</p>
    <div className="handoff-confirmation-actions">
      <button className="button primary" disabled={disabled} onClick={() => send({ type: "conductor-confirm-existing" })}>{busy ? "Sending design…" : state.intent ? "Send design changes" : "Send design"}</button>
      <button className="button subtle" disabled={disabled} onClick={() => send({ type: "conductor-edit-existing" })}>Back to details</button>
    </div>
  </div>;
}
