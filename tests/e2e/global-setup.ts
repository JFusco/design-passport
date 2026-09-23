import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const E2E_WORKSPACE = join(tmpdir(), "design-passport-companion-e2e");

export default async function globalSetup(): Promise<void> {
  await rm(E2E_WORKSPACE, { recursive: true, force: true });
  await mkdir(E2E_WORKSPACE, { recursive: true });
}
