"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewCandidateView } from "../../../../src/companion/view-models";
import type {
  Preview,
  ProjectSummary,
  RunDetail,
  RunHistory,
  SavedRecommendation,
} from "../../../../src/companion/model-review/contracts";
import type { CompanionActionResult } from "@/lib/types";
import { blocksModelApply } from "@/lib/review-drafts";
interface EditDraft {
  selected: boolean;
  rationale: string;
  wording: string;
  exceptions: string;
  editing: boolean;
}
const active = (run: Pick<RunDetail, "outcome">) =>
  run.outcome === "queued" || run.outcome === "running";
async function readRun(id: string): Promise<RunDetail> {
  const response = await fetch(
    `/api/model-reviews?run=${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  const result = (await response.json()) as CompanionActionResult<RunDetail>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
async function request<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/model-reviews", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as CompanionActionResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
export function ModelReviewController({
  project,
  configured,
  candidates,
  initialSummary,
  initialHistory,
  initialRun,
}: {
  project: string;
  configured: boolean;
  candidates: ReviewCandidateView[];
  initialSummary: ProjectSummary;
  initialHistory: RunHistory[];
  initialRun: RunDetail | null;
}) {
  const router = useRouter();
  const eligible = candidates.filter(
    (c) =>
      !(
        c.currentDecision?.action === "approve" &&
        c.currentDecision.scope === "shared"
      ),
  );
  const [selected, setSelected] = useState(() =>
    eligible
      .filter((c) => ["awaiting", "changed", "deferred"].includes(c.status))
      .map((c) => c.id),
  );
  const [summary, setSummary] = useState(initialSummary),
    [history, setHistory] = useState(initialHistory),
    [allowance, setAllowance] = useState(initialSummary.allowance);
  const [disclosure, setDisclosure] = useState<Preview | null>(null),
    [run, setRun] = useState<RunDetail | null>(initialRun);
  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({}),
    [draftsReady, setDraftsReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [retryOf, setRetryOf] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0),
    [billed, setBilled] = useState(""),
    [evidenceNote, setEvidenceNote] = useState("");
  const messageRef = useRef<HTMLDivElement>(null);
  const draftKey = `design-passport:model-review-drafts:v1:${project}`;
  useEffect(() => {
    let mounted = true;
    const hydration = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem(draftKey) ?? "{}",
        ) as Record<string, EditDraft>;
        setDrafts(saved);
      } catch {
        /* Keep usable server defaults. */
      }
      setDraftsReady(true);
      const last = sessionStorage.getItem(
        `design-passport:model-review-last:v1:${project}`,
      );
      if (last && initialHistory.some((r) => r.id === last))
        void readRun(last)
          .then((retained) => {
            if (mounted) setRun(retained);
          })
          .catch(() => {
            if (mounted)
              setMessage(
                "The saved run could not be loaded. Select it from history.",
              );
          });
    });
    return () => {
      mounted = false;
      cancelAnimationFrame(hydration);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);
  useEffect(() => {
    if (run)
      sessionStorage.setItem(
        `design-passport:model-review-last:v1:${project}`,
        run.id,
      );
  }, [project, run]);
  useEffect(() => {
    if (draftsReady) sessionStorage.setItem(draftKey, JSON.stringify(drafts));
  }, [draftKey, drafts, draftsReady]);
  useEffect(() => {
    if (!run) return;
    const anchor = performance.now(),
      duration = run.durationMs;
    const tick = () =>
      setElapsed(
        Math.floor(
          (duration + (active(run) ? performance.now() - anchor : 0)) / 1000,
        ),
      );
    tick();
    if (!active(run)) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [run]);
  async function refresh() {
    const response = await fetch(
      `/api/model-reviews?project=${encodeURIComponent(project)}`,
      { cache: "no-store" },
    );
    const result = (await response.json()) as CompanionActionResult<{
      summary: ProjectSummary;
      history: RunHistory[];
    }>;
    if (!result.ok) throw new Error(result.error.message);
    setSummary(result.data.summary);
    setHistory(result.data.history);
    if (run) {
      const retained = await readRun(run.id);
      setRun((current) => (current?.id === retained.id ? retained : current));
    }
  }
  useEffect(() => {
    if (!run) return;
    let stopped = false;
    const update = async () => {
      try {
        const response = await fetch(
          `/api/model-reviews?run=${encodeURIComponent(run.id)}`,
          { cache: "no-store" },
        );
        const result =
          (await response.json()) as CompanionActionResult<RunDetail>;
        if (!stopped && result.ok) {
          setRun((current) =>
            current?.id === result.data.id ? result.data : current,
          );
          await refresh();
        }
      } catch {
        if (!stopped)
          setMessage(
            "Connection interrupted. Reconnecting preserves this run.",
          );
      }
    };
    const online = () => void update();
    window.addEventListener("online", online);
    const timer =
      active(run) || run.accounting.amount === null
        ? setInterval(() => void update(), 2000)
        : undefined;
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      window.removeEventListener("online", online);
    };
    // Reconcile after reconnection and state transitions, without announcing the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id, run?.outcome, run?.accounting.status]);
  async function action(task: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await task();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The action could not be completed.",
      );
      requestAnimationFrame(() => messageRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  function draft(r: SavedRecommendation): EditDraft {
    const original = run?.frozen.snapshot.candidates.find(
      (c) => c.candidateId === r.candidateId,
    );
    return (
      drafts[r.id] ?? {
        selected: false,
        rationale: r.reason,
        wording: r.edit?.wording ?? original?.wording ?? "",
        exceptions: (r.edit?.exceptions ?? original?.exceptions ?? []).join(
          "\n",
        ),
        editing: !!r.edit,
      }
    );
  }
  function updateDraft(r: SavedRecommendation, values: Partial<EditDraft>) {
    setDrafts((previous) => ({
      ...previous,
      [r.id]: { ...draft(r), ...values },
    }));
  }
  function blocked(r: SavedRecommendation): boolean {
    const candidate = candidates.find((c) => c.id === r.candidateId);
    return !draftsReady || !candidate || blocksModelApply(candidate);
  }
  function redundant(r: SavedRecommendation): boolean {
    if (!r.alreadyApproved) return false;
    const d = draft(r),
      original = run?.frozen.snapshot.candidates.find(
        (c) => c.candidateId === r.candidateId,
      );
    return (
      !d.editing ||
      (d.wording.normalize("NFKC").trim() === original?.wording &&
        JSON.stringify(
          [
            ...new Set(
              d.exceptions
                .split("\n")
                .map((e) => e.normalize("NFKC").trim())
                .filter(Boolean),
            ),
          ].sort(),
        ) === JSON.stringify([...(original?.exceptions ?? [])].sort()))
    );
  }
  function pending<T extends Record<string, unknown>>(
    key: string,
    material: T,
  ): T & { requestId: string } {
    let saved: { requestId: string; material: T } | undefined;
    try {
      saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
    } catch {
      /* New request for corrupt state. */
    }
    if (!saved || JSON.stringify(saved.material) !== JSON.stringify(material))
      saved = { requestId: crypto.randomUUID(), material };
    sessionStorage.setItem(key, JSON.stringify(saved));
    return { ...material, requestId: saved.requestId };
  }
  function evidenceLink(ref: string): string {
    const m = run?.frozen.mappings[ref];
    if (m?.kind === "audit" || m?.kind === "finding" || m?.kind === "aggregate")
      return `/history/audit/${encodeURIComponent(m.id.split(":")[0]!)}`;
    if (m?.kind === "observation")
      return `/history/learning/${encodeURIComponent(m.id.slice(0, m.id.lastIndexOf(":")))}`;
    return `#evidence-${ref}`;
  }
  return (
    <div className="model-review-content">
      <section
        className="metrics model-budget"
        aria-label="Lifetime project spending"
      >
        <div>
          <strong>USD {summary.knownCost}</strong>
          <span>Known lifetime cost · estimates included</span>
        </div>
        <div>
          <strong>USD {summary.reservations}</strong>
          <span>Outstanding reservations</span>
        </div>
        <div>
          <strong>USD {summary.allowance}</strong>
          <span>Lifetime allowance</span>
        </div>
        <div>
          <strong>USD {summary.available}</strong>
          <span>Available balance</span>
        </div>
      </section>
      <p>
        {summary.runCount} runs · {summary.unresolvedCostCount} unresolved costs
        · {summary.discrepancies} unacknowledged discrepancies. Incomplete
        totals are not a final bill.
      </p>
      <section className="model-controls">
        <h2>Review settings</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              setSummary(
                await request({ operation: "settings", project, allowance }),
              );
              setMessage("Lifetime allowance saved.");
            });
          }}
        >
          <label className="field">
            <span>Lifetime allowance (USD)</span>
            <input
              name="allowance"
              inputMode="decimal"
              value={allowance}
              onChange={(e) => setAllowance(e.target.value)}
              required
            />
          </label>
          <button className="button" disabled={busy}>
            Save allowance
          </button>
        </form>
        <label className="field">
          <span>Optional source guide (JSON, up to 90 KB)</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void action(async () => {
                  if (file.size > 90_000)
                    throw new Error("The guide exceeds 90 KB.");
                  await request({
                    operation: "guide",
                    project,
                    raw: await file.text(),
                  });
                  setDisclosure(null);
                  await refresh();
                  setMessage(
                    "Source guide attached. Existing reviews require a fresh preview.",
                  );
                });
            }}
          />
        </label>
        <p>
          {summary.activeGuide
            ? "A versioned source guide is active."
            : "No source guide attached. Policy gaps require deferral."}
        </p>
        {summary.activeGuide ? (
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await request({
                  operation: "settings",
                  project,
                  activeGuide: null,
                });
                setDisclosure(null);
                await refresh();
              })
            }
          >
            Deactivate guide
          </button>
        ) : null}
        <label>
          <input
            type="checkbox"
            checked={summary.enabled}
            disabled={busy}
            onChange={(e) => {
              const enabled = e.target.checked;
              void action(async () =>
                setSummary(
                  await request({ operation: "settings", project, enabled }),
                ),
              );
            }}
          />{" "}
          Allow new starts
        </label>
      </section>
      <section className="model-controls">
        <h2>Select candidates</h2>
        <p>
          Untouched, stale, and deferred candidates are selected initially.
          Include current approvals and rejections explicitly. Shared approvals
          are context only.
        </p>
        <ul className="model-candidates">
          {eligible.map((c) => (
            <li key={c.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={(e) => {
                    setSelected((previous) =>
                      e.target.checked
                        ? [...previous, c.id]
                        : previous.filter((id) => id !== c.id),
                    );
                    setDisclosure(null);
                  }}
                />
                {c.wording} <small>({c.status})</small>
              </label>
            </li>
          ))}
        </ul>
        <p>
          {selected.length} selected. Choose 1–8; larger selections require
          narrowing.
        </p>
        <button
          type="button"
          className="button"
          disabled={busy || !selected.length || selected.length > 8}
          onClick={() =>
            void action(async () => {
              setDisclosure(
                await request({
                  operation: "preview",
                  project,
                  selection: eligible
                    .filter((c) => selected.includes(c.id))
                    .map((c) => ({ candidateId: c.id, digest: c.revision })),
                }),
              );
              setMessage(
                "Local preview ready. Nothing has been sent to OpenAI.",
              );
            })
          }
        >
          Preview disclosure
        </button>
        {disclosure ? (
          <div className="model-disclosure">
            <h3>Local disclosure preview</h3>
            <p>
              GPT-6.1 Sol · high reasoning · standard service · up to 16,384
              output tokens. Maximum reservation: USD {disclosure.reservation}.
            </p>
            <p>
              Start authorizes input counting and inference with this sanitized
              content. This preview sends nothing.
            </p>
            <p>Omitted: {disclosure.omissions.join(", ")}.</p>
            <details open>
              <summary>Sanitized content</summary>
              <pre>{JSON.stringify(disclosure.snapshot, null, 2)}</pre>
            </details>
            <details>
              <summary>Frozen request and provenance</summary>
              <pre>
                {JSON.stringify(
                  {
                    projection: disclosure.projection,
                    promptVersion: disclosure.promptVersion,
                    schemaVersion: disclosure.schemaVersion,
                    pricePolicy: disclosure.pricePolicy,
                    snapshotSha256: disclosure.snapshotSha256,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
            <button
              type="button"
              className="button primary"
              disabled={
                busy ||
                !configured ||
                !summary.enabled ||
                (!!run && active(run))
              }
              onClick={() =>
                void action(async () => {
                  const material = {
                    project,
                    selection: disclosure.selection,
                    previewDigest: disclosure.digest,
                    ...(retryOf ? { retryOf } : {}),
                  };
                  setRun(
                    await request({
                      operation: "start",
                      ...pending(
                        "design-passport:pending-model-start:v1",
                        material,
                      ),
                    }),
                  );
                  sessionStorage.removeItem(
                    "design-passport:pending-model-start:v1",
                  );
                  setDisclosure(null);
                  setRetryOf(null);
                  await refresh();
                })
              }
            >
              Start authorized review
            </button>
            {!configured ? (
              <p>
                Start the companion with a configured runner credential to
                enable model review.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
      {run ? (
        <section className="model-run">
          <h2>Review run</h2>
          <p role="status">
            Run status: {run.outcome} · provider:{" "}
            {run.providerStatus ?? "not dispatched"}
          </p>
          <p>
            <span data-testid="run-elapsed" aria-hidden="true">
              {elapsed} seconds
            </span>
            <span className="sr-only">
              Elapsed duration is available visually and in the final run
              record.
            </span>{" "}
            ·{" "}
            {run.providerCompletedAt
              ? "Provider completion time recorded"
              : "Observed duration"}{" "}
            ·{" "}
            {run.accounting.amount === null
              ? `Unknown or reserved cost; USD ${run.frozen.reservation} held`
              : `USD ${run.accounting.amount} (${run.accounting.status})`}
          </p>
          {run.providerCompletedAt ? (
            <p>
              Provider completion:{" "}
              <time dateTime={run.providerCompletedAt}>
                {run.providerCompletedAt}
              </time>
              . Terminal observation: {run.endedAt ?? "pending"}.
            </p>
          ) : null}
          <p>
            Prompt {run.frozen.promptVersion} · schema{" "}
            {run.frozen.schemaVersion} · {run.frozen.pricePolicy.version}
          </p>
          {run.error ? <p className="notice warning">{run.error}</p> : null}
          {active(run) ? (
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() =>
                void action(async () =>
                  setRun(await request({ operation: "cancel", runId: run.id })),
                )
              }
            >
              Cancel review
            </button>
          ) : (
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => {
                setRetryOf(run.id);
                setSelected(run.frozen.selection.map((s) => s.candidateId));
                setDisclosure(null);
                setMessage(
                  "Selection restored. Preview and Start create a separately reserved run.",
                );
              }}
            >
              Prepare retry selection
            </button>
          )}
          {run.accounting.amount === null && !active(run) ? (
            <div>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await request({
                      operation: "reconcile",
                      requestId: crypto.randomUUID(),
                      runId: run.id,
                      expectedVersion: run.accounting.version,
                      action: "retrieve",
                    });
                    setMessage("Retrieval queued.");
                  })
                }
              >
                Retrieve accounting
              </button>
              <label className="field">
                <span>Final billed amount (USD)</span>
                <input
                  inputMode="decimal"
                  value={billed}
                  onChange={(e) => setBilled(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Billing evidence note or provider reference</span>
                <textarea
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="button"
                disabled={busy || !billed || !evidenceNote.trim()}
                onClick={() =>
                  void action(async () => {
                    await request({
                      operation: "reconcile",
                      ...pending("design-passport:pending-model-reconcile:v1", {
                        runId: run.id,
                        expectedVersion: run.accounting.version,
                        action: "billed",
                        amount: billed,
                        evidenceNote,
                      }),
                    });
                    setMessage(
                      "Reconciliation queued; provider retrieval is checked first.",
                    );
                  })
                }
              >
                Record billed amount after retrieval
              </button>
            </div>
          ) : null}
          {run.accounting.discrepancy && !run.accounting.acknowledged ? (
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  await request({
                    operation: "reconcile",
                    ...pending("design-passport:pending-model-ack:v1", {
                      runId: run.id,
                      expectedVersion: run.accounting.version,
                      action: "discrepancy_acknowledgement",
                    }),
                  });
                  await refresh();
                })
              }
            >
              Acknowledge cost discrepancy
            </button>
          ) : null}
          {run.recommendations.map((r) => {
            const d = draft(r),
              original = run.frozen.snapshot.candidates.find(
                (c) => c.candidateId === r.candidateId,
              )!;
            const manual = draftsReady && blocked(r);
            return (
              <article key={r.id} className="model-recommendation">
                <h3>
                  {r.disposition} · {r.priority} priority
                </h3>
                <p>{r.reason}</p>
                <div className="model-diff">
                  <div>
                    <strong>Original</strong>
                    <p>{original.wording}</p>
                    <ul>
                      {original.exceptions.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Proposed</strong>
                    <p>{r.edit?.wording ?? original.wording}</p>
                    <ul>
                      {(r.edit?.exceptions ?? original.exceptions).map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <ul>
                  {r.evidenceRefs.map((ref) => (
                    <li key={ref}>
                      <Link href={evidenceLink(ref)}>
                        Inspect local evidence {ref}
                      </Link>
                    </li>
                  ))}
                </ul>
                <label>
                  <input
                    type="checkbox"
                    checked={d.selected && !r.applied && !redundant(r)}
                    disabled={
                      busy ||
                      r.applied ||
                      redundant(r) ||
                      manual ||
                      !draftsReady
                    }
                    onChange={(e) =>
                      updateDraft(r, { selected: e.target.checked })
                    }
                  />
                  {r.applied
                    ? "Applied"
                    : redundant(r)
                      ? "Already approved for this revision; an effective edit is required"
                      : "Select recommendation to apply"}
                </label>
                {manual ? (
                  <p className="notice warning">
                    A preserved manual draft blocks application.{" "}
                    <Link
                      href={`/review?candidate=${encodeURIComponent(r.candidateId)}`}
                    >
                      Save or explicitly discard it in the review queue.
                    </Link>
                  </p>
                ) : null}
                <label className="field">
                  <span>Human decision rationale</span>
                  <textarea
                    disabled={r.applied}
                    value={d.rationale}
                    onChange={(e) =>
                      updateDraft(r, { rationale: e.target.value })
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={d.editing}
                    disabled={r.applied}
                    onChange={(e) =>
                      updateDraft(r, { editing: e.target.checked })
                    }
                  />{" "}
                  Edit wording and exceptions
                </label>
                {d.editing ? (
                  <>
                    <label className="field">
                      <span>Wording to save</span>
                      <textarea
                        value={d.wording}
                        onChange={(e) =>
                          updateDraft(r, { wording: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Exceptions to save (one per line)</span>
                      <textarea
                        value={d.exceptions}
                        onChange={(e) =>
                          updateDraft(r, { exceptions: e.target.value })
                        }
                      />
                    </label>
                  </>
                ) : null}
              </article>
            );
          })}
          {run.recommendations.length ? (
            <button
              type="button"
              className="button primary"
              disabled={
                busy ||
                !draftsReady ||
                !run.recommendations.some(
                  (r) => draft(r).selected && !r.applied && !redundant(r),
                )
              }
              onClick={() =>
                void action(async () => {
                  const chosen = run.recommendations.filter(
                    (r) => draft(r).selected && !r.applied && !redundant(r),
                  );
                  if (chosen.some(blocked))
                    throw new Error(
                      "Save or explicitly discard affected manual drafts before applying.",
                    );
                  const material = {
                    runId: run.id,
                    expectedContext: run.contextDigest,
                    selections: chosen.map((r) => {
                      const d = draft(r);
                      return {
                        recommendationId: r.id,
                        rationale: d.rationale,
                        edit: d.editing
                          ? {
                              wording: d.wording,
                              exceptions: d.exceptions
                                .split("\n")
                                .filter(Boolean),
                            }
                          : null,
                      };
                    }),
                  };
                  await request({
                    operation: "apply",
                    ...pending(
                      "design-passport:pending-model-apply:v1",
                      material,
                    ),
                  });
                  sessionStorage.removeItem(
                    "design-passport:pending-model-apply:v1",
                  );
                  await refresh();
                  router.refresh();
                  setMessage(
                    "Selected recommendations applied atomically to project guidance.",
                  );
                })
              }
            >
              Apply selected recommendations
            </button>
          ) : null}
          <details>
            <summary>Retained sanitized evidence</summary>
            {run.frozen.snapshot.evidence.map((e) => (
              <pre key={e.ref} id={`evidence-${e.ref}`} tabIndex={-1}>
                {JSON.stringify(e, null, 2)}
              </pre>
            ))}
          </details>
          <p>
            Stored provider responses are deleted after terminal validation and
            complete accounting are durable. Deletion does not remove separate
            abuse-monitoring retention.
          </p>
        </section>
      ) : null}
      <section>
        <h2>Run history</h2>
        <ul>
          {history.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() =>
                  void action(async () => setRun(await readRun(r.id)))
                }
              >
                {r.registeredAt} · {r.outcome} ·{" "}
                {Math.floor(r.durationMs / 1000)} seconds ·{" "}
                {r.accounting.amount ?? "cost unresolved"}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <div ref={messageRef} className="notice" role="status" tabIndex={-1}>
        {message}
      </div>
    </div>
  );
}
