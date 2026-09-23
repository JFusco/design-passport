import type { NextRequest } from "next/server";
import { CompanionError } from "../../../../../../src/companion/errors";
import { importLearning } from "../../../../../../src/companion/repository";
import { failure, success } from "@/lib/server/http";
import { requireRequestAccess } from "@/lib/server/runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const paths = await requireRequestAccess(request);
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > 6_000_000) throw new CompanionError("invalid-input", "The upload exceeds the 6 MB request limit.", 413);
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    const inputs = await Promise.all(files.map(async (file) => ({ name: file.name || "learning.json", content: await file.text() })));
    const result = await importLearning(paths, inputs);
    return success(result, result.rebuildRequired ? "Files saved; rebuild required." : "Learning import complete.");
  } catch (error) {
    return failure(error);
  }
}
