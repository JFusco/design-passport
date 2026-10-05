import { defineConfig, devices } from "@playwright/test";
const workspace = process.env.DESIGN_PASSPORT_E2E_WORKSPACE;
if (!workspace || process.env.DESIGN_PASSPORT_DATABASE_TEST_MODE !== "pglite") throw new Error("Run pnpm test:companion:e2e to own the disposable database and workspace.");

const port = Number(process.env.DESIGN_PASSPORT_E2E_PORT ?? 5180);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "line",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm --filter @design-passport/companion exec next start --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/setup`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DESIGN_PASSPORT_WORKSPACE_ROOT: workspace,
      DESIGN_PASSPORT_CAPABILITY: "e2e-capability",
      DESIGN_PASSPORT_EXPECTED_ORIGIN: baseURL,
      DESIGN_PASSPORT_TEST_FIXTURES: "figma",
      FIGMA_TOKEN: "e2e-fixture-token",
    },
  },
});
