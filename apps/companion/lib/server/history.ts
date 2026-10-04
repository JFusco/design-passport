import "server-only";
import { listHistory, type HistoryFilters } from "../../../../src/companion/repository";
import type { NextRequest } from "next/server";
import { requireRequestAccess } from "./runtime";
import { failure, success } from "./http";
export function historyFilters(params: URLSearchParams): HistoryFilters {
  return Object.fromEntries(["project", "from", "to", "rule", "status", "grade", "ready", "q", "cursor"].flatMap((key) => params.has(key) ? [[key, params.get(key)!]] : []));
}
export async function historyResponse(request: NextRequest, kind: "audit" | "learning") {
  try { return success(await listHistory(await requireRequestAccess(request), kind, historyFilters(request.nextUrl.searchParams))); }
  catch (error) { return failure(error); }
}
