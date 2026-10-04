import type { NextRequest } from "next/server";
import { multipartInputs } from "../../../../../../src/companion/imports";
import { importLearning } from "../../../../../../src/companion/repository";
import { failure, success } from "@/lib/server/http";
import { requireRequestAccess } from "@/lib/server/runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const paths = await requireRequestAccess(request);
    const { inputs } = await multipartInputs(request, "learning");
    const result = await importLearning(paths, inputs);
    return success(result, "Learning import complete.");
  } catch (error) {
    return failure(error);
  }
}
