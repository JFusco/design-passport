import { useState } from "react";
import type { ConductorCommand, ConductorPresentation } from "../../plugin/conductor-state";

export function ConductorSubmission({ selection, send }: { selection: NonNullable<ConductorPresentation["submission"]>; send: (command: ConductorCommand) => void }) {
  const [message, setMessage] = useState(selection.message);
  const [annotations, setAnnotations] = useState<string[]>([]);
  const [transitionId, setTransitionId] = useState("");
  return <section className="conductor-connection" aria-labelledby="conductor-submission-heading">
    <h3 id="conductor-submission-heading">Submit to {selection.componentName}</h3>
    <p>{selection.frames.map((frame) => frame.name).join(", ")}</p>
    <label htmlFor="conductor-message">Message</label><textarea id="conductor-message" rows={4} maxLength={10000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain what changed and what needs review." />
    {selection.annotations.length ? <fieldset><legend>Annotations to include</legend>{selection.annotations.map((annotation) => <label key={annotation.id} className="conductor-annotation"><input type="checkbox" checked={annotations.includes(annotation.id)} onChange={(event) => setAnnotations((previous) => event.target.checked ? [...previous, annotation.id] : previous.filter((id) => id !== annotation.id))} /><span>{annotation.text}</span></label>)}</fieldset> : <p>Select annotated layers inside a Design frame to include their notes explicitly.</p>}
    <label htmlFor="conductor-transition">Workflow action (optional)</label><select id="conductor-transition" value={transitionId} onChange={(event) => setTransitionId(event.target.value)}><option value="">Save design and notes</option>{selection.transitions.map((transition) => <option key={transition.id} value={transition.id}>{transition.label}</option>)}</select>
    <button className="button primary" onClick={() => send({ type: "conductor-submit", message, annotationIds: annotations, transitionId })}>Submit selected design</button>
    <p>Frame links and selected notes are saved together. If a workflow action is refused, the design submission stays saved.</p>
  </section>;
}
