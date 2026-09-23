import Link from "next/link";
import { listProjectGuidancePacks, readKnowledgeState } from "../../../src/companion/repository";
import { reviewView } from "../../../src/companion/view-models";
import { requirePageAccess } from "@/lib/server/runtime";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const paths = await requirePageAccess();
  const [state, projectPacks] = await Promise.all([readKnowledgeState(paths), listProjectGuidancePacks(paths)]);
  const candidates = reviewView(state);
  const awaiting = candidates.filter((candidate) => candidate.status === "awaiting" || candidate.status === "changed").length;
  const figmaReady = Boolean(process.env.FIGMA_TOKEN);
  const uniqueContributions = new Set(state.envelopes.map((envelope) => envelope.reportDigest)).size;
  const sharedApprovals = state.teamPack.entries.length;
  return (
    <main id="main-content" className="page">
      <section className="hero">
        <div>
          <span className="eyebrow">Local design knowledge</span>
          <h1>Turn reviewed design evidence into useful guidance.</h1>
          <p>Generate a project reference, bring in sanitized learnings, and decide what belongs in your knowledge pack.</p>
        </div>
        <div className="readiness-card">
          <span className="status-dot ready" aria-hidden="true" />
          <div><strong>Workspace ready</strong><span>Private local files are available.</span></div>
        </div>
      </section>

      {state.rebuildRequired ? (
        <div className="notice warning" role="status">
          <strong>Knowledge rebuild required.</strong> Your latest change was saved. Open Import to retry the rebuild.
        </div>
      ) : null}

      <section className="metrics" aria-label="Knowledge summary">
        <div><strong>{uniqueContributions}</strong><span>Unique contributions</span></div>
        <div><strong>{candidates.length}</strong><span>Generated drafts</span></div>
        <div><strong>{awaiting}</strong><span>Need review</span></div>
      </section>

      <section className="journeys" aria-label="Companion tasks">
        <article className="journey-card accent-orange">
          <span className="step">01</span>
          <h2>Create a Figma reference pack</h2>
          <p>Read a style guide or reference file and download a sanitized pack for the plugin.</p>
          <div className="card-status"><span className={`status-dot ${figmaReady ? "ready" : "waiting"}`} />{figmaReady ? "Figma access ready" : "FIGMA_TOKEN needed"}</div>
          <Link className="button primary" href="/packs/new">Create reference pack</Link>
        </article>
        <article className="journey-card accent-coral">
          <span className="step">02</span>
          <h2>Import learning files</h2>
          <p>Add sanitized exports from completed Design Passport reviews. Duplicates are safe.</p>
          <div className="card-status"><span className="status-dot ready" />Workspace ready</div>
          <Link className="button" href="/learnings/import">Import learnings</Link>
        </article>
        <article className="journey-card accent-green">
          <span className="step">03</span>
          <h2>Review knowledge drafts</h2>
          <p>Edit generated guidance and make an explicit human decision before anything is published.</p>
          <div className="card-status"><span className={`status-dot ${awaiting ? "waiting" : "ready"}`} />{awaiting ? `${awaiting} awaiting review` : "Queue is clear"}</div>
          <Link className="button" href="/review">Open review queue</Link>
        </article>
      </section>

      <section className="delivery-card" aria-labelledby="delivery-heading">
        <div>
          <span className="eyebrow">Approved guidance</span>
          <h2 id="delivery-heading">Put reviewed guidance back into the plugin.</h2>
          <p>
            Project approvals are available immediately as reference packs. Download a pack, then import it in the plugin’s
            project context. Shared approvals are staged for the team knowledge pack and arrive in the plugin with a release.
          </p>
          <span className="delivery-status">{sharedApprovals} shared {sharedApprovals === 1 ? "approval" : "approvals"} staged for a plugin release</span>
        </div>
        <div className="delivery-actions">
          {projectPacks.length > 0 ? projectPacks.map((pack) => (
            <a
              className="button primary"
              href={`/api/guidance?scope=${encodeURIComponent(pack.source.projectScope)}`}
              download
              key={pack.source.projectScope}
            >
              Download {pack.source.projectScope} guidance
            </a>
          )) : <p>No project guidance is ready yet. Approve a draft for project use to create a pack.</p>}
        </div>
      </section>
    </main>
  );
}
