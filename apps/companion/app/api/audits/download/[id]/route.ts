import type { NextRequest } from "next/server";
import { auditDownload } from "../../../../../../../src/companion/repository";
import { requireRequestAccess } from "@/lib/server/runtime";
import { failure } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const id = (await context.params).id;
    const payload = await auditDownload(await requireRequestAccess(request), id);
    return new Response(`${JSON.stringify(payload, null, 2)}\n`, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="audit-source-${id}.json"`, "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
