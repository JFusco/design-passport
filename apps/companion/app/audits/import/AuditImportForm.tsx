"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CompanionActionResult } from "@/lib/types";
import type { ImportBatchResult } from "../../../../../src/companion/imports";
type Preview = { files: Array<{ name: string; valid: boolean; scopes: string[] }>; suggestedScope: string | null; ambiguous: boolean };
export function AuditImportForm({ projects }: { projects: Array<{ scope: string; displayName: string | null }> }) {
  const [files, setFiles] = useState<File[]>([]);
  const [scope, setScope] = useState("");
  const [preview, setPreview] = useState<Preview>();
  const [result, setResult] = useState<ImportBatchResult>();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const alertRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const selected = Array.from(fileInputRef.current?.files ?? []);
    if (selected.length) setFiles(selected);
  }, []);
  useEffect(() => {
    if (!files.length || result) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [files.length, result]);
  function body() { const form = new FormData(); files.forEach((file) => form.append("files", file)); form.append("projectScope", scope); return form; }
  async function inspect() {
    setWorking(true); setMessage("Validating audit files…");
    try {
      const action = await (await fetch("/api/audits/preview", { method: "POST", body: body() })).json() as CompanionActionResult<Preview>;
      if (!action.ok) throw new Error(action.error.message);
      setPreview(action.data);
      if (action.data.suggestedScope) setScope(action.data.suggestedScope);
      setMessage(action.data.ambiguous ? "Matching contributions belong to multiple projects. Choose the intended project explicitly." : "Choose or create a project scope before importing.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Preview failed. Keep your files and retry."); alertRef.current?.focus(); }
    finally { setWorking(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setWorking(true); setMessage("Importing audit history…");
    try {
      const action = await (await fetch("/api/audits/import", { method: "POST", body: body() })).json() as CompanionActionResult<ImportBatchResult>;
      if (!action.ok) throw new Error(action.error.message);
      setResult(action.data);
      setMessage(action.data.retryable ? "Some files need a retry. Retry this selection; committed files will be deduplicated." : "Audit import complete.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed. Keep your files and retry."); alertRef.current?.focus(); }
    finally { setWorking(false); }
  }
  return <section className="form-card"><form onSubmit={submit}>
    <label className="field full"><span>Audit files</span><input ref={fileInputRef} aria-label="Audit files" name="audit-files" type="file" accept="application/json,.json" multiple onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); setPreview(undefined); setResult(undefined); }} /><small>Up to 10 files · 10 MB each · 25 MB combined</small></label>
    {files.length ? <ul aria-label="Selected audit files">{files.map((file, index) => <li key={index}>{file.name} · {new Intl.NumberFormat().format(file.size)} bytes</li>)}</ul> : null}
    <button className="button" type="button" disabled={working || !files.length} onClick={inspect}>Preview audit files</button>
    {preview ? <><ul>{preview.files.map((file, index) => <li key={index}>{file.name}: {file.valid ? file.scopes.length ? `Matching projects: ${file.scopes.join(", ")}` : "No matching contribution. Select or create a project." : "Invalid export; valid files can still be imported."}</li>)}</ul>
      <label className="field full"><span>Project scope</span><input aria-label="Project scope" name="projectScope" autoComplete="off" spellCheck={false} list="project-scopes" value={scope} onChange={(event) => setScope(event.target.value)} required placeholder="project:example…" /><small>Use the exact stable scope from the learning export. Names and filenames never determine scope.</small></label>
      <datalist id="project-scopes">{projects.map((project) => <option key={project.scope} value={project.scope}>{project.displayName ?? project.scope}</option>)}</datalist>
      <button className="button primary" disabled={working} type="submit">Import audit files</button></> : null}
  </form>
    {message ? <div className="notice" role="status" ref={alertRef} tabIndex={-1}>{message}</div> : null}
    {result ? <div className="import-results"><div className="result-summary"><strong>{result.imported} imported</strong><span>{result.duplicates} duplicate</span><span>{result.invalid} invalid</span><span>{result.retryable} need retry</span></div>
      <ul>{result.files.map((file, index) => <li key={index}><strong>{file.name}</strong><span>{file.message}</span></li>)}</ul></div> : null}
  </section>;
}
