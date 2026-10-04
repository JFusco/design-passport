import type { NextRequest } from "next/server";
import { listProjects } from "../../../../../src/companion/repository";
import { requireRequestAccess } from "@/lib/server/runtime";
import { failure, success } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try { return success(await listProjects(await requireRequestAccess(request))); }
  catch (error) { return failure(error); }
}
