import { databasePage } from "@/lib/server/database-page";
import type { Metadata } from "next";
import { Suspense } from "react";
import { readKnowledgeState } from "../../../../src/companion/repository";
import { reviewView } from "../../../../src/companion/view-models";
import { requirePageAccess } from "@/lib/server/runtime";
import { ReviewController } from "./ReviewController";

export const metadata: Metadata = { title: "Review knowledge" };
export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const paths = await requirePageAccess();
  return databasePage(async () => {
  const candidates = reviewView(await readKnowledgeState(paths));
  return (
    <main id="main-content" className="page review-page">
      <header className="page-heading compact">
        <h1>Review guidance</h1>
        <p>Review the evidence and decide which drafts to approve.</p>
      </header>
      <Suspense fallback={<div className="skeleton">Preparing the review queue…</div>}>
        <ReviewController initialCandidates={candidates} />
      </Suspense>
    </main>
  );
  });
}
