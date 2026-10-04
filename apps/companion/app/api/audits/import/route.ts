import type { NextRequest } from "next/server";
import { importAudits } from "../../../../../../src/companion/repository";
import { multipartInputs } from "../../../../../../src/companion/imports";
import { CompanionError } from "../../../../../../src/companion/errors";
import { requireRequestAccess } from "@/lib/server/runtime";
import { failure, success } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const paths = await requireRequestAccess(request);
    const { inputs, form } = await multipartInputs(request, "audit");
    const scope = form.get("projectScope");
    if (typeof scope !== "string") throw new CompanionError("invalid-input", "Select or create an explicit project scope.", 400);
    return success(await importAudits(paths, inputs, scope));
  } catch (error) { return failure(error); }
}
