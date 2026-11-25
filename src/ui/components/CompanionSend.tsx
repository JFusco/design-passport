import { useEffect, useRef, useState } from "react";
import type { CompanionCommand, CompanionView } from "../../plugin/companion-send";

interface ReviewedDestination { reviewId: string; projectId: string }

export function CompanionSend({ view, send, connect }: {
  view: CompanionView; send(command: CompanionCommand): void; connect(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const retryHeading = useRef<HTMLHeadingElement>(null);
  const [destination, setDestination] = useState<ReviewedDestination>();
  const [consent, setConsent] = useState<ReviewedDestination>();
  const preview = view.preview;
  const retry = preview?.retry;
  const retryReviewId = retry && preview.reviewId;
  const projectId = retry?.projectId ?? (destination?.reviewId === preview?.reviewId ? destination?.projectId ?? "" : "");
  const confirmed = consent?.reviewId === preview?.reviewId && consent?.projectId === projectId;
  const matching = view.pending.find(item => item.matches && item.projectId === projectId);
  const retryId = retry?.requestId ?? matching?.requestId;
  const projectName = (id: string) => view.projects.find(project => project.id === id)?.name ?? "";
  const close = () => send({ type: "companion-close" });
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    if (retryReviewId) retryHeading.current?.focus();
  }, [retryReviewId]);
  return <dialog ref={dialog} className="companion-dialog" aria-labelledby="companion-send-title" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="conductor-connection">
      <header className="companion-dialog-heading"><h2 id="companion-send-title">{view.receipt ? "Submission receipt" : "Send to Companion"}</h2>
        <button className="icon-button" aria-label="Close Companion" onClick={close}>×</button></header>
      {view.environment && <p>{view.environment} · Design Passport</p>}
      {view.message && <p role="status">{view.message}</p>}
      {view.needsConnection && <button className="button" onClick={() => { close(); connect(); }}>Open Conductor connection</button>}
      {preview && <>
        {retry && <h3 ref={retryHeading} tabIndex={-1}>Review saved export</h3>}
        <div className="companion-file"><strong>{preview.kind === "audit" ? "Audit report" : "Learning contribution"}</strong>
          <span>{preview.filename}</span><span>{preview.bytes.toLocaleString()} bytes · JSON</span></div>
        <p>{preview.kind === "audit"
          ? "The project receives the full export, including frame names, Figma node IDs, findings, scores, and any waiver notes."
          : "The project receives the previewed learning export, including its project scope, sanitized observations, counts, and producer versions."}</p>
        {!retry && <p>This device saves the export before sending so you can retry for 24 hours if Companion cannot confirm the send.</p>}
        {view.projects.length ? <>
          {retry ? <dl className="companion-file"><dt>Destination project</dt><dd>{projectName(projectId)}</dd></dl> : <>
            <label htmlFor="companion-destination">Destination project</label>
            <select id="companion-destination" value={projectId} disabled={view.busy} onChange={event => {
              setDestination({ reviewId: preview.reviewId, projectId: event.target.value }); setConsent(undefined);
            }}>
              <option value="">Choose a project</option>
              {view.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </>}
          {projectId && <label className="companion-consent"><input type="checkbox" checked={confirmed} disabled={view.busy}
            onChange={event => setConsent(event.target.checked ? { reviewId: preview.reviewId, projectId } : undefined)} />
            <span>I reviewed this export and approve sharing it with {projectName(projectId)}.</span></label>}
          {(retry || !matching?.canReview) && <button className="button primary" disabled={!projectId || !confirmed || view.busy}
            onClick={() => send({ type: "companion-send", projectId, consent: true, reviewId: preview.reviewId, ...(retryId ? { retryId } : {}) })}>
            {retryId ? "Retry original submission" : "Send to Companion"}
          </button>}
        </> : <p>Ask your project lead for a project assignment to contribute evidence.</p>}
      </>}
      {view.pending.map(item => <section key={item.requestId} className="companion-pending">
        <h3>Pending {item.kind === "audit" ? "audit" : "contribution"}</h3><p>{projectName(item.projectId)}</p>
        <code>{item.requestId}</code><div className="conductor-actions">
          <button className="button" disabled={view.busy} onClick={() => send({type: "companion-check", requestId: item.requestId})}>Check receipt</button>
          {item.canReview && retry?.requestId !== item.requestId && <button className="button" disabled={view.busy}
            onClick={() => send({ type: "companion-review-retry", requestId: item.requestId })}>Review saved export</button>}
        </div></section>)}
      {view.receipt && <dl className="companion-file">
        <dt>Project</dt><dd>{projectName(view.receipt.projectId)}</dd>
        <dt>Receipt</dt><dd><code>{view.receipt.requestId}</code></dd>
        <dt>Evidence</dt><dd><code>{view.receipt.evidenceId}</code></dd>
      </dl>}
      {!view.busy && !view.preview && !view.message && !view.receipt && !view.pending.length && <p>No saved receipts for this connection.</p>}
      {view.busy && <p role="status">Contacting Companion…</p>}
    </div>
  </dialog>;
}
