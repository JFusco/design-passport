import type { NextRequest } from "next/server";
import { boundedBody } from "../../../../../src/companion/imports";
import { CompanionError } from "../../../../../src/companion/errors";
import { readKnowledgeState, recordDecision } from "../../../../../src/companion/repository";
import { reviewView } from "../../../../../src/companion/view-models";
import { failure, success } from "@/lib/server/http";
import { requireRequestAccess } from "@/lib/server/runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const paths = await requireRequestAccess(request);
    const body = JSON.parse(Buffer.from(await boundedBody(request, 100_000)).toString("utf8")) as Record<string, unknown>;
    if (
      typeof body.requestId !== "string" || typeof body.candidateId !== "string" || typeof body.candidateDigest !== "string" || typeof body.rationale !== "string"
      || !["approve", "reject", "defer"].includes(String(body.action))
      || !["project", "shared"].includes(String(body.scope))
    ) throw new CompanionError("invalid-input", "The decision is invalid.", 400);
    await recordDecision(paths, {
      requestId: body.requestId,
      candidateId: body.candidateId,
      candidateDigest: body.candidateDigest,
      action: body.action as "approve" | "reject" | "defer",
      scope: body.scope as "project" | "shared",
      rationale: body.rationale,
    });
    const candidate = reviewView(await readKnowledgeState(paths)).find((item) => item.id === body.candidateId);
    if (!candidate) throw new CompanionError("not-found", "The decided draft could not be loaded.", 404);
    return success({ candidate }, "Decision saved.");
  } catch (error) {
    return failure(error);
  }
}
