import { defineConfig, devices } from "@playwright/test";
import { E2E_WORKSPACE } from "./tests/e2e/global-setup";

const port = 5180;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "line",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter @design-passport/companion start",
    url: `${baseURL}/setup`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DESIGN_PASSPORT_WORKSPACE_ROOT: E2E_WORKSPACE,
      DESIGN_PASSPORT_CAPABILITY: "e2e-capability",
      DESIGN_PASSPORT_EXPECTED_ORIGIN: baseURL,
      DESIGN_PASSPORT_TEST_FIXTURES: "figma",
      FIGMA_TOKEN: "e2e-fixture-token",
    },
  },
});
