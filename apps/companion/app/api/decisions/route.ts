import type { NextRequest } from "next/server";
import { CompanionError } from "../../../../../src/companion/errors";
import { readKnowledgeState, recordDecision } from "../../../../../src/companion/repository";
import { reviewView } from "../../../../../src/companion/view-models";
import { failure, success } from "@/lib/server/http";
import { requireRequestAccess } from "@/lib/server/runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const paths = await requireRequestAccess(request);
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > 100_000) throw new CompanionError("invalid-input", "Decision exceeds the 100 KB limit.", 413);
    const body = await request.json() as Record<string, unknown>;
    if (
      typeof body.candidateId !== "string" || typeof body.candidateDigest !== "string" || typeof body.rationale !== "string"
      || !["approve", "reject", "defer"].includes(String(body.action))
      || !["project", "shared"].includes(String(body.scope))
    ) throw new CompanionError("invalid-input", "The decision is invalid.", 400);
    const result = await recordDecision(paths, {
      candidateId: body.candidateId,
      candidateDigest: body.candidateDigest,
      action: body.action as "approve" | "reject" | "defer",
      scope: body.scope as "project" | "shared",
      rationale: body.rationale,
    });
    const candidate = reviewView(await readKnowledgeState(paths)).find((item) => item.id === body.candidateId);
    if (!candidate) throw new CompanionError("not-found", "The decided draft could not be loaded.", 404);
    return success({ candidate, rebuildRequired: result.rebuildRequired }, result.rebuildRequired ? "Decision saved; rebuild required." : "Decision saved.");
  } catch (error) {
    return failure(error);
  }
}
