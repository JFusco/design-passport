import { ConductorSubmission } from "./ConductorSubmission";
import { useState } from "react";
import type { ConductorCommand, ConductorPresentation } from "../../plugin/conductor-state";

export function ConductorPanel({ state, send }: { state: ConductorPresentation; send: (command: ConductorCommand) => void }) {
  const [environment, setEnvironment] = useState(state.environments[0]?.id ?? "");
  const selectedEnvironment = state.environments.some((entry) => entry.id === environment) ? environment : state.environments[0]?.id ?? "";
  const connected = state.state === "connected";
  return <section className="panel stack conductor-panel" aria-labelledby="conductor-title">
    <div className="conductor-heading"><div><span className="conductor-eyebrow">DESIGN WORKSPACES</span><h2 id="conductor-title">{connected ? "Design workspaces" : "Connect to Conductor"}</h2></div><span className={`conductor-status ${connected ? "connected" : ""}`}>{connected ? "Connected" : state.state === "pairing" ? "Awaiting approval" : "Offline"}</span></div>
    <p>Bring an existing component into Figma, design its replacement, and send it back to the same Conductor component.</p>
    <details className="conductor-guide"><summary>How this works</summary><ol className="conductor-steps">
      <li><strong>Prepare in Conductor</strong><span>Select a component screenshot and device. Your lead links one Figma file per deliverable.</span></li>
      <li><strong>Make room for a new design</strong><span>Keep the original reference beside an editable wireframe and a blank Design frame.</span></li>
      <li><strong>Send your design back</strong><span>Submit your frame links, a message and selected annotations when you’re ready.</span></li>
    </ol></details>
    <div className="conductor-connection">
      <p role="status" aria-live="polite">{state.message}</p>
      {state.userCode ? <div className="conductor-code"><span>Confirm this code in Conductor</span><strong>{state.userCode}</strong><small>Approval expires after ten minutes.</small></div> : null}
      {!connected && state.state !== "pairing" && state.environments.length ? <><label htmlFor="conductor-environment">Environment</label><select id="conductor-environment" value={selectedEnvironment} onChange={(event) => setEnvironment(event.target.value)}>{state.environments.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select><button className="button primary" onClick={() => send({ type: "conductor-connect", environment: selectedEnvironment })}>Connect in browser</button></> : null}
      {state.destination ? <p><strong>{state.destination.project}</strong> / {state.destination.deliverable}{state.destination.component ? ` / ${state.destination.component}` : ""}</p> : null}
      {connected ? <div className="conductor-actions"><button className="button" onClick={() => send({ type: "conductor-refresh" })}>Refresh workspaces</button><button className="button subtle" onClick={() => send({ type: "conductor-disconnect" })}>Disconnect</button></div> : null}
      {connected ? <button className="button" onClick={() => send({ type: "conductor-inspect-selection" })}>Use selected design frames</button> : null}
      {state.state === "pairing" ? <button className="button subtle" onClick={() => send({ type: "conductor-disconnect" })}>Cancel connection</button> : null}
    </div>
    {connected && state.jobs.length === 0 ? <p className="conductor-empty">No workspaces waiting in this file. Choose Prepare in Figma on a component in Conductor, then refresh here.</p> : null}
    {state.jobs.map((job) => <article key={job.id} className="conductor-job"><div><strong>{job.name}</strong><span>{job.device} · {job.state.replaceAll("_", " ")}</span></div><button className="button" disabled={!job.canApply} onClick={() => send({ type: "conductor-apply", jobId: job.id })}>Prepare workspace</button></article>)}
    {state.submission ? <ConductorSubmission key={state.submission.frames.map((frame) => frame.id).join(",")} selection={state.submission} send={send} /> : null}
    <p className="conductor-footnote">Connections expire after eight hours and can be revoked from your Conductor profile. Audit, Report and Cleanup stay available offline. Preparing or submitting a design does not approve it.</p>
  </section>;
}
