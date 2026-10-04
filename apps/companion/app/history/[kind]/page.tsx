import { databasePage } from "@/lib/server/database-page";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listHistory, listProjects } from "../../../../../src/companion/repository";
import { requirePageAccess } from "@/lib/server/runtime";
import { historyFilters } from "@/lib/server/history";
export const dynamic = "force-dynamic";
export default async function HistoryPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const paths = await requirePageAccess();
  return databasePage(async () => {
  const { kind } = await params;
  if (kind !== "audit" && kind !== "learning") notFound();
  const query = new URLSearchParams(Object.entries(await searchParams).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []));
  const history = await listHistory(paths, kind, historyFilters(query));
  const projects = await listProjects(paths);
  const next = new URLSearchParams(query); if (history.nextCursor) next.set("cursor", history.nextCursor);
  const statuses = kind === "audit" ? ["pass", "fail", "needs-review", "waived", "not-applicable"] : ["awaiting", "approved", "rejected", "deferred", "changed"];
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  return <main id="main-content" className="page">
    <header className="page-heading"><span className="eyebrow">Searchable evidence</span><h1>{kind === "audit" ? "Audit history" : "Learning history"}</h1>
      <p>Source dates describe the exported evidence. Receipt dates record when you imported it.</p>
      <Link className="button" href={kind === "audit" ? "/audits/import" : "/learnings/import"}>Import {kind === "audit" ? "audits" : "learnings"}</Link></header>
    <form method="get" className="history-filters form-card">
      <label className="field"><span>Project</span><select name="project" defaultValue={query.get("project") ?? ""}><option value="">All projects</option>{projects.map((project) => <option key={project.scope} value={project.scope}>{project.displayName ?? project.scope}</option>)}</select></label>
      <label className="field"><span>From date</span><input type="date" name="from" defaultValue={query.get("from") ?? ""} /></label>
      <label className="field"><span>To date</span><input type="date" name="to" defaultValue={query.get("to") ?? ""} /></label>
      <label className="field"><span>Rule</span><input name="rule" autoComplete="off" defaultValue={query.get("rule") ?? ""} /></label>
      <label className="field"><span>Status</span><select name="status" defaultValue={query.get("status") ?? ""}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
      {kind === "audit" ? <><label className="field"><span>Grade</span><select name="grade" defaultValue={query.get("grade") ?? ""}><option value="">All grades</option>{["A", "B", "C", "D", "F"].map((grade) => <option key={grade}>{grade}</option>)}</select></label>
        <label className="field"><span>Readiness</span><select name="ready" defaultValue={query.get("ready") ?? ""}><option value="">All readiness</option><option value="true">Ready</option><option value="false">Needs work</option></select></label></> : null}
      <label className="field"><span>Search history</span><input type="search" name="q" autoComplete="off" maxLength={200} defaultValue={query.get("q") ?? ""} /></label>
      <button type="submit" className="button primary">Filter history</button><Link className="button" href={`/history/${kind}`}>Clear filters</Link>
    </form>
    <section aria-label="History results" className="form-card"><p>{history.rows.length} records on this page</p>
      {history.rows.length ? <ul className="history-list">{history.rows.map((row) => <li key={row.id}>
        <Link href={`/history/${kind}/${encodeURIComponent(row.id)}`}>{row.projectScope} · {date.format(new Date(row.sourceAt))} UTC{row.grade ? ` · Grade ${row.grade} · ${row.ready ? "Ready" : "Needs work"}` : ""}</Link>
        <small>Received {date.format(new Date(row.receivedAt))} UTC</small></li>)}</ul> : <p>No history matches these filters.</p>}
      {history.nextCursor ? <Link className="button" href={`/history/${kind}?${next}`}>Next page</Link> : null}
    </section>
  </main>;
  });
}
