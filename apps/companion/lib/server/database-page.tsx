import "server-only";
import type { ReactNode } from "react";
import { CompanionError } from "../../../../src/companion/errors";

export async function databasePage(render: () => Promise<ReactNode>): Promise<ReactNode> {
  try { return await render(); }
  catch (error) {
    if (!(error instanceof CompanionError) || !["invalid-input", "not-configured", "unavailable", "busy"].includes(error.code)) throw error;
    return <main id="main-content" className="centered-state"><div className="state-card" role="alert">
      <span className="eyebrow">Companion database</span>
      <h1>{error.code === "invalid-input" ? "Request could not be completed" : error.code === "not-configured" ? "Configure database access" : error.code === "busy" ? "Database busy" : "Database unavailable"}</h1>
      <p>{error.message}</p><a className="button primary" href={error.code === "invalid-input" ? "/" : ""}>{error.code === "invalid-input" ? "Return to dashboard" : "Check again"}</a>
    </div></main>;
  }
}
