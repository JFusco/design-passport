import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import type { BootstrapData } from "../../src/figma/adapter";
import type { PluginToUiMessage } from "../../src/plugin/messages";

type FixtureWindow = Window & { PassportTest: { bootstrap: BootstrapData; result: PluginToUiMessage } };
const deliver = (page: Page, message: PluginToUiMessage) => page.evaluate((json) => window.postMessage({ pluginMessage: JSON.parse(json) }, "*"), JSON.stringify(message));
let code: string;

test.beforeAll(async () => {
  const bundle = await build({
    stdin: { contents: `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { App } from "./src/ui/App";
      import { PRODUCER_IDENTITY } from "./src/core/build-info";
      import { buildChangePlans } from "./src/core/planner";
      import { buildReadinessReport } from "./src/core/report";
      import { buildKnowledgeSummary } from "./src/plugin/knowledge-summary";
      import { healthyGraph, profile } from "./tests/fixtures";
      const auditProfile = profile();
      const graph = healthyGraph(auditProfile);
      graph.nodes["root:desktop"].hasAnnotations = false;
      const report = buildReadinessReport({ graph, profile: auditProfile, scope: "selection", targetRootIds: ["root:desktop"] });
      export const bootstrap = {
        fileName: "Fixture", fileKeyAvailable: true, editorType: "figma", canMutateDocument: true,
        pages: [{ id: "page:1", name: "Screens" }], collections: [], profile: auditProfile, profileSuggestion: auditProfile,
        profileConfigured: true, profileIssues: [], selectionSummary: { eligibleCount: 1, unsupportedCount: 0 },
        projectStyleGuide: { state: "none", persistent: true }, producer: PRODUCER_IDENTITY,
      };
      export const result = {
        type: "scan-result", report, plans: buildChangePlans(report.findings), knowledge: buildKnowledgeSummary(graph), collections: [], insights: [],
        projectStyleGuide: bootstrap.projectStyleGuide, sessionReferenceCount: 0,
        savedAuditId: "audit:fixture", saveStatus: { state: "saved" },
      };
      createRoot(document.getElementById("root")).render(<App />);
    `, resolveDir: process.cwd(), loader: "tsx" },
    loader: { ".svg": "dataurl", ".png": "dataurl" }, bundle: true, write: false, format: "iife", globalName: "PassportTest", platform: "browser", define: { "process.env.NODE_ENV": '"production"' },
  });
  code = bundle.outputFiles[0]!.text;
});

test.beforeEach(async ({ page }) => {
  await page.setContent('<html lang="en"><head><title>Design Passport QA</title></head><body><div id="root"></div><output id="requests" data-count="0" data-refresh-count="0" data-export-count="0" data-export-format="" data-view-tab=""></output></body></html>');
  await page.evaluate(() => window.addEventListener("message", (event) => {
    if (["certify", "certify-components"].includes(event.data?.pluginMessage?.type)) {
      const requests = document.getElementById("requests")!;
      requests.dataset.count = String(Number(requests.dataset.count) + 1);
    }
    if (event.data?.pluginMessage?.type === "recheck-audit") document.getElementById("requests")!.dataset.refreshCount = String(Number(document.getElementById("requests")!.dataset.refreshCount) + 1);
    if (event.data?.pluginMessage?.type === "export") {
      const requests = document.getElementById("requests")!;
      requests.dataset.exportCount = String(Number(requests.dataset.exportCount) + 1);
      requests.dataset.exportFormat = event.data.pluginMessage.format;
    }
    if (event.data?.pluginMessage?.type === "save-audit-view") {
      document.getElementById("requests")!.dataset.viewTab = event.data.pluginMessage.viewState.activeTab;
    }
  }));
  const css = await readFile("src/ui/styles.css", "utf8");
  const font = await readFile("src/ui/assets/InterVariable.woff2");
  await page.addStyleTag({ content: css.replace("./assets/InterVariable.woff2", `data:font/woff2;base64,${font.toString("base64")}`) });
  await page.addScriptTag({ content: code });
  await expect(page.getByText("Loading Design Passport…")).toBeVisible();
});

async function mount(page: Page, devMode = false) {
  await page.evaluate((dev) => {
    const { bootstrap, result } = (window as unknown as FixtureWindow).PassportTest;
    window.postMessage({ pluginMessage: { type: "bootstrap", data: { ...bootstrap, editorType: dev ? "dev" : "figma", canMutateDocument: !dev }, rulesetVersion: "fixture", catalogVersion: "fixture", catalogDigest: "fixture" } }, "*");
    window.postMessage({ pluginMessage: result }, "*");
  }, devMode);
  await expect(page.getByRole("button", { name: "Regenerate audit to verify", exact: true })).toBeEnabled();
}

test("uses audit readiness with no certification controls, notices, or progress", async ({ page }) => {
  await mount(page);
  await expect(page.getByRole("button", { name: /certif/i })).toHaveCount(0);
  await expect(page.getByText(/certification|certifying/i)).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Plugin sections" })).toContainText(/AuditReport\d*Cleanup/u);
  await expect(page.getByText("Development build", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  await expect(page.locator("#requests")).toHaveAttribute("data-export-count", "1");
  await page.getByRole("button", { name: "Regenerate audit to verify", exact: true }).click();
  await expect(page.locator("#requests")).toHaveAttribute("data-refresh-count", "1");
  await expect(page.getByRole("button", { name: "Regenerate audit to verify", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Export JSON", exact: true })).toBeDisabled();
  await deliver(page, { type: "knowledge-stale" });
  await expect(page.getByRole("button", { name: "Export historical JSON", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: /certif/i })).toHaveCount(0);
  await expect(page.locator("#requests")).toHaveAttribute("data-count", "0");
});

test("retains unsaved setup gates and historical exports", async ({ page }) => {
  await mount(page);
  await page.getByRole("button", { name: "Audit setup", exact: true }).click();
  await page.getByText("Manual setup", { exact: true }).click();
  await page.getByLabel("Breakpoint width").first().fill("1400");
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await expect(page.getByRole("button", { name: "Regenerate audit to verify", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Audit", exact: true }).click();
  await expect(page.getByRole("button", { name: "Run audit · Current page", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Report", exact: false }).first().click();
  await expect(page.getByRole("button", { name: "Export JSON", exact: true })).toBeDisabled();
  await deliver(page, { type: "knowledge-stale" });
  await expect(page.getByRole("button", { name: "Export historical JSON", exact: true })).toBeEnabled();
});

test("retains Dev Mode cleanup gates while allowing audit and export", async ({ page }) => {
  await mount(page, true);
  await expect(page.getByText(/Dev Mode is audit-only/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Export JSON", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Cleanup", exact: true }).click();
  await expect(page.getByRole("button", { name: "Apply this fix", exact: true }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Apply safe & guarded", exact: true })).toBeDisabled();
});

test("gates first audit on context and keeps generation separate from the report", async ({ page }) => {
  await page.evaluate(() => {
    const { bootstrap } = (window as unknown as FixtureWindow).PassportTest;
    window.postMessage({ pluginMessage: { type: "bootstrap", data: bootstrap, rulesetVersion: "fixture", catalogVersion: "fixture", catalogDigest: "fixture" } }, "*");
  });
  await expect(page.getByRole("button", { name: "Generate context", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Run audit · Current page" })).toBeDisabled();
  await deliver(page, { type: "context-status", status: { state: "generating" } });
  await expect(page.getByRole("progressbar", { name: "Context generation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel generation" })).toBeEnabled();
  await deliver(page, { type: "context-status", status: { state: "current", validatedAt: new Date().toISOString(), outcome: "completed" } });
  await expect(page.getByRole("button", { name: "Run audit · Current page" })).toBeEnabled();
  await expect(page.locator(".result-hero")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Regenerate context" })).toBeVisible();
});

test("shows checking, preserves the score on fallback and retains a resolved row until Clear", async ({ page }) => {
  await mount(page);
  const details = await page.evaluate(() => {
    const result = (window as unknown as FixtureWindow).PassportTest.result;
    if (result.type !== "scan-result") throw new Error("Missing fixture");
    const finding = result.report.findings.find((finding) => finding.ruleId === "pipeline.annotation")!;
    return { hash: result.report.snapshotHash, finding };
  });
  const score = await page.locator(".result-hero .grade > span").innerText();
  await deliver(page, { type: "micro-check-started", reportHash: details.hash, requestId: "one", checkedKeys: ["issue:one"] });
  await expect(page.getByRole("button", { name: "Check again", exact: true }).first()).toBeDisabled();
  await deliver(page, { type: "micro-check-result", reportHash: details.hash, requestId: "one", checkedKeys: ["issue:one"], outcome: "requires-regeneration", reason: "Unsupported changes. Regenerate audit to verify." });
  await expect(page.locator(".result-hero .grade > span")).toHaveText(score);
  await expect(page.getByText("Unsupported changes. Regenerate audit to verify.")).toBeVisible();
  await page.evaluate((json: string) => {
    const { hash, finding } = JSON.parse(json);
    const result = (window as unknown as FixtureWindow).PassportTest.result;
    if (result.type !== "scan-result") throw new Error("Missing fixture");
    window.postMessage({ pluginMessage: { type: "micro-check-result", reportHash: hash, requestId: "two", checkedKeys: ["issue:one"], outcome: "resolved", reason: "Fix verified.", data: { ...result, report: { ...result.report, snapshotHash: "new-hash", grade: { letter: "A", score: 100 } }, issueReviewState: { records: [{ key: "issue:one", outcome: "resolved", checkedAt: new Date().toISOString(), previous: finding }], clearedKeys: [] } } } }, "*");
  }, JSON.stringify(details));
  await expect(page.locator(".result-hero .grade > span")).toHaveText("100.0 / 100");
  await expect(page.getByRole("region", { name: "Resolved issues" }).getByRole("button", { name: "Clear", exact: true })).toBeEnabled();
  await deliver(page, { type: "issue-cleared", reportHash: "new-hash", keys: ["issue:one"], persistence: { state: "session-only", message: "Clear could not be saved; session only." } });
  await expect(page.getByRole("button", { name: "Clear", exact: true })).toHaveCount(0);
  await expect(page.locator(".result-hero .grade > span")).toHaveText("100.0 / 100");
  await expect(page.getByText("Clear could not be saved; session only.")).toBeVisible();
});

test("opts a whole cleanup plan out and disables an empty batch", async ({ page }) => {
  await mount(page);
  await page.getByRole("button", { name: "Cleanup", exact: true }).click();
  const selected = page.getByRole("checkbox", { name: "Include complete plan in batch" });
  for (const box of await selected.all()) await box.uncheck();
  await expect(page.getByRole("button", { name: "Apply safe & guarded", exact: true })).toBeDisabled();
  await expect(page.getByText("0 plans selected", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply this fix", exact: true }).first()).toBeEnabled();
});

test("matches the dark layout at 320, 456 and 500px with keyboard focus and readable contrast", async ({ page }) => {
  await mount(page);
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const width of [320, 456, 500]) {
    await page.setViewportSize({ width, height: 720 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await page.locator(".hero-summary").innerText()).length).toBeLessThanOrEqual(120);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: `/tmp/design-passport-81-report-${width}.png`, fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  expect(await page.locator("html").evaluate((node) => getComputedStyle(node).colorScheme)).toBe("dark");
  await page.getByRole("button", { name: "Settings", exact: true }).focus();
  expect(await page.getByRole("button", { name: "Settings", exact: true }).evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Context & style guide" }).click();
  await expect(page.getByText("Style guide and references", { exact: true })).toBeVisible();
});
