"use client";

import { useRef, useState, type FormEvent } from "react";
import type { CompanionActionResult } from "@/lib/types";

type PackResult = { fileName: string; content: string; warnings: string[] };

export function PackForm({ tokenReady }: { tokenReady: boolean }) {
  const [status, setStatus] = useState<"idle" | "working" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const alertRef = useRef<HTMLDivElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("working");
    setMessage("Reading the Figma file and building your pack…");
    setWarnings([]);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/packs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const result = await response.json() as CompanionActionResult<PackResult>;
      if (!result.ok) throw new Error(result.error.message);
      const blob = new Blob([result.data.content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.fileName;
      link.click();
      URL.revokeObjectURL(url);
      setWarnings(result.data.warnings);
      setStatus("success");
      setMessage("Reference pack created and downloaded.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The pack could not be created.");
      requestAnimationFrame(() => alertRef.current?.focus());
    }
  }

  return (
    <section className="form-card">
      {!tokenReady ? (
        <div className="notice warning" role="status"><strong>Figma access is not configured.</strong> Add FIGMA_TOKEN before starting the companion.</div>
      ) : null}
      <form onSubmit={submit}>
        <label className="field full">
          <span>Figma file link</span>
          <input name="url" type="url" required placeholder="https://www.figma.com/design/…" autoComplete="off" />
          <small>Design and file links are accepted. A selected node does not limit the import; the whole file is read.</small>
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Source name</span>
            <input name="sourceId" required pattern="[A-Za-z0-9._:\-]{1,200}" placeholder="style-guide:library" autoComplete="off" />
            <small>Use an opaque name without client-identifying copy.</small>
          </label>
          <label className="field">
            <span>Project</span>
            <input name="projectScope" required pattern="[A-Za-z0-9._:\-]{1,200}" placeholder="project:opaque-id" autoComplete="off" />
            <small>This must match the project used by the target file.</small>
          </label>
        </div>
        <fieldset className="role-choice">
          <legend>How will this file be used?</legend>
          <label><input type="radio" name="role" value="style-guide" defaultChecked /><span><strong>Style guide</strong><small>Project-approved guidance</small></span></label>
          <label><input type="radio" name="role" value="reference" /><span><strong>Reference</strong><small>Session-only inspiration</small></span></label>
        </fieldset>
        <div className="form-actions">
          <button className="button primary" type="submit" disabled={!tokenReady || status === "working"}>
            {status === "working" ? "Creating pack…" : "Create and download pack"}
          </button>
          <span className="privacy-note">Your Figma token stays on this machine.</span>
        </div>
      </form>
      {message ? <div ref={alertRef} tabIndex={-1} className={`notice ${status}`} role={status === "error" ? "alert" : "status"}>{message}</div> : null}
      {warnings.length ? <div className="notice warning" role="status"><strong>Pack created with notes</strong><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
    </section>
  );
}
