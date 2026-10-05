import type { NextRequest } from "next/server";
import { boundedBody } from "../../../../../../src/companion/imports";
import { CompanionError } from "../../../../../../src/companion/errors";
import { readKnowledgeState, reviseCandidate } from "../../../../../../src/companion/repository";
import { reviewView } from "../../../../../../src/companion/view-models";
import { failure, success } from "@/lib/server/http";
import { requireRequestAccess } from "@/lib/server/runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const paths = await requireRequestAccess(request);
    const body = JSON.parse(Buffer.from(await boundedBody(request, 100_000)).toString("utf8")) as Record<string, unknown>;
    if (
      typeof body.candidateId !== "string" || typeof body.candidateDigest !== "string"
      || typeof body.wording !== "string" || !Array.isArray(body.exceptions)
      || !body.exceptions.every((value) => typeof value === "string")
      || (body.proposedScope !== "project" && body.proposedScope !== "shared")
    ) throw new CompanionError("invalid-input", "The draft changes are invalid.", 400);
    const result = await reviseCandidate(paths, {
      candidateId: body.candidateId,
      candidateDigest: body.candidateDigest,
      wording: body.wording,
      proposedScope: body.proposedScope,
      exceptions: body.exceptions as string[],
    });
    const candidate = reviewView(await readKnowledgeState(paths)).find((item) => item.id === result.candidate.candidateId);
    if (!candidate) throw new CompanionError("not-found", "The saved draft could not be loaded.", 404);
    return success({ candidate }, "Draft saved.");
  } catch (error) {
    return failure(error);
  }
}
