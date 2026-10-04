"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import type { CompanionActionResult } from "@/lib/types";

type FileResult = { name: string; status: "imported" | "duplicate" | "invalid" | "retryable"; message: string };
type ImportResult = {
  files: FileResult[];
  imported: number;
  duplicates: number;
  invalid: number;
  retryable: number;
};

export function ImportForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<ImportResult>();
  const [previewScopes, setPreviewScopes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const alertRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function preview(selection: File[]) {
    if (selection.length > 10 || selection.some((file) => file.size > 1_000_000) || selection.reduce((sum, file) => sum + file.size, 0) > 5_000_000) { setPreviewScopes([]); return; }
    setPreviewScopes(await Promise.all(selection.map(async (file) => {
      try { const value = JSON.parse(await file.text()) as { projectScope?: unknown }; return typeof value.projectScope === "string" ? value.projectScope : "Unavailable"; }
      catch { return "Unavailable"; }
    })));
  }

  function select(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
    void preview(Array.from(event.target.files ?? []));
    setResult(undefined);
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setFiles(Array.from(event.dataTransfer.files));
    void preview(Array.from(event.dataTransfer.files));
    setResult(undefined);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const selected = files.length ? files : Array.from(fileInputRef.current?.files ?? []);
    if (!selected.length) {
      setMessage("Choose at least one learning file.");
      alertRef.current?.focus();
      return;
    }
    setWorking(true);
    setFiles(selected);
    setMessage("Validating and importing your files…");
    const body = new FormData();
    selected.forEach((file) => body.append("files", file));
    try {
      const response = await fetch("/api/learnings/import", { method: "POST", body });
      const action = await response.json() as CompanionActionResult<ImportResult>;
      if (!action.ok) throw new Error(action.error.message);
      setResult(action.data);
      setMessage(action.data.retryable ? "Some files need a retry. Keep your selection and retry the same import." : "Import complete.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The learning files could not be imported.");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="form-card">
      <form onSubmit={submit}>
        <label className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={drop}>
          <input ref={fileInputRef} aria-label="Learning files" name="learning-files" type="file" accept="application/json,.json" multiple onChange={select} />
          <span className="drop-icon" aria-hidden="true">↓</span>
          <strong>Choose files or drop them here</strong>
          <small>Up to 10 files · 1 MB each · 5 MB combined</small>
        </label>
        {files.length ? (
          <div className="selected-files" aria-label="Selected files">
            <strong>{files.length} selected</strong>
            <ul>{files.map((file, index) => <li key={`${file.name}-${file.lastModified}`}><span>{file.name}</span><small>{Math.ceil(file.size / 1024)} KB · Project: {previewScopes[index] ?? "Preview unavailable"} (validated on import)</small></li>)}</ul>
          </div>
        ) : null}
        <div className="form-actions">
          <button className="button primary" type="submit" disabled={working}>{working ? "Working…" : "Validate and import"}</button>
          <span className="privacy-note">Uploaded filenames are never used as storage paths.</span>
        </div>
      </form>
      {message ? <div className="notice" ref={alertRef} tabIndex={-1} role="status">{message}</div> : null}
      {result ? (
        <div className="import-results">
          <div className="result-summary"><strong>{result.imported} imported</strong><span>{result.duplicates} duplicate</span><span>{result.invalid} invalid</span><span>{result.retryable} need retry</span></div>
          <ul>{result.files.map((file, index) => <li key={`${file.name}-${index}`}><span className={`result-badge ${file.status}`}>{file.status}</span><strong>{file.name}</strong><small>{file.message}</small></li>)}</ul>
        </div>
      ) : null}
    </section>
  );
}
