"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReviewCandidateView, ReviewStatus } from "../../../../src/companion/view-models";
import type { CompanionActionResult } from "@/lib/types";

const statusLabels: Record<ReviewStatus, string> = {
  awaiting: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
  deferred: "Deferred",
  changed: "Changed since decision",
};

const decisionDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const REVIEW_DRAFTS_KEY = "design-passport:review-drafts:v1";

interface LocalReviewDraft {
  revision: string;
  wording: string;
  scope: "project" | "shared";
  exceptions: string;
  rationale: string;
}

function humanize(value: string): string {
  const words = value.replace(/^[^:]+:/u, "").replace(/[._-]+/gu, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : "Design review";
}

function normalizedExceptions(value: string): string[] {
  return [...new Set(value.split("\n").map((line) => line.normalize("NFKC").trim()).filter(Boolean))].sort();
}

function matchesCandidate(candidate: ReviewCandidateView, status: string, query: string): boolean {
  const matchesStatus = status === "all" || candidate.status === status;
  const needle = query.trim().toLocaleLowerCase("en-US");
  return matchesStatus && (!needle || `${candidate.context} ${candidate.projectScope} ${candidate.wording}`.toLocaleLowerCase("en-US").includes(needle));
}

function storedDrafts(): Record<string, LocalReviewDraft> {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(REVIEW_DRAFTS_KEY) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, LocalReviewDraft> : {};
  } catch {
    return {};
  }
}

export function ReviewController({ initialCandidates }: { initialCandidates: ReviewCandidateView[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const initialStatus = params.get("status") ?? "all";
  const initialQuery = params.get("q") ?? "";
  const initialRequested = params.get("candidate");
  const initialVisible = initialCandidates.filter((candidate) => matchesCandidate(candidate, initialStatus, initialQuery));
  const initialCandidate = initialVisible.find((candidate) => candidate.id === initialRequested) ?? initialVisible[0];
  const [candidates, setCandidates] = useState(initialCandidates);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState(initialCandidate?.id ?? "");
  const [wording, setWording] = useState(initialCandidate?.wording ?? "");
  const [scope, setScope] = useState<"project" | "shared">(initialCandidate?.proposedScope ?? "project");
  const [exceptions, setExceptions] = useState(initialCandidate?.exceptions.join("\n") ?? "");
  const [rationale, setRationale] = useState("");
  const [message, setMessage] = useState("");
  const [hasConflict, setHasConflict] = useState(false);
  const [working, setWorking] = useState(false);
  const [draftsReady, setDraftsReady] = useState(false);
  const draftsRef = useRef<Record<string, LocalReviewDraft>>({});
  const initialCandidateRef = useRef(initialCandidate);
  const allowReloadRef = useRef(false);
  const rationaleRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => candidates.filter((candidate) => matchesCandidate(candidate, statusFilter, query)), [candidates, query, statusFilter]);
  const selected = visible.find((candidate) => candidate.id === selectedId);
  const editorialDirty = selected ? (
    wording.normalize("NFKC").trim() !== selected.wording
    || scope !== selected.proposedScope
    || JSON.stringify(normalizedExceptions(exceptions)) !== JSON.stringify([...selected.exceptions].sort())
  ) : false;
  const hasUnsavedWork = editorialDirty || Boolean(rationale.trim());

  function writeStoredDrafts() {
    sessionStorage.setItem(REVIEW_DRAFTS_KEY, JSON.stringify(draftsRef.current));
  }

  function loadCandidate(candidate: ReviewCandidateView) {
    const saved = draftsRef.current[candidate.id];
    const draft = saved?.revision === candidate.revision ? saved : undefined;
    if (saved && !draft) {
      delete draftsRef.current[candidate.id];
      writeStoredDrafts();
    }
    setSelectedId(candidate.id);
    setWording(draft?.wording ?? candidate.wording);
    setScope(draft?.scope ?? candidate.proposedScope);
    setExceptions(draft?.exceptions ?? candidate.exceptions.join("\n"));
    setRationale(draft?.rationale ?? "");
    setMessage("");
    setHasConflict(false);
  }

  function persistCurrentDraft() {
    if (!draftsReady || !selected) return;
    if (hasUnsavedWork) {
      draftsRef.current[selected.id] = { revision: selected.revision, wording, scope, exceptions, rationale };
    } else {
      delete draftsRef.current[selected.id];
    }
    writeStoredDrafts();
  }

  useEffect(() => {
    draftsRef.current = storedDrafts();
    const candidate = initialCandidateRef.current;
    if (candidate) {
      const saved = draftsRef.current[candidate.id];
      if (saved?.revision === candidate.revision) {
        setWording(saved.wording);
        setScope(saved.scope);
        setExceptions(saved.exceptions);
        setRationale(saved.rationale);
      }
    }
    setDraftsReady(true);
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedId) next.set("candidate", selectedId);
    if (statusFilter !== "all") next.set("status", statusFilter);
    if (query) next.set("q", query);
    router.replace(`/review${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
  }, [query, router, selectedId, statusFilter]);

  useEffect(() => {
    if (!draftsReady || !selected) return;
    if (hasUnsavedWork) {
      draftsRef.current[selected.id] = { revision: selected.revision, wording, scope, exceptions, rationale };
    } else {
      delete draftsRef.current[selected.id];
    }
    sessionStorage.setItem(REVIEW_DRAFTS_KEY, JSON.stringify(draftsRef.current));
  }, [draftsReady, selected, wording, scope, exceptions, rationale, hasUnsavedWork]);

  useEffect(() => {
    if (!hasUnsavedWork) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!allowReloadRef.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedWork]);

  function selectCandidate(candidate: ReviewCandidateView) {
    persistCurrentDraft();
    loadCandidate(candidate);
  }

  function filterCandidates(nextStatus: string, nextQuery: string) {
    persistCurrentDraft();
    const next = candidates.find((candidate) => candidate.id === selectedId && matchesCandidate(candidate, nextStatus, nextQuery))
      ?? candidates.find((candidate) => matchesCandidate(candidate, nextStatus, nextQuery));
    if (next) loadCandidate(next);
    else setSelectedId("");
  }

  function changeStatus(nextStatus: string) {
    filterCandidates(nextStatus, query);
    setStatusFilter(nextStatus);
  }

  function changeQuery(nextQuery: string) {
    filterCandidates(statusFilter, nextQuery);
    setQuery(nextQuery);
  }

  function replaceCandidate(candidate: ReviewCandidateView): ReviewCandidateView[] {
    const next = candidates.map((item) => item.id === candidate.id ? candidate : item);
    setCandidates(next);
    return next;
  }

  function reconcileReplacedCandidate(candidate: ReviewCandidateView, nextCandidates: ReviewCandidateView[]) {
    if (matchesCandidate(candidate, statusFilter, query)) return;
    const next = nextCandidates.find((item) => matchesCandidate(item, statusFilter, query));
    if (next) loadCandidate(next);
    else setSelectedId("");
  }

  async function saveDraft() {
    if (!selected || !editorialDirty) return;
    setWorking(true);
    setMessage("Saving draft…");
    try {
      const response = await fetch("/api/candidates/revise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidateId: selected.id,
          candidateDigest: selected.revision,
          wording,
          proposedScope: scope,
          exceptions: normalizedExceptions(exceptions),
        }),
      });
      const action = await response.json() as CompanionActionResult<{ candidate: ReviewCandidateView; rebuildRequired: boolean }>;
      if (!action.ok) {
        setHasConflict(action.error.code === "conflict");
        throw new Error(action.error.message);
      }
      const nextCandidates = replaceCandidate(action.data.candidate);
      draftsRef.current[action.data.candidate.id] = {
        revision: action.data.candidate.revision,
        wording: action.data.candidate.wording,
        scope: action.data.candidate.proposedScope,
        exceptions: action.data.candidate.exceptions.join("\n"),
        rationale,
      };
      writeStoredDrafts();
      if (matchesCandidate(action.data.candidate, statusFilter, query)) {
        setWording(action.data.candidate.wording);
        setScope(action.data.candidate.proposedScope);
        setExceptions(action.data.candidate.exceptions.join("\n"));
      }
      reconcileReplacedCandidate(action.data.candidate, nextCandidates);
      setHasConflict(false);
      setMessage(action.data.rebuildRequired ? "Draft saved. Knowledge still needs a rebuild." : "Draft saved. You can now record a decision.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The draft could not be saved.");
      requestAnimationFrame(() => messageRef.current?.focus());
    } finally {
      setWorking(false);
    }
  }

  async function decide(action: "approve" | "reject" | "defer") {
    if (!selected || editorialDirty) return;
    if (!rationale.trim()) {
      setMessage("Add a short decision note.");
      rationaleRef.current?.focus();
      return;
    }
    setWorking(true);
    setMessage(`Recording ${action} decision…`);
    try {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateId: selected.id, candidateDigest: selected.revision, action, scope, rationale }),
      });
      const result = await response.json() as CompanionActionResult<{ candidate: ReviewCandidateView; rebuildRequired: boolean }>;
      if (!result.ok) {
        setHasConflict(result.error.code === "conflict");
        throw new Error(result.error.message);
      }
      const nextCandidates = replaceCandidate(result.data.candidate);
      setHasConflict(false);
      setRationale("");
      delete draftsRef.current[result.data.candidate.id];
      writeStoredDrafts();
      reconcileReplacedCandidate(result.data.candidate, nextCandidates);
      setMessage(result.data.rebuildRequired ? "Decision saved. Knowledge still needs a rebuild." : `${statusLabels[result.data.candidate.status]} decision saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The decision could not be saved.");
      requestAnimationFrame(() => messageRef.current?.focus());
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="review-workspace">
      <aside className="review-queue">
        <div className="queue-tools">
          <label><span className="sr-only">Search drafts</span><input name="candidate-search" autoComplete="off" type="search" value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Search drafts…" /></label>
          <label><span className="sr-only">Filter by status</span><select name="candidate-status" value={statusFilter} onChange={(event) => changeStatus(event.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="queue-count">{visible.length} draft{visible.length === 1 ? "" : "s"}</div>
        <div className="queue-list">
          {visible.length ? visible.map((candidate) => (
            <button type="button" key={candidate.id} className={`queue-item ${candidate.id === selectedId ? "active" : ""}`} onClick={() => selectCandidate(candidate)} aria-pressed={candidate.id === selectedId}>
              <strong>{humanize(candidate.context)}</strong>
              <span className={`status-pill ${candidate.status}`}>{statusLabels[candidate.status]}</span>
              <small>{candidate.projectScope}</small>
              <small>{candidate.contributionCount} contribution{candidate.contributionCount === 1 ? "" : "s"}</small>
            </button>
          )) : <div className="empty-queue">No drafts match this filter.</div>}
        </div>
      </aside>

      <article className="review-panel">
        {!selected ? <div className="empty-review"><h2>{candidates.length ? "No drafts match this filter" : "No knowledge drafts yet"}</h2><p>{candidates.length ? "Change the search or status filter to select a draft." : "Import a learning file to generate the first review candidate."}</p></div> : (
          <>
            <header className="review-header">
              <div><span className="eyebrow">Generated guidance</span><h2>{humanize(selected.context)}</h2><p>{selected.projectScope}</p></div>
              <span className={`status-pill ${selected.status}`}>{statusLabels[selected.status]}</span>
            </header>
            <div className="review-body">
              <label className="field full"><span>Guidance</span><textarea name="guidance" autoComplete="off" value={wording} onChange={(event) => setWording(event.target.value)} /><small>Edit the generated draft into clear, reusable guidance.</small></label>
              <div className="review-grid">
                <label className="field"><span>Publication scope</span><select name="publication-scope" value={scope} onChange={(event) => setScope(event.target.value as "project" | "shared")}><option value="project">Project only</option><option value="shared">Shared, client-neutral</option></select><small>Shared guidance requires an explicit human choice.</small></label>
                <div className="evidence-card"><strong>Evidence summary</strong><div><span><b>{selected.supportCount}</b> supporting</span><span><b>{selected.contradictCount}</b> contradictory</span><span><b>{selected.contributionCount}</b> unique</span></div></div>
              </div>
              <label className="field full"><span>Exceptions</span><textarea name="exceptions" autoComplete="off" className="short" value={exceptions} onChange={(event) => setExceptions(event.target.value)} placeholder="One exception per line…" /><small>Record where this guidance should not apply.</small></label>
              <details className="evidence-details">
                <summary>Why this draft?</summary>
                <p>These sanitized observations explain the draft. Counts show recurrence, not approval.</p>
                {selected.evidence.length ? <ul>{selected.evidence.slice(0, 50).map((item, index) => (
                  <li key={`${item.observedAt}:${item.direction}:${item.kind}:${index}`}>
                    <span className={`evidence-direction ${item.direction}`}>{item.direction === "support" ? "Supporting" : "Contradictory"}</span>
                    <strong>{item.label}</strong>
                    <small>{humanize(item.kind)} · {humanize(item.context)} · {item.count} occurrence{item.count === 1 ? "" : "s"} · <time dateTime={item.observedAt}>{decisionDateFormatter.format(new Date(item.observedAt))} UTC</time></small>
                  </li>
                ))}</ul> : <p>No inspectable evidence is available for this historical draft.</p>}
              </details>
            </div>
            <footer className="decision-panel">
              <label className="field decision-note"><span>Decision note</span><input name="decision-note" autoComplete="off" ref={rationaleRef} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Reason for this decision…" /></label>
              <div className="decision-actions">
                <button type="button" className="button" onClick={saveDraft} disabled={!editorialDirty || working}>Save changes</button>
                <button type="button" className="button primary" onClick={() => decide("approve")} disabled={editorialDirty || working}>Approve</button>
                <button type="button" className="button danger" onClick={() => decide("reject")} disabled={editorialDirty || working}>Reject</button>
                <button type="button" className="button" onClick={() => decide("defer")} disabled={editorialDirty || working}>Defer</button>
              </div>
              {editorialDirty ? <p className="dirty-note">Save changes before recording a decision.</p> : null}
              {selected.currentDecision ? <p className="previous-decision">Current decision: {statusLabels[selected.status]} · {selected.currentDecision.scope === "shared" ? "Shared, client-neutral" : "Project only"} · <time dateTime={selected.currentDecision.decidedAt}>{decisionDateFormatter.format(new Date(selected.currentDecision.decidedAt))} UTC</time><br />Reason: {selected.currentDecision.rationale}</p> : null}
              {selected.previousDecision ? <p className="previous-decision warning">Previous decision requires review because the evidence changed: {statusLabels[selected.previousDecision.action === "approve" ? "approved" : selected.previousDecision.action === "reject" ? "rejected" : "deferred"]} · {selected.previousDecision.scope === "shared" ? "Shared, client-neutral" : "Project only"} · <time dateTime={selected.previousDecision.decidedAt}>{decisionDateFormatter.format(new Date(selected.previousDecision.decidedAt))} UTC</time><br />Reason: {selected.previousDecision.rationale}</p> : null}
              {message ? <div ref={messageRef} tabIndex={-1} className="notice" role="status">{message}</div> : null}
              {hasConflict ? <button type="button" className="button conflict-action" onClick={() => { allowReloadRef.current = true; window.location.reload(); }}>Reload current draft</button> : null}
            </footer>
          </>
        )}
      </article>
    </section>
  );
}
