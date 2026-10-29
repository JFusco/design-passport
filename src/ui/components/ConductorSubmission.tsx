import { useState } from "react";
import type { ConductorCommand, ConductorPresentation } from "../../plugin/conductor-state";

export function ConductorSubmission({ selection, send, busy = false, disabled = false }: { busy?: boolean; disabled?: boolean; selection: NonNullable<ConductorPresentation["submission"]>; send: (command: ConductorCommand) => void }) {
  const [message, setMessage] = useState(selection.message);
  const [annotations, setAnnotations] = useState<string[]>([]);
  const [transitionId, setTransitionId] = useState("");
  return <section className="conductor-connection" aria-labelledby="conductor-submission-heading">
    <h3 id="conductor-submission-heading">Submit to {selection.componentName}</h3>
    <p>{selection.frames.map((frame) => frame.name).join(", ")}</p>
    <ol><li>Check the component and selected frames above.</li><li>Add a message and check the notes to include.</li><li>Choose an optional workflow action, then submit.</li></ol>
    <label htmlFor="conductor-message">Message for the Design discussion</label><textarea id="conductor-message" disabled={disabled} rows={4} maxLength={10000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain what changed and what needs review." />
    {selection.annotations.length ? <fieldset><legend>Annotations to include</legend>{selection.annotations.map((annotation) => <label key={annotation.id} className="conductor-annotation"><input type="checkbox" disabled={disabled} checked={annotations.includes(annotation.id)} onChange={(event) => setAnnotations((previous) => event.target.checked ? [...previous, annotation.id] : previous.filter((id) => id !== annotation.id))} /><span>{annotation.text}</span></label>)}</fieldset> : <p>Select annotated layers inside a Design frame to include their notes explicitly.</p>}
    <label htmlFor="conductor-transition">Workflow action (optional)</label><select id="conductor-transition" disabled={disabled} value={transitionId} onChange={(event) => setTransitionId(event.target.value)}><option value="">Save design and notes</option>{selection.transitions.map((transition) => <option key={transition.id} value={transition.id}>{transition.label}</option>)}</select>
    <button className="button primary" disabled={disabled} onClick={() => send({ type: "conductor-submit", message, annotationIds: annotations, transitionId })}>{busy ? "Saving design and notes…" : "Submit selected design"}</button>
    <p>Frame links, your message and checked annotations are saved in this component’s Design discussion. Submitted annotations can be used as Functional Spec source evidence; they do not become approved requirements automatically.</p>
    <p>Leaving the workflow action on Save design and notes keeps the current workflow state. If a chosen action is refused, the design submission stays saved.</p>
  </section>;
}
