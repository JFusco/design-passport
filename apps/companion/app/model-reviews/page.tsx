import Link from "next/link";
import { databasePage } from "@/lib/server/database-page";
import { requirePageAccess } from "@/lib/server/runtime";
import { initializeModelReview } from "@/lib/server/model-review";
import {
  listProjects,
  readKnowledgeState,
} from "../../../../src/companion/repository";
import { reviewView } from "../../../../src/companion/view-models";
import {
  projectHistory,
  projectSummary,
  runDetail,
} from "../../../../src/companion/model-review/repository";
import { ModelReviewController } from "./ModelReviewController";
export const dynamic = "force-dynamic";
export const metadata = { title: "Project model review" };
export default async function ModelReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const paths = await requirePageAccess();
  const params = await searchParams;
  return databasePage(async () => {
    const projects = await listProjects(paths);
    const project = params.project;
    if (!project || !projects.some((p) => p.scope === project))
      return (
        <main id="main-content" className="page">
          <h1>Choose a project for model review</h1>
          <p>
            Review up to eight candidates and explicitly apply selected
            recommendations.
          </p>
          <ul>
            {projects.map((p) => (
              <li key={p.scope}>
                <Link
                  href={`/model-reviews?project=${encodeURIComponent(p.scope)}`}
                >
                  {p.displayName ?? p.scope}
                </Link>
              </li>
            ))}
          </ul>
        </main>
      );
    const configured = await initializeModelReview(paths);
    const history = await projectHistory(paths, project),
      active = history.find(
        (r) => r.outcome === "queued" || r.outcome === "running",
      );
    return (
      <main id="main-content" className="page model-review-page">
        <header className="page-heading">
          <h1>Project model review</h1>
          <p>{project}</p>
          <Link href="/model-reviews">Change project</Link>
        </header>
        <ModelReviewController
          project={project}
          configured={configured}
          candidates={reviewView(await readKnowledgeState(paths)).filter(
            (c) => c.projectScope === project,
          )}
          initialSummary={await projectSummary(paths, project)}
          initialHistory={history}
          initialRun={active ? await runDetail(paths, active.id) : null}
        />
      </main>
    );
  });
}
