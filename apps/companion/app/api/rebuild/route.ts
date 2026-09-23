import type { NextRequest } from "next/server";
import { rebuildKnowledge } from "../../../../../src/companion/repository";
import { failure, success } from "@/lib/server/http";
import { requireRequestAccess } from "@/lib/server/runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const paths = await requireRequestAccess(request);
    const state = await rebuildKnowledge(paths);
    return success({ candidates: state.candidates.length }, "Knowledge rebuilt.");
  } catch (error) {
    return failure(error);
  }
}
