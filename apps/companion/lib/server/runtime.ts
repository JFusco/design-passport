import "server-only";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { CompanionError } from "../../../../src/companion/errors";
import { resolveWorkspaceRoot, workspacePaths, type WorkspacePaths } from "../../../../src/companion/repository";

export const SESSION_COOKIE = "design_passport_local_session";

export function isConfigured(): boolean {
  return Boolean(
    process.env.DESIGN_PASSPORT_WORKSPACE_ROOT
    && process.env.DESIGN_PASSPORT_CAPABILITY
    && process.env.DESIGN_PASSPORT_EXPECTED_ORIGIN,
  );
}

function secureEqual(left: string | undefined, right: string | undefined): boolean {
  if (!left || !right) return false;
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function validCapability(value: string | undefined): boolean {
  return secureEqual(value, process.env.DESIGN_PASSPORT_CAPABILITY);
}

export async function workspace(): Promise<WorkspacePaths> {
  const configuredRoot = process.env.DESIGN_PASSPORT_WORKSPACE_ROOT;
  if (!configuredRoot || !isConfigured()) throw new CompanionError("not-configured", "Start the companion through the Design Passport CLI.", 503);
  return workspacePaths(await resolveWorkspaceRoot(configuredRoot));
}

export async function requirePageAccess(): Promise<WorkspacePaths> {
  if (!isConfigured()) redirect("/setup");
  const cookieStore = await cookies();
  if (!validCapability(cookieStore.get(SESSION_COOKIE)?.value)) redirect("/access-denied");
  return workspace();
}

export async function requireRequestAccess(request: NextRequest): Promise<WorkspacePaths> {
  if (!isConfigured()) throw new CompanionError("not-configured", "Start the companion through the Design Passport CLI.", 503);
  if (!validCapability(request.cookies.get(SESSION_COOKIE)?.value)) throw new CompanionError("unauthorized", "This local companion session is not authorized.", 403);
  return workspace();
}
