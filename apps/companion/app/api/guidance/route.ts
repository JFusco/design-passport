import type { NextRequest } from "next/server";
import { listProjectGuidancePacks } from "../../../../../src/companion/repository";
import { CompanionError } from "../../../../../src/companion/errors";
import { failure } from "@/lib/server/http";
import { requireRequestAccess } from "@/lib/server/runtime";

export const runtime = "nodejs";

function safeFilename(scope: string): string {
  const slug = scope.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 80);
  return `design-passport-guidance-${slug || "project"}.json`;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const paths = await requireRequestAccess(request);
    const requestedScope = request.nextUrl.searchParams.get("scope");
    if (!requestedScope) throw new CompanionError("invalid-input", "Choose a project guidance pack to download.", 400);
    const packs = await listProjectGuidancePacks(paths);
    const pack = packs.find((item) => item.source.projectScope === requestedScope);
    if (!pack) throw new CompanionError("not-found", "That project guidance pack is not available.", 404);
    return new Response(`${JSON.stringify(pack, null, 2)}\n`, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${safeFilename(pack.source.projectScope)}"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
