import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hashValue } from "../../src/core/stable";
import type { ReviewLearningEnvelopeV1 } from "../../src/core/contracts";
import type { RunDetail } from "../../src/companion/model-review/contracts";
const origin = `http://127.0.0.1:${process.env.DESIGN_PASSPORT_E2E_PORT ?? 5180}`;
const original = JSON.parse(
  readFileSync(
    join(process.cwd(), "tests/e2e/fixtures/valid-learning.json"),
    "utf8",
  ),
) as ReviewLearningEnvelopeV1;
const { digest: originalDigest, generatedAt, ...material } = original;
void originalDigest;
const base = {
  ...material,
  projectScope: "project:model-e2e",
  observations: [...material.observations].sort((a, b) =>
    a.observationKey.localeCompare(b.observationKey),
  ),
};
const fixture = { ...base, generatedAt, digest: hashValue(base) };
test.beforeEach(async ({ page }) => {
  await page.goto("/bootstrap?cap=e2e-capability");
  await expect(page).toHaveURL("/");
});
test("authorizes disclosure, displays elapsed and costs, preserves drafts and applies explicitly selected recommendations", async ({
  page,
  context,
}) => {
  await page.goto("/learnings/import");
  await page.getByLabel("Learning files").setInputFiles({
    name: "model-learning.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await page.getByRole("button", { name: "Validate and import" }).click();
  await expect(page.getByText(/1 (imported|duplicate)/u).first()).toBeVisible();
  await page.goto("/review");
  await page
    .locator(".queue-item")
    .filter({ hasText: fixture.projectScope })
    .first()
    .click();
  const guidance = page.getByRole("textbox", { name: /^Guidance /u });
  const text = await guidance.inputValue();
  await guidance.fill(`${text} Preserve my unsaved text.`);
  const candidate = new URL(page.url()).searchParams.get("candidate")!;
  await page.getByRole("link", { name: "Model review by project" }).click();
  await page
    .getByRole("link", { name: fixture.projectScope, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Project model review", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Lifetime allowance (USD)").fill("3");
  await page.getByRole("button", { name: "Save allowance" }).click();
  await expect(page.getByText("Lifetime allowance saved.")).toBeVisible();
  // Narrow explicitly to the affected candidate. Preview itself creates no run.
  const items = page.locator(".model-candidates input");
  await expect(items.first()).toBeVisible();
  for (const item of await items.all()) await item.uncheck();
  const affected = page
    .locator(".model-candidates li")
    .filter({ hasText: text });
  await affected.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Preview disclosure" }).click();
  await expect(
    page.getByText("Local preview ready. Nothing has been sent to OpenAI."),
  ).toBeVisible();
  await expect(
    page.getByText("Maximum reservation:", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start authorized review" }).click();
  await expect(page.getByText(/Run status: (queued|running)/u)).toBeVisible();
  await expect(page.getByText(/\d+ seconds/u).first()).toBeVisible();
  await expect
    .poll(async () =>
      Number(
        (await page.getByTestId("run-elapsed").textContent())?.split(" ")[0],
      ),
    )
    .toBeGreaterThan(0);
  await page.reload();
  await expect(
    page.getByText("Run status: completed", { exact: false }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText("A preserved manual draft blocks application.", {
      exact: false,
    }),
  ).toBeVisible();
  const recommendation = page.locator(".model-recommendation");
  await expect(
    recommendation.getByRole("checkbox", {
      name: "Select recommendation to apply",
    }),
  ).toBeDisabled();
  await expect(
    page.getByText("USD 0.012350000000 (estimated)", { exact: false }),
  ).toBeVisible();
  const frozen = await page
    .getByText(/Observed duration|Provider completion time recorded/u)
    .first()
    .textContent();
  await page.waitForTimeout(1100);
  expect(
    await page
      .getByText(/Observed duration|Provider completion time recorded/u)
      .first()
      .textContent(),
  ).toBe(frozen);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
  await recommendation
    .getByRole("link", {
      name: "Save or explicitly discard it in the review queue.",
    })
    .click();
  await expect(guidance).toHaveValue(`${text} Preserve my unsaved text.`);
  // A second tab changes the server revision; the draft remains recoverable on reload.
  const response = await page.request.get("/api/learnings");
  expect(response.ok()).toBe(true);
  const other = await context.newPage();
  await other.goto(`/review?candidate=${encodeURIComponent(candidate)}`);
  await other
    .getByRole("textbox", { name: /^Guidance /u })
    .fill("A new server revision from another tab.");
  await other.getByRole("button", { name: "Save changes" }).click();
  await expect(
    other.getByText("Draft saved. You can now record a decision."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("A saved draft belongs to an older revision.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator(".notice pre")).toContainText(
    "Preserve my unsaved text",
  );
  await page.getByRole("button", { name: "Discard recovered draft" }).click();
  await other.close();
  // Re-review the new revision rather than applying stale output.
  await page.goto(
    `/model-reviews?project=${encodeURIComponent(fixture.projectScope)}`,
  );
  const nextItems = page.locator(".model-candidates input");
  for (const item of await nextItems.all()) await item.uncheck();
  await page
    .locator(".model-candidates li")
    .filter({ hasText: "A new server revision from another tab." })
    .getByRole("checkbox")
    .check();
  await page.getByRole("button", { name: "Preview disclosure" }).click();
  await page.getByRole("button", { name: "Start authorized review" }).click();
  await expect(
    page.getByText("Run status: completed", { exact: false }),
  ).toBeVisible({ timeout: 20_000 });
  await page
    .locator(".model-recommendation")
    .getByRole("checkbox", { name: "Select recommendation to apply" })
    .check();
  await page
    .getByRole("button", { name: "Apply selected recommendations" })
    .click();
  await expect(
    page.getByText(
      "Selected recommendations applied atomically to project guidance.",
    ),
  ).toBeVisible();
  await expect(
    page
      .locator(".model-recommendation")
      .getByRole("checkbox", { name: "Applied", exact: true }),
  ).toBeDisabled();
  expect(await page.content()).not.toContain("e2e-fixture-token");
  expect(await page.content()).not.toContain("OPENAI_API_KEY");
  const scriptUrls = await page
    .locator("script[src]")
    .evaluateAll((els) => els.map((el) => (el as HTMLScriptElement).src));
  for (const url of scriptUrls)
    expect(await (await page.request.get(url)).text()).not.toContain(
      "OPENAI_API_KEY",
    );
});
test("cancels a dispatched fixture and protects preview and mutation boundaries", async ({
  page,
  playwright,
}) => {
  const noCookie = await playwright.request.newContext();
  const denied = await noCookie.get(
    `${origin}/api/model-reviews?project=${encodeURIComponent(fixture.projectScope)}`,
  );
  expect(denied.status()).toBe(403);
  await noCookie.dispose();
  const crossOrigin = await page.request.post("/api/model-reviews", {
    headers: { origin: "https://untrusted.example" },
    data: {
      operation: "settings",
      project: fixture.projectScope,
      allowance: "100",
    },
  });
  expect(crossOrigin.status()).toBe(403);
  const malformed = await page.request.post("/api/model-reviews", {
    headers: { origin },
    data: { operation: "apply", scope: "shared" },
  });
  expect(malformed.status()).toBe(400);
  await page.goto("/learnings/import");
  await page.getByLabel("Learning files").setInputFiles({
    name: "model-learning.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await page.getByRole("button", { name: "Validate and import" }).click();
  await expect(page.getByText(/1 (imported|duplicate)/u).first()).toBeVisible();
  await page.goto(
    `/model-reviews?project=${encodeURIComponent(fixture.projectScope)}`,
  );
  await page.getByLabel("Lifetime allowance (USD)").fill("3");
  await page.getByRole("button", { name: "Save allowance" }).click();
  await expect(page.getByText("Lifetime allowance saved.")).toBeVisible();
  await page.getByRole("button", { name: "Preview disclosure" }).click();
  const started = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/model-reviews") &&
      r.request().method() === "POST" &&
      r.request().postDataJSON()?.operation === "start",
  );
  await page.getByRole("button", { name: "Start authorized review" }).click();
  const start = await started;
  const run = (await start.json()).data as RunDetail;
  expect(start.ok()).toBe(true);
  const cancelled = await page.request.post("/api/model-reviews", {
    headers: { origin },
    data: { operation: "cancel", runId: run.id },
  });
  expect(cancelled.ok()).toBe(true);
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/model-reviews?run=${run.id}`)
          ).json()
        ).data.outcome,
    )
    .toBe("cancelled");
});
