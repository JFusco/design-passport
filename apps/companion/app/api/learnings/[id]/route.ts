import type { NextRequest } from "next/server";
import { learningDetail } from "../../../../../../src/companion/repository";
import { requireRequestAccess } from "@/lib/server/runtime";
import { failure, success } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { return success(await learningDetail(await requireRequestAccess(request), (await context.params).id)); }
  catch (error) { return failure(error); }
}
