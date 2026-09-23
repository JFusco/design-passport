import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const companionOrigin = "http://127.0.0.1:5180";

function learningFile(): Buffer {
  return readFileSync(join(process.cwd(), "tests", "e2e", "fixtures", "valid-learning.json"));
}

async function expectNoSeriousAccessibilityIssues(page: import("@playwright/test").Page) {
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
  const scriptUrls = await page.locator("script[src]").evaluateAll((elements) => elements.map((element) => (element as HTMLScriptElement).src));
  for (const scriptUrl of scriptUrls) {
    expect(await (await page.request.get(scriptUrl)).text()).not.toContain("e2e-fixture-token");
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

  await page.goto("/");
  const guidanceDownloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download project:companion-e2e guidance" }).click();
  const guidanceDownload = await guidanceDownloadPromise;
  expect(guidanceDownload.suggestedFilename()).toBe("design-passport-guidance-project-companion-e2e.json");
  const guidanceDownloadPath = await guidanceDownload.path();
  const approvedPack = JSON.parse(await readFile(guidanceDownloadPath!, "utf8")) as { source: { role: string; projectScope: string }; facts: Array<{ provenance: string }> };
  expect(approvedPack.source).toMatchObject({ role: "style-guide", projectScope: "project:companion-e2e" });
  expect(approvedPack.facts.every((fact) => fact.provenance === "approved-project")).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Turn reviewed design evidence into useful guidance." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(expectedConflictError).toBe(false);
  expect(browserErrors).toEqual([]);
});

test("rejects requests without the process capability or same origin", async ({ browser, page }) => {
  const crossOrigin = await page.context().request.post(`${companionOrigin}/api/rebuild`, { headers: { origin: "https://example.com" } });
  expect(crossOrigin.status()).toBe(403);

  const context = await browser.newContext();
  const unauthorizedPage = await context.newPage();
  await unauthorizedPage.goto("/");
  await expect(unauthorizedPage).toHaveURL("/access-denied");
  const unauthorized = await context.request.post(`${companionOrigin}/api/rebuild`, { headers: { origin: companionOrigin } });
  expect(unauthorized.status()).toBe(403);
  const unauthorizedDownload = await context.request.get(`${companionOrigin}/api/guidance?scope=project%3Acompanion-e2e`, { headers: { origin: companionOrigin } });
  expect(unauthorizedDownload.status()).toBe(403);
  await context.close();
});
