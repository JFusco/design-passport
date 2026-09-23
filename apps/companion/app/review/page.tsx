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
  const candidates = reviewView(await readKnowledgeState(paths));
  return (
    <main id="main-content" className="page review-page">
      <header className="page-heading compact">
        <span className="eyebrow">Knowledge review · step 3</span>
        <h1>Make every guidance decision explicit</h1>
        <p>Evidence counts show recurrence only. They never approve, rank, publish, or change a grade.</p>
      </header>
      <Suspense fallback={<div className="skeleton">Preparing the review queue…</div>}>
        <ReviewController initialCandidates={candidates} />
      </Suspense>
    </main>
  );
}
