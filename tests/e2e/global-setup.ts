import { mkdir, rm } from "node:fs/promises";

export const E2E_WORKSPACE = "/private/tmp/design-passport-companion-e2e";

export default async function globalSetup(): Promise<void> {
  await rm(E2E_WORKSPACE, { recursive: true, force: true });
  await mkdir(E2E_WORKSPACE, { recursive: true });
}
