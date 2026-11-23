import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/server/runtime";
import { ImportForm } from "./ImportForm";

export const metadata: Metadata = { title: "Import learnings" };
export const dynamic = "force-dynamic";

export default async function ImportLearningsPage() {
  await requirePageAccess();
  return (
    <main id="main-content" className="page narrow-page">
      <header className="page-heading">
        <h1>Import learning files</h1>
        <p>Choose learning files exported from Design Passport. Already imported files are skipped.</p>
      </header>
      <ImportForm />
    </main>
  );
}
