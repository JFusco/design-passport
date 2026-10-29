import { ConductorSubmission } from "./ConductorSubmission";
import { useState } from "react";
import type { ConductorCommand, ConductorPresentation } from "../../plugin/conductor-state";

export function ConductorPanel({ state, send }: { state: ConductorPresentation; send: (command: ConductorCommand) => void }) {
  const [environment, setEnvironment] = useState(state.environments[0]?.id ?? "");
  const selectedEnvironment = state.environments.some((entry) => entry.id === environment) ? environment : state.environments[0]?.id ?? "";
  const connected = state.state === "connected";
  const busy = Boolean(state.busy);
  return <section className="panel stack conductor-panel" aria-labelledby="conductor-title">
    <div className="conductor-heading"><div><span className="conductor-eyebrow">DESIGN WORKSPACES</span><h2 id="conductor-title">{connected ? "Design workspaces" : "Connect to Conductor"}</h2></div><span className={`conductor-status ${connected ? "connected" : ""}`}>{connected ? "Connected" : state.state === "pairing" ? "Awaiting approval" : state.state === "error" || state.state === "unavailable" ? "Needs attention" : state.busy === "connecting" ? "Connecting…" : "Not connected"}</span></div>
    <p>Bring an existing component into Figma, design its replacement, and send it back to the same Conductor component.</p>
    <p className="conductor-footnote">This connection is optional. Without Design Passport, use Add Design in Conductor to upload a screenshot or link a Figma frame, and add handoff notes there. Preparing a workspace does not send your edits back automatically.</p>
    <details className="conductor-guide"><summary>How this works</summary><ol className="conductor-steps">
      <li><strong>Connect this plugin</strong><span>Choose your Conductor environment, then select Connect in browser. Sign in, check the matching code and approve access. Return to Figma when the plugin says Connected.</span></li>
      <li><strong>Prepare in Conductor</strong><span>Open the component’s Design tab and choose Prepare in Figma. Select the screenshot and device. To link a file, copy its link from Figma’s Share menu, paste it into Figma Design file URL in that dialog, then select Link Figma file. A project lead must do this if linking is unavailable to you.</span></li>
      <li><strong>Create the workspace here</strong><span>Select Refresh workspaces, then Prepare workspace. Keep this file and plugin open. Reference is the locked original; Wireframe is an editable starting point; Design is where you create the replacement.</span></li>
      <li><strong>Submit the replacement</strong><span>Select the Design frame, or annotated layers inside it, then Use selected design frames. Check the component name, enter a message and check the notes to include. Submit selected design saves them in that component’s Design discussion.</span></li>
    </ol></details>
    <div className="conductor-connection">
      <p role={state.hasError ? "alert" : "status"} aria-live={state.hasError ? "assertive" : "polite"}>{state.message}</p>
      {state.busy ? <p role="status">{state.busy === "connecting" ? "Starting the browser connection…" : state.busy === "refreshing" ? "Checking workspace and submission status…" : state.busy === "inspecting" ? "Checking your selection and permitted workflow actions…" : state.busy === "submitting" ? "Saving your design links and checked notes in Conductor…" : "Preparing the reference, wireframe and Design frames. Keep this file and plugin open…"}</p> : null}
      {state.userCode ? <div className="conductor-code"><span>Confirm this code in Conductor</span><strong>{state.userCode}</strong><small>Approval expires after ten minutes.</small></div> : null}
      {!connected && state.state !== "pairing" && state.environments.length ? <><label htmlFor="conductor-environment">Environment</label><select id="conductor-environment" disabled={busy} value={selectedEnvironment} onChange={(event) => setEnvironment(event.target.value)}>{state.environments.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select><button className="button primary" disabled={busy} onClick={() => send({ type: "conductor-connect", environment: selectedEnvironment })}>Connect in browser</button></> : null}
      {state.destination ? <p><strong>{state.destination.project}</strong> / {state.destination.deliverable}{state.destination.component ? ` / ${state.destination.component}` : ""}</p> : null}
      {connected ? <div className="conductor-actions"><button className="button" disabled={busy} onClick={() => send({ type: "conductor-refresh" })}>Refresh workspaces</button><button className="button subtle" onClick={() => send({ type: "conductor-disconnect" })}>Disconnect</button></div> : null}
      {connected ? <button className="button" disabled={busy} onClick={() => send({ type: "conductor-inspect-selection" })}>Use selected design frames</button> : null}
      {state.state === "pairing" ? <button className="button subtle" onClick={() => send({ type: "conductor-disconnect" })}>Cancel connection</button> : null}
    </div>
    {connected && state.jobs.length === 0 ? <p className="conductor-empty">No workspaces waiting in this file. Choose Prepare in Figma on a component in Conductor, then refresh here.</p> : null}
    {state.jobs.map((job) => <article key={job.id} className="conductor-job"><div><strong>{job.name}</strong><span>{job.device} · {job.state.replaceAll("_", " ")}</span></div><button className="button" disabled={busy || !job.canApply} onClick={() => send({ type: "conductor-apply", jobId: job.id })}>Prepare workspace</button></article>)}
    {state.submission ? <ConductorSubmission key={state.submission.frames.map((frame) => frame.id).join(",")} selection={state.submission} busy={state.busy === "submitting"} disabled={busy} send={send} /> : null}
    <p className="conductor-footnote">Connections expire after eight hours and can be revoked from your Conductor profile. Audit, Report and Cleanup stay available offline. Preparing or submitting a design does not approve it.</p>
  </section>;
}
