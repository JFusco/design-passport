import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Script } from "node:vm";
import { afterEach, describe, expect, it } from "vitest";

const temporary: string[] = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

async function generate(developmentPluginId?: string) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "passport-native-harness-test-"));
  temporary.push(directory);
  const source = path.join(directory, "source");
  const output = path.join(directory, "output");
  await mkdir(path.join(source, "dist"), { recursive: true });
  const production = 'figma.ui.onmessage = async (message) => { productionCalls.push(message); };\n// "recheck-audit"\n';
  const ui = "<!doctype html><html><body><main>Unchanged production UI</main></body></html>\n";
  await Promise.all([
    writeFile(path.join(source, "manifest.json"), JSON.stringify({ name: "Design Passport", id: "same-plugin-id", main: "dist/code.js", ui: "dist/index.html", editorType: ["figma", "dev"] })),
    writeFile(path.join(source, "dist/code.js"), production), writeFile(path.join(source, "dist/index.html"), ui),
  ]);
  execFileSync(process.execPath, ["scripts/qa/build-native-harness.mjs", "--source-dir", source, "--source-revision", "1111111111111111111111111111111111111111", "--out", output, "--allowed-write-files", "private-copy", ...(developmentPluginId ? ["--development-plugin-id", developmentPluginId] : [])], { cwd: process.cwd(), stdio: "pipe" });
  return { source, output, production, ui, code: await readFile(path.join(output, "code.js"), "utf8"), metadata: JSON.parse(await readFile(path.join(output, "qa-build.json"), "utf8")) };
}

describe("native QA harness generation", () => {
  it("retains exact production bytes, records build digests and preserves plugin/storage identity", async () => {
    const fixture = await generate();
    expect(fixture.code.startsWith(fixture.production)).toBe(true);
    const html = await readFile(path.join(fixture.output, "index.html"), "utf8");
    expect(html.startsWith(fixture.ui)).toBe(true);
    expect(await readFile(path.join(fixture.output, "production-code.js"), "utf8")).toBe(fixture.production);
    expect(await readFile(path.join(fixture.output, "production-ui.html"), "utf8")).toBe(fixture.ui);
    expect(fixture.metadata.source.productionCodeSha256).toBe(sha(fixture.production));
    expect(fixture.metadata.source).toMatchObject({ revision: "1111111111111111111111111111111111111111", revisionSource: "explicit-archive", dirty: null });
    expect(fixture.metadata.source.productionUiSha256).toBe(sha(fixture.ui));
    expect(fixture.metadata.output.codeSha256).toBe(sha(fixture.code));
    expect(fixture.metadata.output.uiSha256).toBe(sha(html));
    expect(JSON.parse(await readFile(path.join(fixture.output, "manifest.json"), "utf8"))).toMatchObject({ id: "same-plugin-id", main: "code.js", ui: "index.html" });
  });

  it("isolates an explicitly supplied development ID without modifying production files", async () => {
    const fixture = await generate("1234567890123456789");
    expect(JSON.parse(await readFile(path.join(fixture.output, "manifest.json"), "utf8")).id).toBe("1234567890123456789");
    expect(JSON.parse(await readFile(path.join(fixture.source, "manifest.json"), "utf8")).id).toBe("same-plugin-id");
    expect(fixture.metadata.pluginIdentity).toEqual({ productionId: "same-plugin-id", developmentId: "1234567890123456789", isolatedStorage: true });
    expect(fixture.code.startsWith(fixture.production)).toBe(true);
    expect(fixture.metadata.allowedWriteFileKeys).toEqual(["private-copy"]);
  });

  it("forwards production reads unchanged and enforces copy-only writes without clearing any cache", async () => {
    const fixture = await generate();
    const productionCalls: unknown[] = [];
    const events: Array<{ type: string; message?: string }> = [];
    const live = { id: "node", type: "FRAME", name: "Original", removed: false };
    const figma = {
      fileKey: "production-original", editorType: "figma", root: { name: "Original", children: [] }, currentPage: { id: "page", selection: [] },
      ui: { onmessage: undefined as unknown as (message: unknown) => Promise<void>, postMessage: (message: typeof events[number]) => events.push(message) },
      getNodeByIdAsync: async () => live, commitUndo: () => undefined,
    };
    new Script(fixture.code).runInNewContext({ figma, console: { info: () => undefined }, productionCalls }, { timeout: 2000 });
    const scan = { type: "scan", request: { scope: "page", refreshKnowledge: true } };
    await figma.ui.onmessage(scan);
    expect(productionCalls).toEqual([scan]);
    for (const type of ["save-profile", "certify", "apply-plan", "qa-create-fixtures", "clear-file-cache", "forget-saved-audit"]) await figma.ui.onmessage({ type });
    await figma.ui.onmessage({ type: "qa-edit", nodeId: "node", field: "name", value: "Changed" });
    expect(live.name).toBe("Original");
    expect(productionCalls).toEqual([scan]);
    expect(events.filter((event) => event.type === "qa-error")).toHaveLength(7);
    expect(events.filter((event) => event.type.startsWith("qa-command-") && (event as { commandType?: string }).commandType === "scan")).toMatchObject([
      { type: "qa-command-started", commandId: "native-command-1", commandType: "scan" },
      { type: "qa-command-complete", commandId: "native-command-1", commandType: "scan", returned: "fulfilled" },
    ]);
    figma.fileKey = "private-copy";
    await figma.ui.onmessage({ type: "qa-edit", nodeId: "node", field: "name", value: "Changed" });
    expect(live.name).toBe("Changed");
    await figma.ui.onmessage({ type: "certify" });
    expect(productionCalls).toEqual([scan, { type: "certify" }]);
    for (const type of ["clear-file-cache", "forget-saved-audit"]) await figma.ui.onmessage({ type });
    expect(productionCalls).toHaveLength(4);
    expect(productionCalls.slice(-2)).toEqual([{ type: "clear-file-cache" }, { type: "forget-saved-audit" }]);
  });

  it("emits correlated completion only after production maintenance settles and retains rejected-handler completion", async () => {
    const runtime = (await readFile("scripts/qa/native-harness-runtime.js", "utf8")).replace("/*__QA_CONFIG__*/", JSON.stringify({ allowedWriteFileKeys: [] }));
    const events: Array<Record<string, unknown>> = [];
    const productionCalls: unknown[] = [];
    let release!: () => void;
    let reject = false;
    const figma = { fileKey: "original", editorType: "figma", ui: {
      postMessage: (message: Record<string, unknown>) => { events.push(message); },
      onmessage: async (message: unknown) => {
        productionCalls.push(message);
        if (reject) throw new Error("Controlled handler failure");
        events.push({ type: "scan-result" });
        await new Promise<void>((resolve) => { release = resolve; });
      },
    } };
    new Script(runtime).runInNewContext({ figma, console: { info: () => undefined } }, { timeout: 2000 });
    const message = { type: "scan", request: { scope: "page", refreshKnowledge: true } };
    const pending = figma.ui.onmessage({ ...message, __nativeQaCommandId: "qa-request-42" });
    expect(productionCalls).toEqual([message]);
    expect(events.map((event) => event.type)).toEqual(["qa-command-started", "scan-result"]);
    release();
    await pending;
    expect(events.at(-1)).toMatchObject({ type: "qa-command-complete", commandId: "qa-request-42", returned: "fulfilled" });
    reject = true;
    await figma.ui.onmessage({ ...message, __nativeQaCommandId: "qa-request-43" });
    expect(events.slice(-2)).toMatchObject([
      { type: "qa-error", commandId: "qa-request-43", message: "Error: Controlled handler failure" },
      { type: "qa-command-complete", commandId: "qa-request-43", returned: "rejected" },
    ]);
  });

  it("includes production preflight in QA timing and retains failed-attempt evidence", async () => {
    const fixture = await generate();
    const html = await readFile(path.join(fixture.output, "index.html"), "utf8");
    const script = html.slice(html.lastIndexOf("<script>") + "<script>".length, html.lastIndexOf("</script>"));
    const elements = new Map<string, { value: string; textContent: string; onclick?: () => void; disabled?: boolean; title?: string }>();
    const element = (id: string) => {
      if (!elements.has(id)) elements.set(id, { value: "", textContent: "" });
      return elements.get(id)!;
    };
    const exported: string[] = [];
    const sent: Array<{ pluginMessage: { __nativeQaCommandId?: string } }> = [];
    let now = 100;
    let listener: ((event: { data: { pluginMessage: unknown } }) => void) | undefined;
    new Script(script).runInNewContext({
      document: { getElementById: element, createElement: () => ({ click: () => undefined }) },
      window: { addEventListener: (_name: string, callback: typeof listener) => { listener = callback; } },
      parent: { postMessage: (message: typeof sent[number]) => sent.push(message) }, performance: { now: () => now },
      Blob: class { constructor(parts: string[]) { exported.push(parts.join("")); } },
      URL: { createObjectURL: () => "blob:evidence", revokeObjectURL: () => undefined }, setTimeout: () => 0,
    }, { timeout: 2000 });
    element("native-qa-page").onclick!();
    const firstCommand = sent[0]!.pluginMessage.__nativeQaCommandId;
    listener!({ data: { pluginMessage: { type: "qa-command-started", commandId: firstCommand } } });
    now = 500;
    listener!({ data: { pluginMessage: { type: "audit-started", target: { scope: "page" } } } });
    now = 900;
    listener!({ data: { pluginMessage: { type: "scan-result", report: { findings: [], snapshotHash: "current", grade: { score: 100, letter: "A" } }, plans: [] } } });
    now = 920;
    element("native-qa-page").onclick!();
    expect(sent).toHaveLength(1);
    now = 950;
    listener!({ data: { pluginMessage: { type: "qa-command-complete", commandId: firstCommand, handlerElapsedMs: 820, returned: "fulfilled" } } });
    now = 1000;
    element("native-qa-page").onclick!();
    const secondCommand = sent[1]!.pluginMessage.__nativeQaCommandId;
    now = 1100;
    listener!({ data: { pluginMessage: { type: "error", message: "Changed during capture" } } });
    now = 1120;
    listener!({ data: { pluginMessage: { type: "qa-command-complete", commandId: firstCommand, handlerElapsedMs: 1020, returned: "fulfilled" } } });
    now = 1200;
    listener!({ data: { pluginMessage: { type: "qa-command-complete", commandId: secondCommand, handlerElapsedMs: 180, returned: "fulfilled" } } });
    element("native-qa-export").onclick!();
    const evidence = JSON.parse(exported[0]!);
    expect(evidence.runs).toHaveLength(2);
    expect(evidence.runs[0]).toMatchObject({ timingOrigin: "qa-send", elapsedMs: 800, reportVisibleElapsedMs: 800, handlerCompleteElapsedMs: 850, status: "completed" });
    expect(evidence.runs[1]).toMatchObject({ timingOrigin: "qa-send", elapsedMs: 100, handlerCompleteElapsedMs: 200, status: "failed", failure: { message: "Changed during capture" } });
  });
});
