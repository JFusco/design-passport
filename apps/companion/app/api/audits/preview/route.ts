import type { NextRequest } from "next/server";
import { previewAuditProjects } from "../../../../../../src/companion/repository";
import { multipartInputs } from "../../../../../../src/companion/imports";
import { requireRequestAccess } from "@/lib/server/runtime";
import { failure, success } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const paths = await requireRequestAccess(request);
    const { inputs } = await multipartInputs(request, "audit");
    return success(await previewAuditProjects(paths, inputs));
  } catch (error) { return failure(error); }
}
