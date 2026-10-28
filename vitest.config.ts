import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // PGlite workers each own a database; keep the gate bounded on developer Macs.
    maxWorkers: 2,
    minWorkers: 1,
    testTimeout: 15_000,
    coverage: { reporter: ["text", "json", "html"] },
  },
});
