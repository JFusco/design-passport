import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/server/runtime";
import { PackForm } from "./PackForm";

export const metadata: Metadata = { title: "Create reference pack" };
export const dynamic = "force-dynamic";

export default async function NewPackPage() {
  await requirePageAccess();
  return (
    <main id="main-content" className="page narrow-page">
      <header className="page-heading">
        <h1>Create a reference pack</h1>
        <p>Create a pack from a Figma file and import it into Design Passport.</p>
      </header>
      <PackForm tokenReady={Boolean(process.env.FIGMA_TOKEN)} />
    </main>
  );
}
