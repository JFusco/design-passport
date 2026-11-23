import { databasePage } from "@/lib/server/database-page";
import Link from "next/link";
import { readDashboard } from "../../../src/companion/repository";
import { projectLabel, reviewView } from "../../../src/companion/view-models";
import { requirePageAccess } from "@/lib/server/runtime";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const paths = await requirePageAccess();
  return databasePage(async () => {
  const { state, projectPacks, projects } = await readDashboard(paths);
  const candidates = reviewView(state);
  const awaiting = candidates.filter((candidate) => candidate.status === "awaiting" || candidate.status === "changed").length;
  const figmaReady = Boolean(process.env.FIGMA_TOKEN);
  const uniqueContributions = new Set(state.envelopes.map((envelope) => envelope.reportDigest)).size;
  const sharedApprovals = state.teamPack.entries.length;
  const projectNames = new Map(projects.map(({ scope, displayName }) => [scope, displayName]));
  const downloads = projectPacks.map((pack) => ({
    pack,
    label: projectLabel(pack.source.projectScope, projectNames.get(pack.source.projectScope)),
  }));
  const labelCounts = new Map<string, number>();
  for (const { label } of downloads) labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  const labelPositions = new Map<string, number>();
  return (
    <main id="main-content" className="page">
      <section className="hero">
        <div>
          <h1>Design Passport</h1>
          <p>Create reference packs, import review files, and approve guidance.</p>
        </div>
        <div className="readiness-card">
          <span className="status-dot ready" aria-hidden="true" />
          <div><strong>Workspace ready</strong><span>Supabase persistence is available.</span></div>
        </div>
      </section>

      <section className="metrics" aria-label="Knowledge summary">
        <div><strong>{uniqueContributions}</strong><span>Unique contributions</span></div>
        <div><strong>{candidates.length}</strong><span>Generated drafts</span></div>
        <div><strong>{awaiting}</strong><span>Need review</span></div>
      </section>

      <section className="journeys" aria-label="Companion tasks">
        <article className="journey-card">
          <h2>Create a Figma reference pack</h2>
          <p>Read a style guide or reference file and download a sanitized pack for the plugin.</p>
          <div className="card-status"><span className={`status-dot ${figmaReady ? "ready" : "waiting"}`} />{figmaReady ? "Figma access ready" : "FIGMA_TOKEN needed"}</div>
          <Link className="button primary" href="/packs/new">Create reference pack</Link>
        </article>
        <article className="journey-card accent-experience">
          <h2>Import learning files</h2>
          <p>Add sanitized exports from completed Design Passport reviews. Duplicates are safe.</p>
          <div className="card-status"><span className="status-dot ready" />Workspace ready</div>
          <Link className="button" href="/learnings/import">Import learnings</Link>
        </article>
        <article className="journey-card accent-operations">
          <h2>Review knowledge drafts</h2>
          <p>Edit generated guidance and make an explicit human decision before anything is published.</p>
          <div className="card-status"><span className={`status-dot ${awaiting ? "waiting" : "ready"}`} />{awaiting ? `${awaiting} awaiting review` : "Queue is clear"}</div>
          <Link className="button" href="/review">Open review queue</Link>
        </article>
      </section>

      <div className="dashboard-actions"><Link className="button" href="/model-reviews">Project reviews and budgets</Link></div>
      <section className="delivery-card" aria-labelledby="delivery-heading">
        <div>
          <h2 id="delivery-heading">Approved guidance</h2>
          <p>Download a file for your project. In Figma, open the Design Passport plugin and import it under Settings → Context &amp; style guide.</p>
          {sharedApprovals > 0 && <p className="delivery-status">Shared guidance will appear in a future plugin release.</p>}
        </div>
        {downloads.length ? <ul className="delivery-actions">
          {downloads.map(({ pack, label }) => {
            const position = (labelPositions.get(label) ?? 0) + 1;
            labelPositions.set(label, position);
            const name = (labelCounts.get(label) ?? 0) > 1 ? `${label} ${position}` : label;
            const hasGuidance = pack.facts.length > 0;
            const action = hasGuidance ? "Download guidance file" : "Download removal file";
            return (
              <li className="guidance-download" key={pack.source.projectScope}>
                <h3>{name}</h3>
                <p>{hasGuidance
                  ? `${pack.facts.length} approved ${pack.facts.length === 1 ? "recommendation" : "recommendations"}`
                  : "Import this file to clear withdrawn guidance and keep your style guide."}</p>
                <a className="button primary" href={`/api/guidance?scope=${encodeURIComponent(pack.source.projectScope)}`}
                  aria-label={`${action} for ${name}`} download>
                  {action}
                </a>
              </li>
            );
          })}
        </ul> : <p>No project guidance is ready yet. Approve a draft for a project to create a file.</p>}
      </section>
    </main>
  );
  });
}
