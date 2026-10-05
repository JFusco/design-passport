import type { ReadinessReport } from "../../src/core/contracts";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const companionOrigin = `http://127.0.0.1:${process.env.DESIGN_PASSPORT_E2E_PORT ?? 5180}`;

function auditFixture(): ReadinessReport { return JSON.parse(readFileSync(join(process.cwd(), "tests/e2e/fixtures/valid-audit.json"), "utf8")) as ReadinessReport; }

function learningFile(): Buffer {
  return readFileSync(join(process.cwd(), "tests", "e2e", "fixtures", "valid-learning.json"));
}

async function expectNoSeriousAccessibilityIssues(page: import("@playwright/test").Page) {
  await expect(page).toHaveTitle(/Design Passport/u);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/bootstrap?cap=e2e-capability");
  await expect(page).toHaveURL("/");
});

test("completes the local reference, import, conflict recovery, and decision workflow", async ({ context, page }) => {
  const browserErrors: string[] = [];
  let expectedConflictError = false;
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (expectedConflictError && message.text().includes("409 (Conflict)")) {
      expectedConflictError = false;
      return;
    }
    browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await expect(page.getByRole("heading", { name: "Turn reviewed design evidence into useful guidance." })).toBeVisible();
  await expectNoSeriousAccessibilityIssues(page);
  const dashboardResponse = await page.request.get("/");
  const csp = dashboardResponse.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/u);
  expect(csp).not.toContain("'unsafe-inline'");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.getByRole("link", { name: "Create reference pack" }).first().evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");

  await page.getByRole("link", { name: "Create reference pack" }).first().click();
  await page.getByLabel("Figma file link").fill("https://www.figma.com/design/abcdefgh/Library");
  await page.getByLabel("Source name").fill("style-guide:e2e");
  await page.getByRole("textbox", { name: /^Project /u }).fill("project:companion-e2e");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Create and download pack" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("style-guide-e2e.design-passport-reference.json");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const pack = JSON.parse(await readFile(downloadPath!, "utf8")) as { source: { projectScope: string; role: string }; digest: string };
  expect(pack.source).toMatchObject({ projectScope: "project:companion-e2e", role: "style-guide" });
  expect(pack.digest).toMatch(/^h53:[0-9a-f]{14}$/u);
  await expect(page.getByText("Reference pack created and downloaded.")).toBeVisible();
  expect(await page.content()).not.toContain("e2e-fixture-token");
  expect(await page.content()).not.toContain("postgres://design_passport_test");
  const scriptUrls = await page.locator("script[src]").evaluateAll((elements) => elements.map((element) => (element as HTMLScriptElement).src));
  for (const scriptUrl of scriptUrls) {
    const script = await (await page.request.get(scriptUrl)).text();
    expect(script).not.toContain("e2e-fixture-token");
    expect(script).not.toContain("postgres://design_passport_test");
  }

  await page.getByRole("link", { name: "Import" }).click();
  await page.getByLabel("Learning files").setInputFiles([
    { name: "valid-learning.json", mimeType: "application/json", buffer: learningFile() },
    { name: "invalid-learning.json", mimeType: "application/json", buffer: Buffer.from("{") },
  ]);
  await page.getByRole("button", { name: "Validate and import" }).click();
  await expect(page.getByText("1 imported", { exact: true })).toBeVisible();
  await expect(page.getByText("1 invalid", { exact: true })).toBeVisible();
  await expectNoSeriousAccessibilityIssues(page);

  await page.getByRole("link", { name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Make every guidance decision explicit" })).toBeVisible();
  await expect(page).toHaveURL(/candidate=/u);
  const guidance = page.getByRole("textbox", { name: /^Guidance /u });
  const initialGuidance = await guidance.inputValue();

  await page.getByLabel("Filter by status").selectOption("approved");
  await expect(page.getByText("0 drafts", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toHaveCount(0);
  await page.getByLabel("Filter by status").selectOption("all");
  await expect(page.getByRole("textbox", { name: /^Guidance /u })).toHaveValue(initialGuidance);

  const queueItems = page.locator(".queue-item");
  expect(await queueItems.count()).toBeGreaterThan(1);
  const firstQueueItem = queueItems.first();
  const secondQueueItem = queueItems.nth(1);
  const firstLabel = await firstQueueItem.locator("strong").innerText();
  const localDraft = `${initialGuidance} Unsaved review note.`;
  await guidance.fill(localDraft);
  await secondQueueItem.click();
  await firstQueueItem.click();
  await expect(page.getByRole("textbox", { name: /^Guidance /u })).toHaveValue(localDraft);
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await page.getByRole("button", { name: new RegExp(firstLabel, "u") }).first().click();
  await expect(page.getByRole("textbox", { name: /^Guidance /u })).toHaveValue(localDraft);
  await page.getByRole("textbox", { name: /^Guidance /u }).fill(initialGuidance);

  const concurrentPage = await context.newPage();
  await concurrentPage.goto("/review");
  const concurrentGuidance = concurrentPage.getByRole("textbox", { name: /^Guidance /u });
  const currentServerGuidance = `${initialGuidance} Changed elsewhere.`;
  await concurrentGuidance.fill(currentServerGuidance);
  await concurrentPage.getByRole("button", { name: "Save changes" }).click();
  await expect(concurrentPage.getByText("Draft saved. You can now record a decision.")).toBeVisible();

  const retainedEdit = `${initialGuidance} Keep this local edit.`;
  await guidance.fill(retainedEdit);
  expectedConflictError = true;
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("This draft changed. Reload it before saving.")).toBeVisible();
  await expect(guidance).toHaveValue(retainedEdit);
  await page.getByRole("button", { name: "Reload current draft" }).click();
  await expect(page.getByRole("textbox", { name: /^Guidance /u })).toHaveValue(currentServerGuidance);
  await expect(page.locator('.notice pre')).toContainText('Keep this local edit.');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  await page.getByRole('button', { name: 'Discard recovered draft' }).click();
  await expect(page).toHaveURL(/candidate=/u);
  await concurrentPage.close();

  await guidance.fill(`${currentServerGuidance} Apply consistently.`);
  await expect(page.getByRole("button", { name: "Approve" })).toBeDisabled();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Draft saved. You can now record a decision.")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Add a short decision note.")).toBeVisible();
  await expect(page.getByLabel("Decision note")).toBeFocused();
  await page.getByLabel("Decision note").fill("Reviewed in the companion browser flow.");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved decision saved.")).toBeVisible();
  await expectNoSeriousAccessibilityIssues(page);
  await page.reload();
  await expect(page.getByText(/Current decision: Approved/u)).toBeVisible();
  await expect(page.getByRole("button", { name: "Approved", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reject", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Defer", exact: true })).toBeEnabled();

  await page.getByLabel("Publication scope").selectOption("shared");
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeDisabled();
  await page.getByLabel("Publication scope").selectOption("project");
  await expect(page.getByRole("button", { name: "Approved", exact: true })).toBeDisabled();

  const revisedGuidance = `${currentServerGuidance} Reviewed revision.`;
  await guidance.fill(revisedGuidance);
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Draft saved. You can now record a decision.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeEnabled();
  await expect(page.getByText(/Previous decision requires review/u)).toBeVisible();
  const withdrawnPack = await page.request.get("/api/guidance?scope=project%3Acompanion-e2e");
  expect(withdrawnPack.status()).toBe(404);
  expect(await withdrawnPack.json()).toMatchObject({ ok: false, error: { code: "not-found" } });
  await page.getByLabel("Decision note").fill("Reviewed the saved revision.");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approved", exact: true })).toBeDisabled();

  for (const action of ["Reject", "Defer"] as const) {
    await page.getByLabel("Decision note").fill(`Changed the decision to ${action.toLowerCase()}.`);
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeEnabled();
    await page.getByLabel("Decision note").fill(`Reapproved after ${action.toLowerCase()}.`);
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.getByRole("button", { name: "Approved", exact: true })).toBeDisabled();
  }

  await page.goto("/");
  const guidanceDownloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download project:companion-e2e guidance" }).click();
  const guidanceDownload = await guidanceDownloadPromise;
  expect(guidanceDownload.suggestedFilename()).toBe("design-passport-guidance-project-companion-e2e.json");
  const guidanceDownloadPath = await guidanceDownload.path();
  const approvedPack = JSON.parse(await readFile(guidanceDownloadPath!, "utf8")) as { source: { role: string; projectScope: string }; facts: Array<{ provenance: string; guidance: string }> };
  expect(approvedPack.source).toMatchObject({ role: "style-guide", projectScope: "project:companion-e2e" });
  expect(approvedPack.facts.every((fact) => fact.provenance === "approved-project")).toBe(true);
  expect(approvedPack.facts.map((fact) => fact.guidance)).toEqual([revisedGuidance]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Turn reviewed design evidence into useful guidance." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(expectedConflictError).toBe(false);
  expect(browserErrors).toEqual([]);
});

test("rejects requests without the process capability or same origin", async ({ browser, page }) => {
  const crossOrigin = await page.context().request.post(`${companionOrigin}/api/learnings/import`, { headers: { origin: "https://example.com" } });
  expect(crossOrigin.status()).toBe(403);

  const context = await browser.newContext();
  const unauthorizedPage = await context.newPage();
  await unauthorizedPage.goto("/");
  await expect(unauthorizedPage).toHaveURL("/access-denied");
  const unauthorized = await context.request.post(`${companionOrigin}/api/learnings/import`, { headers: { origin: companionOrigin } });
  expect(unauthorized.status()).toBe(403);
  const unauthorizedDownload = await context.request.get(`${companionOrigin}/api/guidance?scope=project%3Acompanion-e2e`, { headers: { origin: companionOrigin } });
  expect(unauthorizedDownload.status()).toBe(403);
  await context.close();
});

test("imports audit history, filters records, inspects provenance and downloads preserved payloads", async ({ page, browser }) => {
  for (const path of ["/api/audits/------------------------------------", "/api/audits/download/------------------------------------"]) {
    const response = await page.request.get(path);
    expect(response.status()).toBe(404);
    expect((await response.json()).error.code).toBe("not-found");
  }
  await page.goto("/history/audit?cursor=invalid");
  await expect(page.getByRole("heading", { name: "Request could not be completed" })).toBeVisible();
  await expect(page.getByText("The history cursor is invalid.")).toBeVisible();
  const report = auditFixture();
  const wrapper = { schemaVersion: 1, kind: "historical-audit", freshness: "historical", savedAt: "2026-09-24T12:00:00Z", target: { scope: "selection", nodeIds: ["root:desktop"] }, provenance: { pluginVersion: "synthetic", knowledgeVersion: "1" }, report };
  await page.goto("/history/audit");
  await page.getByRole("link", { name: "Import audits", exact: true }).click();
  await expect(page.getByText(/Audit files can contain node paths/u)).toBeVisible();
  await page.getByLabel("Audit files", { exact: true }).setInputFiles([
    { name: "report.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(report)) },
    { name: "historical.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(wrapper)) },
    { name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{") },
  ]);
  let releasePreview!: () => void;
  const previewHeld = new Promise<void>((resolve) => { releasePreview = resolve; });
  let previewReached!: () => void;
  const previewReady = new Promise<void>((resolve) => { previewReached = resolve; });
  await page.route("**/api/audits/preview", async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    previewReached();
    await previewHeld;
    await route.fulfill({ response });
  }, { times: 1 });
  await page.getByRole("button", { name: "Preview audit files" }).click();
  await previewReady;
  try {
    const auditFiles = page.getByLabel("Audit files", { exact: true });
    await expect(auditFiles).toBeDisabled();
    let chooserOpened = false;
    const onFileChooser = () => { chooserOpened = true; };
    page.on("filechooser", onFileChooser);
    await auditFiles.click({ force: true });
    page.off("filechooser", onFileChooser);
    expect(chooserOpened).toBe(false);
    expect(await auditFiles.evaluate((input) => Array.from((input as HTMLInputElement).files ?? [], (file) => file.name))).toEqual(["report.json", "historical.json", "bad.json"]);
  } finally { releasePreview(); }
  await expect(page.getByText("Invalid export; valid files can still be imported.", { exact: false })).toBeVisible();
  await page.getByLabel("Project scope", { exact: true }).fill("project:audit-browser");
  await page.getByRole("button", { name: "Import audit files", exact: true }).click();
  await expect(page.getByText("2 imported", { exact: true })).toBeVisible();
  await expect(page.getByText("1 invalid", { exact: true })).toBeVisible();
  await expectNoSeriousAccessibilityIssues(page);
  const nextReport = { ...report, generatedAt: "2026-09-24T12:00:00.000Z", target: { ...report.target, knowledgeSnapshotHash: "h53:00000000000002" } };
  await page.getByLabel("Audit files", { exact: true }).setInputFiles({ name: "next-report.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(nextReport)) });
  await expect(page.getByLabel("Project scope", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Import audit files", exact: true })).toHaveCount(0);
  const nextPreview = page.waitForResponse("**/api/audits/preview");
  await page.getByRole("button", { name: "Preview audit files" }).click();
  expect((await (await nextPreview).json()).data).toMatchObject({ files: [{ name: "next-report.json", valid: true, scopes: [] }], suggestedScope: null });
  const projectScope = page.getByLabel("Project scope", { exact: true });
  await expect(projectScope).toHaveValue("");
  let nextImports = 0;
  await page.route("**/api/audits/import", async (route) => { nextImports += 1; await route.continue(); });
  await page.getByRole("button", { name: "Import audit files", exact: true }).click();
  await expect(projectScope).toBeFocused();
  expect(nextImports).toBe(0);
  await projectScope.fill("project:audit-preview-next");
  await page.getByRole("button", { name: "Import audit files", exact: true }).click();
  await expect(page.getByText("1 imported", { exact: true })).toBeVisible();
  expect(nextImports).toBe(1);
  await page.unroute("**/api/audits/import");
  const originalRows = (await (await page.request.get("/api/audits?project=project%3Aaudit-browser")).json()).data.rows;
  expect(originalRows).toHaveLength(1);
  expect(originalRows[0]).toMatchObject({ projectScope: "project:audit-browser", sourceAt: report.generatedAt });
  const nextRows = (await (await page.request.get("/api/audits?project=project%3Aaudit-preview-next")).json()).data.rows;
  expect(nextRows).toHaveLength(1);
  const nextDetail = (await (await page.request.get(`/api/audits/${nextRows[0].id}`)).json()).data;
  expect(nextDetail).toMatchObject({ projectScope: "project:audit-preview-next", report: nextReport });
  await page.goto("/history/audit");
  await page.getByRole("combobox", { name: "Project", exact: true }).selectOption("project:audit-browser");
  await page.getByRole("combobox", { name: "Grade", exact: true }).selectOption(report.grade.letter);
  await page.getByRole("button", { name: "Filter history" }).click();
  await expect(page.getByText("1 records on this page")).toBeVisible();
  await page.getByRole("link", { name: /project:audit-browser ·/u }).click();
  await expect(page.getByRole("heading", { name: "Recorded audit", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Findings", exact: true })).toBeVisible();
  await page.getByText("Provenance and target", { exact: true }).last().click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download original historical export" }).click();
  const download = await downloadPromise;
  expect(JSON.parse(await readFile((await download.path())!, "utf8"))).toEqual(wrapper);
  await expectNoSeriousAccessibilityIssues(page);
  await page.goto("/history/learning");
  const learningHistory = await (await page.request.get("/api/learnings")).json();
  const learningId = learningHistory.data.rows.find((row: { projectScope: string }) => row.projectScope === "project:companion-e2e").id;
  const detailResponse = await page.request.get(`/api/learnings/${encodeURIComponent(learningId)}`);
  expect(detailResponse.status()).toBe(200);
  await page.getByRole("link", { name: /project:companion-e2e ·/u }).first().click();
  await expect(page.getByRole("heading", { name: "Candidate revisions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Decisions", exact: true })).toBeVisible();
  const context = await browser.newContext();
  for (const path of ["/api/audits", "/api/learnings", "/api/projects"]) expect((await context.request.get(`${companionOrigin}${path}`)).status()).toBe(403);
  await context.close();
});

test("retains unsaved input when the database is unavailable and replays a lost decision response", async ({ page }) => {
  await page.goto("/learnings/import");
  await page.getByLabel("Learning files").setInputFiles({ name: "valid.json", mimeType: "application/json", buffer: learningFile() });
  await page.route("**/api/learnings/import", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: { code: "unavailable", message: "The database is unavailable. Retry the same action." } }) }));
  await page.getByRole("button", { name: "Validate and import" }).click();
  await expect(page.getByText("The database is unavailable. Retry the same action.")).toBeVisible();
  await expect(page.getByText("valid.json", { exact: true })).toBeVisible();
  await page.unroute("**/api/learnings/import");
  await page.getByRole("button", { name: "Validate and import" }).click();
  await expect(page.getByText("1 duplicate", { exact: true })).toBeVisible();
  await page.goto("/review");
  await page.getByLabel("Filter by status").selectOption("awaiting");
  await page.getByLabel("Decision note").fill("Synthetic lost response replay.");
  let requestId = "";
  let calls = 0;
  await page.route("**/api/decisions", async (route) => {
    const body = route.request().postDataJSON() as { requestId: string };
    calls += 1;
    if (calls === 1) {
      requestId = body.requestId;
      await route.fetch(); // Deliberately discard a committed server response.
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: { code: "unavailable", message: "Response lost. Retry the same action." } }) });
    } else { expect(body.requestId).toBe(requestId); await route.continue(); }
  });
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Response lost. Retry the same action.")).toBeVisible();
  await expect(page.getByLabel("Decision note")).toHaveValue("Synthetic lost response replay.");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Approved decision saved.")).toBeVisible();
  expect(calls).toBe(2);
});

test("accepts complete uploads above 10 MiB and rejects streamed oversized bodies before persistence", async ({ page }) => {
  test.setTimeout(90_000);
  const base = auditFixture();
  const reports = [0, 1].map((index) => ({ ...base, generatedAt: `2026-09-${25 + index}T12:00:00Z`, findings: base.findings.map((finding, offset) => offset === 0 ? { ...finding, message: "synthetic ".repeat(610_000) } : finding) }));
  const buffers = reports.map((report) => Buffer.from(JSON.stringify(report)));
  expect(buffers.every((buffer) => buffer.length < 10_000_000)).toBe(true);
  expect(buffers.reduce((sum, buffer) => sum + buffer.length, 0)).toBeGreaterThan(10 * 1024 * 1024);
  const response = await page.request.post("/api/audits/import", { headers: { origin: companionOrigin }, multipart: { projectScope: "project:large-synthetic", files: { name: "large-0.json", mimeType: "application/json", buffer: buffers[0]! } } });
  expect(response.status()).toBe(200);
  // Native FormData supports repeated file fields; test the real proxy in one request.
  const response2 = await page.evaluate(async (payload: string) => {
    const reports = JSON.parse(payload) as unknown[];
    const form = new FormData(); form.append("projectScope", "project:large-pair");
    reports.forEach((report, index) => form.append("files", new File([JSON.stringify(report)], `large-${index}.json`, { type: "application/json" })));
    const reply = await fetch("/api/audits/import", { method: "POST", body: form });
    return { status: reply.status, body: await reply.json() };
  }, JSON.stringify(reports));
  expect(response2.status).toBe(200); expect(response2.body.data.imported).toBe(2);
  const stored = (await (await page.request.get("/api/audits?project=project%3Alarge-pair")).json()).data.rows as Array<{ id: string }>;
  expect(stored).toHaveLength(2);
  for (const row of stored) {
    const detail = (await (await page.request.get(`/api/audits/${row.id}`)).json()).data;
    const source = await (await page.request.get(`/api/audits/download/${detail.exports[0].id}`)).json();
    expect(reports).toContainEqual(source);
  }
  const { request: nodeRequest } = await import("node:http");
  async function oversized(size: number, chunked: boolean) {
    return new Promise<number>((resolve, reject) => {
      const request = nodeRequest(`${companionOrigin}/api/audits/import`, { method: "POST", headers: { origin: companionOrigin, cookie: "design_passport_local_session=e2e-capability", "content-type": "application/octet-stream", ...(chunked ? {} : { "content-length": String(size) }) } }, (reply) => { reply.resume(); reply.once("end", () => resolve(reply.statusCode!)); });
      request.once("error", reject);
      const block = Buffer.alloc(64 * 1024, "x"); let remaining = size;
      const send = () => { while (remaining > 0) { const length = Math.min(block.length, remaining); remaining -= length; if (!request.write(block.subarray(0, length))) { request.once("drain", send); return; } } request.end(); };
      send();
    });
  }
  for (const size of [26_000_001, 27_000_001]) for (const chunked of [false, true]) expect(await oversized(size, chunked)).toBe(413);
  const after = (await (await page.request.get("/api/audits?project=project%3Alarge-pair")).json()).data.rows;
  expect(after).toEqual(stored);
  const hostDenied = await page.request.get("/api/audits", { headers: { host: "example.com" } });
  expect(hostDenied.status()).toBe(403);
});
