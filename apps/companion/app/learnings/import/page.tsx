import type { Metadata } from "next";
import { readKnowledgeState } from "../../../../../src/companion/repository";
import { requirePageAccess } from "@/lib/server/runtime";
import { ImportForm } from "./ImportForm";

export const metadata: Metadata = { title: "Import learnings" };
export const dynamic = "force-dynamic";

export default async function ImportLearningsPage() {
  const paths = await requirePageAccess();
  const state = await readKnowledgeState(paths);
  return (
    <main id="main-content" className="page narrow-page">
      <header className="page-heading">
        <span className="eyebrow">Learning import · step 2</span>
        <h1>Bring reviewed learnings into the workspace</h1>
        <p>Select sanitized Design Passport learning exports. Each file is validated independently, and duplicates are ignored safely.</p>
      </header>
      <ImportForm initialRebuildRequired={state.rebuildRequired} />
    </main>
  );
}
