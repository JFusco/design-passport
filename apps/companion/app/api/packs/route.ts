import type { NextRequest } from "next/server";
import { createReferencePack } from "../../../../../src/companion/figma";
import { CompanionError } from "../../../../../src/companion/errors";
import { failure, success } from "@/lib/server/http";
import { figmaTransport } from "@/lib/server/figma-transport";
import { requireRequestAccess } from "@/lib/server/runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireRequestAccess(request);
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > 100_000) throw new CompanionError("invalid-input", "Reference pack request is too large.", 413);
    const body = await request.json() as Record<string, unknown>;
    const role = body.role === "reference" ? "reference" : body.role === "style-guide" ? "style-guide" : undefined;
    if (!role || typeof body.url !== "string" || typeof body.sourceId !== "string" || typeof body.projectScope !== "string") {
      throw new CompanionError("invalid-input", "Complete all reference pack fields.", 400);
    }
    const { pack, warnings } = await createReferencePack({
      url: body.url,
      sourceId: body.sourceId,
      projectScope: body.projectScope,
      role,
    }, process.env.FIGMA_TOKEN ?? "", figmaTransport());
    const safeName = body.sourceId.replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "") || "design-passport-reference";
    return success({
      fileName: `${safeName}.design-passport-reference.json`,
      content: `${JSON.stringify(pack, null, 2)}\n`,
      warnings,
    }, "Reference pack created.");
  } catch (error) {
    return failure(error);
  }
}
