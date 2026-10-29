import { ConductorExistingConfirmation } from "./ConductorExistingConfirmation";
import { useState } from "react";
import type { ConductorCommand } from "../../plugin/conductor-state";
import type { ExistingFrameState } from "../../plugin/conductor-existing-state";

type Props = { state: ExistingFrameState; disabled: boolean; busy: boolean; failed?: boolean; send: (command: ConductorCommand) => void };
export function ConductorExistingFrame({ state, disabled, busy, failed = false, send }: Props) {
  const [search, setSearch] = useState("");
  const { query, destination, frame } = state;
  const level = !query.projectId ? "Project" : !query.deliverableId ? "Deliverable" : "Feature / component";
  return <section className="conductor-connection conductor-handoff" aria-labelledby="existing-frame-heading">
    <h3 id="existing-frame-heading">{state.intent ? "Send design changes · New design link" : "Send existing frame"}</h3>
    {state.intent && !destination ? <button className="button subtle" disabled={disabled} onClick={() => send({ type: "conductor-cancel-send" })}>Cancel</button> : null}
    {!state.review ? <p className="handoff-frame-context"><strong>{frame.name}</strong> · {frame.width}px wide</p> : null}
    {destination ? <ExistingFrameDetails key={`${destination.project.id}/${destination.deliverable.id}/${destination.component.id}/${Boolean(state.review)}`} {...{ state, disabled, busy, send }} /> : <>
      <p>Step 1 of 3: Choose a project, then a deliverable and feature/component. Nothing is saved until you confirm.</p>
      {state.path ? <p><strong>Selected destination:</strong> {state.path.project}{state.path.deliverable ? ` / ${state.path.deliverable}` : ""}</p> : null}
      {query.projectId ? <button className="button subtle" disabled={disabled} onClick={() => send({ type: "conductor-existing-destination" })}>Change project</button> : null}
      {query.deliverableId ? <button className="button subtle" disabled={disabled} onClick={() => send({ type: "conductor-existing-destination", projectId: query.projectId! })}>Change deliverable</button> : null}
      <label htmlFor="existing-search">Search {level.toLowerCase()}</label>
      <input id="existing-search" disabled={disabled} maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} />
      <button className="button" disabled={disabled} onClick={() => send({ type: "conductor-existing-destination", ...(query.projectId ? { projectId: query.projectId } : {}), ...(query.deliverableId ? { deliverableId: query.deliverableId } : {}), ...(search.trim() ? { search: search.trim() } : {}) })}>Search / retry</button>
      <label htmlFor="existing-destination">{level}</label>
      <select id="existing-destination" disabled={disabled || !state.options.length} value="" onChange={(event) => { const id = event.target.value; if (!id) return; setSearch(""); send({ type: "conductor-existing-destination", ...(query.projectId ? { projectId: query.projectId } : {}), ...(query.deliverableId ? { deliverableId: query.deliverableId } : {}), ...(!query.projectId ? { projectId: id } : !query.deliverableId ? { deliverableId: id } : { componentId: id }) }); }}>
        <option value="">Choose {level.toLowerCase()}</option>
        {state.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
      {failed ? <p>Destination choices did not load. Choose Search / retry to try again.</p> : null}
      {!disabled && !failed && !state.options.length ? <p>No {level.toLowerCase()} choices are available. Try another search or ask your project lead to check your project access and setup.</p> : null}
      {state.more ? <p>Showing the first 100 choices. Search by name to narrow the list.</p> : null}
    </>}
  </section>;
}

function ExistingFrameDetails({ state, disabled, busy, send }: Props) {
  const target = state.destination!;
  const matching = target.devices.filter((device) => device.width === state.frame.width);
  const [deviceSlug, setDeviceSlug] = useState(state.details?.deviceTargetSlug ?? (matching.length === 1 ? matching[0]!.slug : ""));
  const [name, setName] = useState(state.details?.variantName ?? state.frame.name);
  const [isDefault, setDefault] = useState(state.details?.isDefaultAppearance ?? (matching.length === 1 && !matching[0]!.hasDefault));
  const [message, setMessage] = useState(state.details?.message ?? "");
  const [annotations, setAnnotations] = useState<string[]>(state.details?.annotationIds ?? []);
  const device = target.devices.find((entry) => entry.slug === deviceSlug);
  const path = `${target.project.name} / ${target.deliverable.name} / ${target.component.name}`;
  const review = state.review;
  if (review) return <ConductorExistingConfirmation {...{ state, disabled, busy, send }} />;
  const widthMatches = Boolean(device && device.width === state.frame.width);
  return <>
    <h4>Step 2 of 3: Design details</h4>
    <p><strong>Destination:</strong> {path} → Design tab</p>
    <button className="button subtle" disabled={disabled} onClick={() => send({ type: "conductor-existing-destination" })}>Change destination</button>
    <label htmlFor="existing-name">Design / variant name</label><input id="existing-name" disabled={disabled} maxLength={200} value={name} onChange={(event) => setName(event.target.value)} />
    <label htmlFor="existing-device">Project breakpoint</label><select id="existing-device" disabled={disabled} value={deviceSlug} onChange={(event) => { setDeviceSlug(event.target.value); const next = target.devices.find((entry) => entry.slug === event.target.value); setDefault(Boolean(next && !next.hasDefault)); }}><option value="">Choose a configured breakpoint</option>{target.devices.map((entry) => <option key={entry.slug} value={entry.slug}>{entry.slug} · {entry.width}px{entry.width !== state.frame.width ? " — width does not match" : ""}</option>)}</select>
    {!matching.length ? <p role="alert">This frame is {state.frame.width}px wide. {target.devices.length ? `This project requires ${target.devices.map((entry) => `${entry.slug}: ${entry.width}px`).join(", ")}. Resize the frame in Figma, then start Send existing frame again.` : "This project has no configured breakpoints. Ask your project lead to configure them in Conductor."}</p> : !widthMatches ? <p role="alert">Choose a breakpoint matching the frame’s {state.frame.width}px width.</p> : <p>Width matches {device!.slug}: {device!.width}px.</p>}
    <label htmlFor="existing-appearance">Appearance</label><select id="existing-appearance" disabled={disabled} value={isDefault ? "default" : "variant"} onChange={(event) => setDefault(event.target.value === "default")}><option value="default">Default appearance</option><option value="variant">Named variant</option></select>
    {isDefault && device?.hasDefault ? <p role="alert">A default already exists for this breakpoint. Choose Named variant and a unique name. The existing default will stay unchanged.</p> : <p>{isDefault ? "This will be the component’s default design for this breakpoint." : "Use a distinct name for this alternate appearance."}</p>}
    <label htmlFor="existing-message">{state.intent ? "What changed? (required)" : "Message for the Design discussion (optional)"}</label><textarea id="existing-message" disabled={disabled} rows={3} maxLength={10000} value={message} onChange={(event) => setMessage(event.target.value)} />
    {state.intent ? <>
      <p>Describe what changed. If there is no design change, cancel and use Design Notes in Conductor.</p>
      <p>You can deliberately send a new submission with a new summary. Conductor does not compare the visuals.</p>
      <p>No workflow action. Approval and workflow stay unchanged.</p>
      <p>Applicable workflow role holders receive a Conductor inbox notice. Eligible role holders who opted into Slack also receive a Slack direct message after the update is saved. Slack delivery may be unavailable or fail separately.</p>
    </> : null}
    {state.frame.annotations.length ? <fieldset><legend>Frame annotations to include</legend>{state.frame.annotations.map((note) => <label key={note.id} className="conductor-annotation"><input type="checkbox" disabled={disabled} checked={annotations.includes(note.id)} onChange={(event) => setAnnotations((previous) => event.target.checked ? [...previous, note.id] : previous.filter((id) => id !== note.id))} /><span>{note.text}</span></label>)}</fieldset> : <p>No annotations on this selected frame. Notes on other layers are not collected.</p>}
    <p>Checked notes become Functional Spec source evidence requiring BA confirmation. They do not establish approved requirements.</p>
    <button className="button subtle" disabled={disabled} onClick={() => send({ type: "conductor-cancel-send" })}>Cancel</button>
    <button className="button primary" disabled={disabled || (Boolean(state.intent) && !message.trim()) || !name.trim() || !widthMatches || (isDefault && Boolean(device?.hasDefault))} onClick={() => send({ type: "conductor-review-existing", variantName: name.trim(), isDefaultAppearance: isDefault, deviceTargetSlug: deviceSlug, message, annotationIds: annotations })}>Review destination and details</button>
  </>;
}
