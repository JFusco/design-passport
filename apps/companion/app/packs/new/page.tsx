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
        <span className="eyebrow">Reference pack · step 1</span>
        <h1>Create a Figma reference pack</h1>
        <p>The companion reads the whole selected Figma file, removes raw design copy, and creates an advisory artifact for Design Passport.</p>
      </header>
      <PackForm tokenReady={Boolean(process.env.FIGMA_TOKEN)} />
    </main>
  );
}
