import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import type { BootstrapData } from "../../src/figma/adapter";
import type { PluginToUiMessage } from "../../src/plugin/messages";

type FixtureWindow = Window & { PassportTest: { bootstrap: BootstrapData; result: PluginToUiMessage } };
const deliver = (page: Page, message: PluginToUiMessage) => page.evaluate((json) => window.postMessage({ pluginMessage: JSON.parse(json) }, "*"), JSON.stringify(message));
let code: string;
const visualArtifacts = process.env.DESIGN_PASSPORT_VISUAL_ARTIFACTS ?? tmpdir();

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
  await expect(page.locator(".result-hero")).toBeVisible();
}

test("uses audit readiness with no certification controls, notices, or progress", async ({ page }) => {
  await mount(page);
  await page.getByText("Audit details & exports", { exact: true }).click();
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
  await page.getByText("Audit details & exports", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Regenerate audit to verify", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Audit", exact: true }).click();
  await expect(page.getByRole("button", { name: "Run audit · Current page", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Report", exact: false }).first().click();
  await page.getByText("Audit details & exports", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Export JSON", exact: true })).toBeDisabled();
  await deliver(page, { type: "knowledge-stale" });
  await expect(page.getByRole("button", { name: "Export historical JSON", exact: true })).toBeEnabled();
});

test("retains Dev Mode cleanup gates while allowing audit and export", async ({ page }) => {
  await mount(page, true);
  await page.getByText("Audit details & exports", { exact: true }).click();
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
  await page.locator(".issue-category").filter({ has: page.getByRole("button", { name: "Check again", exact: true, includeHidden: true }) }).first().locator("summary").first().click();
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
  await expect(page.locator(".result-hero .grade > span")).toHaveText("100.00");
  await expect(page.getByRole("region", { name: "Resolved issues" }).getByRole("button", { name: "Clear", exact: true })).toBeEnabled();
  await deliver(page, { type: "issue-cleared", reportHash: "new-hash", keys: ["issue:one"], persistence: { state: "session-only", message: "Clear could not be saved; session only." } });
  await expect(page.getByRole("button", { name: "Clear", exact: true })).toHaveCount(0);
  await expect(page.locator(".result-hero .grade > span")).toHaveText("100.00");
  await expect(page.getByText("Clear could not be saved; session only.")).toBeVisible();
});

test("keeps Figma navigation above notices and pinned on every destination", async ({ page }) => {
  await mount(page, true);
  await deliver(page, { type: "saved-audits", activeId: "audit:fixture", audits: [{ id: "audit:fixture", label: "Hero / Desktop / 1440", target: { scope: "selection", nodeIds: ["root:desktop"] }, generatedAt: "2026-10-07T12:00:00.000Z", grade: { letter: "A", score: 97.4 }, lastViewedAt: "2026-10-07T12:00:00.000Z" }] });
  for (const width of [320, 456, 500]) {
    await page.setViewportSize({ width, height: 720 });
    const assertChrome = async () => {
      const geometry = await page.evaluate(() => {
        const header = document.querySelector(".app-header")!.getBoundingClientRect();
        const nav = document.querySelector(".tabs")!.getBoundingClientRect();
        const notice = document.querySelector(".notification-stack")!;
        const history = document.querySelector(".saved-audits");
        return { headerTop: header.top, headerHeight: header.height, navTop: nav.top, navBottom: nav.bottom,
          navigationBeforeNotices: Boolean(document.querySelector(".tabs")!.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING),
          navigationBeforeHistory: !history || Boolean(document.querySelector(".tabs")!.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING),
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      expect(geometry).toEqual({ headerTop: 0, headerHeight: 49, navTop: 49, navBottom: 105, navigationBeforeNotices: true, navigationBeforeHistory: true, overflow: false });
    };
    for (const destination of ["Audit", "Report", "Cleanup"]) {
      await page.getByRole("button", { name: destination, exact: true }).click();
      if (destination === "Audit") {
        await expect(page.getByRole("heading", { name: "Saved Audit Results", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "View report", exact: true })).toBeEnabled();
        const preview = await page.locator(".saved-report-preview").evaluate((node) => {
          const badge = node.querySelector(".saved-report-grade")!;
          const rect = badge.getBoundingClientRect();
          const style = getComputedStyle(badge);
          const score = getComputedStyle(node.querySelector("strong")!);
          return { width: rect.width, height: rect.height, radius: style.borderRadius, font: style.fontSize, weight: style.fontWeight, tracking: style.letterSpacing, previewHeight: node.getBoundingClientRect().height, previewRadius: getComputedStyle(node).borderRadius, scoreFont: score.fontSize, scoreWeight: score.fontWeight };
        });
        expect(preview).toEqual({ width: 40, height: 40, radius: "4px", font: "23.6px", weight: "900", tracking: "-0.236px", previewHeight: 58, previewRadius: "9px", scoreFont: "15.6px", scoreWeight: "500" });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.locator(".saved-audits").screenshot({ path: join(visualArtifacts, `design-passport-88-saved-audit-${width}.png`) });
      }
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await assertChrome();
    }
    for (const destination of ["Context & style guide", "Audit Setup"]) {
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      const menu = await page.locator(".settings-menu").boundingBox();
      expect(menu!.x).toBeGreaterThanOrEqual(0);
      expect(menu!.x + menu!.width).toBeLessThanOrEqual(width);
      await page.locator(".settings-menu").getByRole("button", { name: destination, exact: true }).click();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await assertChrome();
    }
    await page.getByRole("button", { name: "Report", exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByRole("img", { name: "Grade A, 97.40 out of 100", exact: true })).toBeVisible();
    expect(await page.locator(".issue-category[open]").count()).toBe(0);
    expect(await page.locator(".passport-brand").evaluate((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))).toEqual({ width: 16, height: 16 });
    expect(await page.locator(".tab-links button").first().evaluate((node) => ({ font: getComputedStyle(node).fontSize, weight: getComputedStyle(node).fontWeight, opacity: getComputedStyle(node).opacity }))).toEqual({ font: "16px", weight: "600", opacity: "0.4" });
    const grade = await page.locator(".grade").evaluate((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, radius: getComputedStyle(node).borderRadius }));
    expect(grade.width).toBeCloseTo(100, 2);
    expect(grade.height).toBeCloseTo(100, 2);
    expect(grade.radius).toBe("4px");
    const heroType = await page.locator(".report-grade").evaluate((node) => {
      const letter = getComputedStyle(node.querySelector("strong")!);
      const score = getComputedStyle(node.querySelector("span")!);
      return { letterFont: letter.fontSize, letterWeight: letter.fontWeight, letterTracking: letter.letterSpacing, scoreFont: score.fontSize, scoreWeight: score.fontWeight, scoreTracking: score.letterSpacing, text: node.querySelector("span")!.textContent, whitespace: getComputedStyle(node).whiteSpace };
    });
    expect(heroType).toEqual({ letterFont: "39.6px", letterWeight: "900", letterTracking: "-0.396px", scoreFont: "16.6px", scoreWeight: "400", scoreTracking: "-0.166px", text: "97.40", whitespace: "nowrap" });
    expect(await page.locator(".cleanup-callout > strong").evaluate((node) => getComputedStyle(node).fontWeight)).toBe("600");
    await page.locator(".issue-category > summary").first().focus();
    expect((await page.locator(".issue-category > summary").first().boundingBox())!.y).toBeGreaterThanOrEqual(105);
    await page.keyboard.press("Enter");
    await expect(page.locator(".issue-category").first()).toHaveAttribute("open", "");
    await page.locator(".issue-category > summary").first().click();
  }
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

test("matches the Figma dark layout at 320, 456 and 500px with keyboard focus", async ({ page }) => {
  await mount(page);
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const width of [320, 456, 500]) {
    await page.setViewportSize({ width, height: 720 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await page.locator(".hero-summary").innerText()).length).toBeLessThanOrEqual(120);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(await page.locator(".axis-score").first().evaluate((node) => ({ color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor }))).toEqual({ color: "rgb(255, 255, 255)", background: "rgb(51, 150, 23)" });
    // Exact Figma styles retain its 40% inactive labels and white 9px scores.
    // Keep the precise contrast exceptions visible; fail on other regressions.
    const referenceContrastTargets = [
      ["button[aria-label=\"Audit\"]"], ["button[aria-label=\"Cleanup\"]"],
      ...Array.from({ length: 8 }, (_, index) => [`.issue-category:nth-child(${index + 1}) > summary > span > .axis-score.score-good`]),
    ];
    expect(accessibility.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([
      { id: "color-contrast", targets: referenceContrastTargets },
    ]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(visualArtifacts, `design-passport-88-report-${width}.png`), fullPage: true });
    for (const summary of await page.locator(".issue-category > summary").all()) await summary.click();
    await page.locator(".finding-summary").first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const expandedAccessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(await page.locator(".axis-score").first().evaluate((node) => ({ color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor }))).toEqual({ color: "rgb(255, 255, 255)", background: "rgb(51, 150, 23)" });
    expect(expandedAccessibility.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([
      { id: "color-contrast", targets: referenceContrastTargets.map((target) => target.map((selector) => selector.replace(".issue-category", ".issue-category[open=\"\"]"))) },
    ]);
    const assets = await page.locator(".chevron, .node-link img, .issue-category > summary img").evaluateAll((nodes) => nodes.filter((node) => node.getBoundingClientRect().width > 0).map((node) => ({ slot: node.className || "link", width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
    for (const asset of assets) {
      const size = asset.slot === "link" ? 16 : 8;
      expect(asset.width).toBeCloseTo(size, 2);
      expect(asset.height).toBeCloseTo(size, 2);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(visualArtifacts, `design-passport-88-issues-${width}.png`), fullPage: true });
    await page.locator(".finding-summary").first().click();
    for (const summary of await page.locator(".issue-category > summary").all()) await summary.click();
  }
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  expect(await page.locator("html").evaluate((node) => getComputedStyle(node).colorScheme)).toBe("dark");
  await page.getByRole("button", { name: "Cleanup", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeFocused();
  expect(await page.getByRole("button", { name: "Settings", exact: true }).evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Context & style guide" }).click();
  await expect(page.getByText("Style guide and references", { exact: true })).toBeVisible();
});
