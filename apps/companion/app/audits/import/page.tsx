import { databasePage } from "@/lib/server/database-page";
import { requirePageAccess } from "@/lib/server/runtime";
import { listProjects } from "../../../../../src/companion/repository";
import { AuditImportForm } from "./AuditImportForm";
export const dynamic = "force-dynamic";
export default async function ImportAuditsPage() {
  const paths = await requirePageAccess();
  return databasePage(async () => {
  const projects = await listProjects(paths);
  return <main id="main-content" className="page narrow-page">
    <header className="page-heading"><span className="eyebrow">Recorded audit evidence</span><h1>Import audit history</h1>
      <p>Audit files can contain node paths, names, URLs, design metadata and waiver information. Importing stores this metadata in your Supabase project.</p>
      <p>Historical imports describe recorded evidence. Refresh the audit in Figma to verify the current design.</p></header>
    <AuditImportForm projects={projects} />
  </main>;
  });
}
