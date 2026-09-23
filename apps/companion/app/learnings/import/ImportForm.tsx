"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import type { CompanionActionResult } from "@/lib/types";

type FileResult = { name: string; status: "imported" | "duplicate" | "invalid"; message: string };
type ImportResult = {
  files: FileResult[];
  imported: number;
  duplicates: number;
  invalid: number;
  rebuildRequired: boolean;
  rebuildMessage?: string;
};

export function ImportForm({ initialRebuildRequired }: { initialRebuildRequired: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<ImportResult>();
  const [message, setMessage] = useState(initialRebuildRequired ? "A previous change was saved and still needs a rebuild." : "");
  const [rebuildRequired, setRebuildRequired] = useState(initialRebuildRequired);
  const alertRef = useRef<HTMLDivElement>(null);

  function select(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []).slice(0, 10));
    setResult(undefined);
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setFiles(Array.from(event.dataTransfer.files).slice(0, 10));
    setResult(undefined);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!files.length) {
      setMessage("Choose at least one learning file.");
      alertRef.current?.focus();
      return;
    }
    setWorking(true);
    setMessage("Validating and importing your files…");
    const body = new FormData();
    files.forEach((file) => body.append("files", file));
    try {
      const response = await fetch("/api/learnings/import", { method: "POST", body });
      const action = await response.json() as CompanionActionResult<ImportResult>;
      if (!action.ok) throw new Error(action.error.message);
      setResult(action.data);
      setRebuildRequired(action.data.rebuildRequired);
      setMessage(action.data.rebuildRequired ? action.data.rebuildMessage ?? "Files saved; rebuild required." : "Import complete.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The learning files could not be imported.");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setWorking(false);
    }
  }

  async function retryRebuild() {
    setWorking(true);
    setMessage("Rebuilding knowledge…");
    try {
      const response = await fetch("/api/rebuild", { method: "POST" });
      const action = await response.json() as CompanionActionResult<{ candidates: number }>;
      if (!action.ok) throw new Error(action.error.message);
      setRebuildRequired(false);
      setMessage(`Knowledge rebuilt. ${action.data.candidates} draft${action.data.candidates === 1 ? "" : "s"} ready.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Knowledge still needs to be rebuilt.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="form-card">
      <form onSubmit={submit}>
        <label className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={drop}>
          <input aria-label="Learning files" name="learning-files" type="file" accept="application/json,.json" multiple onChange={select} />
          <span className="drop-icon" aria-hidden="true">↓</span>
          <strong>Choose files or drop them here</strong>
          <small>Up to 10 files · 1 MB each · 5 MB combined</small>
        </label>
        {files.length ? (
          <div className="selected-files" aria-label="Selected files">
            <strong>{files.length} selected</strong>
            <ul>{files.map((file) => <li key={`${file.name}-${file.lastModified}`}><span>{file.name}</span><small>{Math.ceil(file.size / 1024)} KB</small></li>)}</ul>
          </div>
        ) : null}
        <div className="form-actions">
          <button className="button primary" type="submit" disabled={working}>{working ? "Working…" : "Validate and import"}</button>
          {rebuildRequired ? <button className="button" type="button" onClick={retryRebuild} disabled={working}>Retry rebuild</button> : null}
          <span className="privacy-note">Uploaded filenames are never used as storage paths.</span>
        </div>
      </form>
      {message ? <div className={`notice ${rebuildRequired ? "warning" : "success"}`} ref={alertRef} tabIndex={-1} role="status">{message}</div> : null}
      {result ? (
        <div className="import-results">
          <div className="result-summary"><strong>{result.imported} imported</strong><span>{result.duplicates} duplicate</span><span>{result.invalid} invalid</span></div>
          <ul>{result.files.map((file, index) => <li key={`${file.name}-${index}`}><span className={`result-badge ${file.status}`}>{file.status}</span><strong>{file.name}</strong><small>{file.message}</small></li>)}</ul>
        </div>
      ) : null}
    </section>
  );
}
