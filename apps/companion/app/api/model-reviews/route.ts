import type { NextRequest } from "next/server";
import Ajv from "ajv";
import { boundedBody } from "../../../../../src/companion/imports";
import { invalid } from "../../../../../src/companion/model-review/policy";
import {
  apply,
  attachGuide,
  cancel,
  guideHistory,
  preview,
  projectHistory,
  projectSummary,
  reconcile,
  runDetail,
  settings,
  start,
} from "../../../../../src/companion/model-review/repository";
import type { ApplyInput } from "../../../../../src/companion/model-review/contracts";
import type {
  ReconcileInput,
  StartInput,
} from "../../../../../src/companion/model-review/repository";
import { failure, success } from "@/lib/server/http";
import { requireRequestAccess } from "@/lib/server/runtime";
import { initializeModelReview } from "@/lib/server/model-review";
export const runtime = "nodejs";
const str = { type: "string", minLength: 1 };
const selection = {
  type: "array",
  minItems: 1,
  maxItems: 8,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["candidateId", "digest"],
    properties: { candidateId: str, digest: str },
  },
};
const edit = {
  anyOf: [
    { type: "null" },
    {
      type: "object",
      additionalProperties: false,
      required: ["wording", "exceptions"],
      properties: {
        wording: str,
        exceptions: { type: "array", items: { type: "string" } },
      },
    },
  ],
};
const fields: Record<string, Record<string, unknown>> = {
  preview: { project: str, selection },
  start: {
    requestId: str,
    project: str,
    selection,
    previewDigest: str,
    retryOf: str,
  },
  cancel: { runId: str },
  apply: {
    requestId: str,
    runId: str,
    expectedContext: str,
    selections: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["recommendationId", "rationale", "edit"],
        properties: { recommendationId: str, rationale: str, edit },
      },
    },
  },
  reconcile: {
    requestId: str,
    runId: str,
    expectedVersion: { type: "integer", minimum: 1 },
    action: { enum: ["retrieve", "billed", "discrepancy_acknowledgement"] },
    amount: str,
    evidenceNote: str,
  },
  settings: {
    project: str,
    allowance: str,
    enabled: { type: "boolean" },
    activeGuide: { type: ["string", "null"] },
  },
  guide: { project: str, raw: str },
};
const required: Record<string, string[]> = {
  preview: ["project", "selection"],
  start: ["requestId", "project", "selection", "previewDigest"],
  cancel: ["runId"],
  apply: ["requestId", "runId", "expectedContext", "selections"],
  reconcile: ["requestId", "runId", "expectedVersion", "action"],
  settings: ["project"],
  guide: ["project", "raw"],
};
const ajv = new Ajv({ strict: false });
const validators = Object.fromEntries(
  Object.entries(fields).map(([operation, properties]) => [
    operation,
    ajv.compile({
      type: "object",
      additionalProperties: false,
      required: ["operation", ...required[operation]!],
      properties: { operation: { const: operation }, ...properties },
    }),
  ]),
);
export async function GET(request: NextRequest) {
  try {
    const paths = await requireRequestAccess(request);
    const configured = await initializeModelReview(paths);
    const project = request.nextUrl.searchParams.get("project"),
      id = request.nextUrl.searchParams.get("run");
    if (id) return success(await runDetail(paths, id));
    if (!project) invalid("Select a project.");
    return success({
      summary: await projectSummary(paths, project),
      history: await projectHistory(paths, project),
      guides: await guideHistory(paths, project),
      configured,
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const paths = await requireRequestAccess(request);
    const configured = await initializeModelReview(paths);
    const body = JSON.parse(
      Buffer.from(await boundedBody(request, 250_000)).toString("utf8"),
    ) as Record<string, unknown>;
    const operation = String(body.operation);
    if (!validators[operation]?.(body))
      invalid("The model-review operation is invalid.");
    const { operation: validatedOperation, ...input } = body;
    void validatedOperation;
    switch (operation) {
      case "preview":
        return success(
          await preview(
            paths,
            input.project as string,
            input.selection as StartInput["selection"],
          ),
        );
      case "start":
        if (!configured)
          invalid(
            "Configure the CLI runner credential and restart before Start.",
          );
        return success(await start(paths, input as unknown as StartInput));
      case "cancel":
        return success(await cancel(paths, input.runId as string));
      case "apply":
        return success(await apply(paths, input as unknown as ApplyInput));
      case "reconcile":
        if (!configured && input.action !== "discrepancy_acknowledgement")
          invalid(
            "Start the configured runner to retrieve accounting evidence.",
          );
        return success(
          await reconcile(paths, input as unknown as ReconcileInput),
        );
      case "settings": {
        const { project, ...values } = input;
        return success(await settings(paths, project as string, values));
      }
      case "guide":
        return success({
          id: await attachGuide(
            paths,
            input.project as string,
            input.raw as string,
          ),
        });
      default:
        invalid();
    }
  } catch (error) {
    return failure(error);
  }
}
