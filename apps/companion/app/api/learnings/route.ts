import type { NextRequest } from "next/server";
import { historyResponse } from "@/lib/server/history";
export const runtime = "nodejs";
export function GET(request: NextRequest) { return historyResponse(request, "learning"); }
