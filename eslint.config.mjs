import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/node_modules/**", "**/.next/**", "dist/**", "coverage/**", "playwright-report/**", "test-results/**", "apps/companion/next-env.d.ts"]),
  { files: ["apps/companion/**/*.{ts,tsx}", "src/companion/**/*.ts", "playwright.config.ts", "tests/companion-*.test.ts", "tests/e2e/**/*.ts"], extends: [js.configs.recommended, ...tseslint.configs.recommended] },
  {
    files: ["apps/companion/**/*.{ts,tsx}"],
    extends: [nextVitals],
    settings: { next: { rootDir: "apps/companion" } },
  },
  {
    files: ["apps/companion/**/*.{ts,tsx}", "src/companion/**/*.ts", "playwright.config.ts", "tests/companion-*.test.ts", "tests/e2e/**/*.ts"],
    languageOptions: { globals: globals.node },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "caughtErrors": "none" }],
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-nocheck": true }],
    },
  },
  {
    files: ["apps/companion/**/*Client.tsx", "apps/companion/**/_components/**/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", { "patterns": ["node:*", "@/lib/server/*", "../../../src/companion/*", "../../../../src/companion/*"] }],
    },
  },
]);
