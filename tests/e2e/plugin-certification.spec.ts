import { expect, test, type Page } from "@playwright/test";
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
    bundle: true, write: false, format: "iife", globalName: "PassportTest", platform: "browser", define: { "process.env.NODE_ENV": '"production"' },
  });
  code = bundle.outputFiles[0]!.text;
});

test.beforeEach(async ({ page }) => {
  await page.setContent('<div id="root"></div><output id="requests" data-count="0" data-refresh-count="0" data-export-count="0" data-export-format="" data-view-tab=""></output>');
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
  await page.addScriptTag({ content: code });
  await expect(page.getByText("Loading Design Passport…")).toBeVisible();
});

async function mount(page: Page, devMode = false) {
  await page.evaluate((dev) => {
    const { bootstrap, result } = (window as unknown as FixtureWindow).PassportTest;
    window.postMessage({ pluginMessage: { type: "bootstrap", data: { ...bootstrap, editorType: dev ? "dev" : "figma", canMutateDocument: !dev }, rulesetVersion: "fixture", catalogVersion: "fixture", catalogDigest: "fixture" } }, "*");
    window.postMessage({ pluginMessage: result }, "*");
  }, devMode);
  await expect(page.getByRole("button", { name: "Refresh audit", exact: true })).toBeEnabled();
}

test("uses audit readiness with no certification controls, notices, or progress", async ({ page }) => {
  await mount(page);
  await expect(page.getByRole("button", { name: /certif/i })).toHaveCount(0);
  await expect(page.getByText(/certification|certifying/i)).toHaveCount(0);
  await expect(page.getByText(/Aim for B or better and a ready result/)).toBeVisible();
  await expect(page.getByText("Development build", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  await expect(page.locator("#requests")).toHaveAttribute("data-export-count", "1");
  await page.getByRole("button", { name: "Refresh audit", exact: true }).click();
  await expect(page.locator("#requests")).toHaveAttribute("data-refresh-count", "1");
  await expect(page.getByRole("button", { name: "Refresh audit", exact: true })).toBeDisabled();
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
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("button", { name: "Refresh audit", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Current page", exact: true })).toBeDisabled();
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
