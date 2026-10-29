import { ConductorDesignChange } from "./ConductorDesignChange";
import { ConductorExistingFrame } from "./ConductorExistingFrame";
import { ConductorSubmission } from "./ConductorSubmission";
import { useState } from "react";
import type { ConductorCommand, ConductorPresentation } from "../../plugin/conductor-state";

export function ConductorPanel({ state, send }: { state: ConductorPresentation; send: (command: ConductorCommand) => void }) {
  const [environment, setEnvironment] = useState(state.environments[0]?.id ?? "");
  const selectedEnvironment = state.environments.some((entry) => entry.id === environment) ? environment : state.environments[0]?.id ?? "";
  const connected = state.state === "connected";
  const busy = Boolean(state.busy);
  const reviewing = Boolean(state.existing || state.change || state.recovery || state.redacted);
  return <section className="panel stack conductor-panel" aria-labelledby="conductor-title">
    <div className="conductor-heading"><div><span className="conductor-eyebrow">DESIGN WORKSPACES</span><h2 id="conductor-title">{connected ? "Design workspaces" : "Connect to Conductor"}</h2></div><span className={`conductor-status ${connected ? "connected" : ""}`}>{connected ? "Connected" : state.state === "pairing" ? "Awaiting approval" : state.state === "error" || state.state === "unavailable" ? "Needs attention" : state.busy === "choosing" ? "Loading projects, deliverables and components…" : state.busy === "connecting" ? "Connecting…" : "Not connected"}</span></div>
    {!reviewing ? <><p>Select an independently created frame and choose Send existing frame to Conductor to choose its destination, name, appearance and project breakpoint. Review the full destination before sending.</p>
    <p>Bring an existing component into Figma, design its replacement, and send it back to the same Conductor component.</p>
    <p className="conductor-footnote">This connection is optional. Without Design Passport, use Add Design in Conductor to upload a screenshot or link a Figma frame, and add handoff notes there. Preparing a workspace does not send your edits back automatically.</p>
    <details className="conductor-guide"><summary>How this works</summary><ol className="conductor-steps">
      <li><strong>Connect this plugin</strong><span>Choose your Conductor environment, then select Connect in browser. Sign in, check the matching code and approve access. Return to Figma when the plugin says Connected.</span></li>
      <li><strong>Prepare in Conductor</strong><span>Open the component’s Design tab and choose Prepare in Figma. Select the screenshot and device. To link a file, copy its link from Figma’s Share menu, paste it into Figma Design file URL in that dialog, then select Link Figma file. A project lead must do this if linking is unavailable to you.</span></li>
      <li><strong>Create the workspace here</strong><span>Select Refresh workspaces, then Prepare workspace. Keep this file and plugin open. Reference is the locked original; Wireframe is an editable starting point; Design is where you create the replacement.</span></li>
      <li><strong>Submit the replacement</strong><span>Select the Design frame, or annotated layers inside it, then Use selected design frames. Check the component name, enter a message and check the notes to include. Submit selected design saves them in that component’s Design discussion.</span></li>
    </ol></details></> : null}
    <div className="conductor-connection">
      <p role={state.hasError ? "alert" : "status"} aria-live={state.hasError ? "assertive" : "polite"}>{state.message}</p>
      {state.busy ? <p role="status">{state.busy === "choosing" ? "Loading projects, deliverables and components…" : state.busy === "connecting" ? "Starting the browser connection…" : state.busy === "refreshing" ? "Checking workspace and submission status…" : state.busy === "inspecting" ? "Checking your selection and permitted workflow actions…" : state.busy === "submitting" ? "Saving your design links and checked notes in Conductor…" : "Preparing the reference, wireframe and Design frames. Keep this file and plugin open…"}</p> : null}
      {state.userCode ? <div className="conductor-code"><span>Confirm this code in Conductor</span><strong>{state.userCode}</strong><small>Approval expires after ten minutes.</small></div> : null}
      {!connected && state.state !== "pairing" && state.environments.length ? <><label htmlFor="conductor-environment">Environment</label><select id="conductor-environment" disabled={busy} value={selectedEnvironment} onChange={(event) => setEnvironment(event.target.value)}>{state.environments.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select><button className="button primary" disabled={busy} onClick={() => send({ type: "conductor-connect", environment: selectedEnvironment })}>Connect in browser</button></> : null}
      {state.destination && !reviewing ? <p><strong>{state.destination.project}</strong> / {state.destination.deliverable}{state.destination.component ? ` / ${state.destination.component}` : ""}</p> : null}
      {connected ? <div className="conductor-actions">{!reviewing ? <button className="button" disabled={busy} onClick={() => send({ type: "conductor-refresh" })}>Refresh workspaces</button> : null}<button className="button subtle" onClick={() => send({ type: "conductor-disconnect" })}>Disconnect</button></div> : null}
      {connected && !reviewing ? <button className="button" disabled={busy} onClick={() => send({ type: "conductor-inspect-selection" })}>Use selected design frames</button> : null}
      {state.state === "pairing" ? <button className="button subtle" onClick={() => send({ type: "conductor-disconnect" })}>Cancel connection</button> : null}
    </div>
    {connected && !reviewing && state.jobs.length === 0 ? <p className="conductor-empty">No workspaces waiting in this file. Choose Prepare in Figma on a component in Conductor, then refresh here.</p> : null}
    {connected && !state.recovery && !state.change ? <button className="button" disabled={busy} onClick={() => send({ type: "conductor-start-existing" })}>{state.existing ? "Start over with selected frame" : "Send existing frame to Conductor"}</button> : null}
    {connected && !reviewing && state.supportsDesignChanges ? <button className="button primary" disabled={busy} onClick={() => send({ type: "conductor-start-change" })}>Send design changes</button> : null}
    {connected && state.change ? <ConductorDesignChange state={state.change} disabled={busy} send={send} /> : null}
    {connected && state.recovery ? <section className="conductor-connection" aria-label="Pending send recovery"><h3>Pending design send</h3><p>{state.recovery.summary}</p>
      {state.recovery.destination ? <p>{state.recovery.destination.project} / {state.recovery.destination.deliverable} / {state.recovery.destination.component} → Design</p> : null}
      <button className="button" disabled={busy} onClick={() => send({ type: "conductor-check-pending" })}>Check saved receipt</button>
      {state.recovery.retryCommand && !state.recovery.confirming ? <button className="button" disabled={busy} onClick={() => send({ type: state.recovery!.retryCommand! })}>Review original send</button> : null}
      {state.recovery.canResolve ? state.recovery.confirming ? <button className="button primary" disabled={busy} onClick={() => send({ type: "conductor-resolve-pending" })}>Confirm resolution</button> : <button className="button" disabled={busy} onClick={() => send({ type: "conductor-request-resolution" })}>Resolve pending send</button> : <p>Reconnect to a Conductor server supporting pending-send recovery. Keep this pending request until its saved receipt or cancellation is confirmed.</p>}</section> : null}
    {connected && state.existing ? <ConductorExistingFrame state={state.existing} failed={Boolean(state.hasError)} disabled={busy} busy={state.busy === "submitting"} send={send} /> : null}
    {connected && state.existingResult ? <button className="button" disabled={busy} onClick={() => send({ type: "conductor-open-existing-result" })}>Open component’s Design tab</button> : null}
    {!reviewing && state.jobs.map((job) => <article key={job.id} className="conductor-job"><div><strong>{job.name}</strong><span>{job.device} · {job.state.replaceAll("_", " ")}</span></div><button className="button" disabled={busy || !job.canApply} onClick={() => send({ type: "conductor-apply", jobId: job.id })}>Prepare workspace</button></article>)}
    {!reviewing && state.submission ? state.submission.retry ? <section className="conductor-connection" aria-label="Review original send">
      <h3>Retry original send to {state.submission.componentName}</h3>
      <p>{state.submission.frames.map(frame => frame.name).join(", ")}</p><p>{state.submission.retry.message}</p>
      <ul>{state.submission.annotations.filter(note => state.submission!.retry!.annotationIds.includes(note.id)).map(note => <li key={note.id}>{note.text}</li>)}</ul>
      <p>Workflow action: {state.submission.transitions.find(action => action.id === state.submission!.retry!.transitionId)?.label ?? "Save design and notes"}</p>
      <button className="button primary" disabled={busy} onClick={() => send({ type: "conductor-submit", ...state.submission!.retry! })}>Retry original send</button>
    </section> : <ConductorSubmission key={state.submission.frames.map((frame) => frame.id).join(",")} selection={state.submission} busy={state.busy === "submitting"} disabled={busy} send={send} /> : null}
    <p className="conductor-footnote">Connections expire after eight hours and can be revoked from your Conductor profile. Audit, Report and Cleanup stay available offline. Preparing or submitting a design does not approve it.</p>
  </section>;
}
