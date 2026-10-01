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
      import { buildReadinessReport } from "./src/core/report";
      import { buildKnowledgeSummary } from "./src/plugin/knowledge-summary";
      import { healthyGraph, profile } from "./tests/fixtures";
      const auditProfile = profile();
      const graph = healthyGraph(auditProfile);
      const report = buildReadinessReport({ graph, profile: auditProfile, scope: "selection", targetRootIds: ["root:desktop"] });
      export const bootstrap = {
        fileName: "Fixture", fileKeyAvailable: true, editorType: "figma", canMutateDocument: true,
        pages: [{ id: "page:1", name: "Screens" }], collections: [], profile: auditProfile, profileSuggestion: auditProfile,
        profileConfigured: true, profileIssues: [], selectionSummary: { eligibleCount: 1, unsupportedCount: 0 },
        projectStyleGuide: { state: "none", persistent: true }, producer: PRODUCER_IDENTITY,
      };
      export const result = {
        type: "scan-result", report, plans: [], knowledge: buildKnowledgeSummary(graph), collections: [], insights: [],
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
  await page.setContent('<div id="root"></div><output id="requests" data-count="0" data-export-count="0" data-export-format="" data-view-tab=""></output>');
  await page.evaluate(() => window.addEventListener("message", (event) => {
    if (event.data?.pluginMessage?.type === "certify") {
      const requests = document.getElementById("requests")!;
      requests.dataset.count = String(Number(requests.dataset.count) + 1);
    }
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
  await page.evaluate(() => {
    const { bootstrap, result } = (window as unknown as FixtureWindow).PassportTest;
    window.postMessage({ pluginMessage: { type: "bootstrap", data: bootstrap, rulesetVersion: "fixture", catalogVersion: "fixture", catalogDigest: "fixture" } }, "*");
    window.postMessage({ pluginMessage: result }, "*");
  });
  await expect(page.getByRole("button", { name: "Certify source frames", exact: true })).toBeEnabled();
});

test("blocks duplicate clicks and competing mutations until certification finishes", async ({ page }) => {
  await page.getByRole("button", { name: "Certify source frames", exact: true }).evaluate((button) => {
    // Two events in one task exercise the ref guard before React can repaint.
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.locator("#requests")).toHaveAttribute("data-count", "1");
  await expect(page.locator(".panel-host")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: "Certifying…" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Certifying…" })).toBeDisabled();
  await expect(page.locator(".panel-host")).not.toHaveAttribute("inert");
  await expect(page.locator(".notification-stack > .banner.info")).toContainText("Certifying…");
  await expect(page.getByText("Refresh audit", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Clear rebuildable context", exact: true })).toBeDisabled();
  await deliver(page, { type: "knowledge-stale" });
  await expect(page.getByRole("button", { name: "Export historical JSON", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Export historical Markdown", exact: true })).toBeDisabled();
  await deliver(page, { type: "error", message: "Another command was rejected", nonTerminal: true });
  await expect(page.locator(".panel-host")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator(".footer-actions button").filter({ hasText: "Certifying…" })).toBeDisabled();
  await deliver(page, { type: "certified", count: 1, target: "source frames", removedVariantAnnotations: 0 });
  await expect(page.locator(".panel-host")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByText("Refresh this audit before certifying.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export historical JSON", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Export historical Markdown", exact: true })).toBeEnabled();
  await expect(page.locator("#requests")).toHaveAttribute("data-export-count", "0");
  await page.getByRole("button", { name: "Export historical JSON", exact: true }).click();
  await expect(page.locator("#requests")).toHaveAttribute("data-export-count", "1");
  await expect(page.locator("#requests")).toHaveAttribute("data-export-format", "json");
});

for (const terminal of ["error", "profile-invalidated"] as const) {
  test(`clears certification busy state on ${terminal}`, async ({ page }) => {
    await page.getByRole("button", { name: "Certify source frames", exact: true }).click();
    await expect(page.locator(".panel-host")).toHaveAttribute("aria-busy", "true");
    if (terminal === "error") await deliver(page, { type: "error", message: "Verification failed" });
    else await page.evaluate(() => window.postMessage({ pluginMessage: { type: "profile-invalidated", data: (window as unknown as FixtureWindow).PassportTest.bootstrap } }, "*"));
    await expect(page.locator(".panel-host")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".panel-host")).not.toHaveAttribute("inert");
  });
}

test("recovers from a cancelled certification and allows another attempt", async ({ page }) => {
  await page.getByRole("button", { name: "Certify source frames", exact: true }).click();
  await deliver(page, { type: "scan-cancelled" });
  await expect(page.locator(".panel-host")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".panel-host")).not.toHaveAttribute("inert");
  await expect(page.getByRole("button", { name: "Certify source frames", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Certify source frames", exact: true }).click();
  await expect(page.locator("#requests")).toHaveAttribute("data-count", "2");
});

test("persists tab changes while certification is pending", async ({ page }) => {
  await page.getByRole("button", { name: "Certify source frames", exact: true }).click();
  await page.getByRole("button", { name: "Findings", exact: false }).click();
  await expect(page.locator("#requests")).toHaveAttribute("data-view-tab", "findings");
});
