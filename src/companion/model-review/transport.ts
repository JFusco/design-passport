import { lstat, open } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import type { ProviderResponse, SharedProjection } from "./contracts";
import { generationBody, invalid, validateProjection } from "./policy";
export interface Transport {
  count(body: SharedProjection): Promise<number>;
  generate(body: SharedProjection): Promise<ProviderResponse>;
  retrieve(id: string): Promise<ProviderResponse>;
  cancel(id: string): Promise<ProviderResponse>;
  delete(id: string): Promise<void>;
}
export class TransportError extends Error {
  constructor(
    readonly stage: string,
    readonly knownRejection = false,
    readonly evidence: Record<string, unknown> = {},
  ) {
    super("The provider request could not be confirmed.");
  }
}
export async function loadModelKey(root: string): Promise<string> {
  if (
    process.env.DESIGN_PASSPORT_DATABASE_TEST_MODE ||
    process.env.DESIGN_PASSPORT_TEST_MODEL_REVIEW
  )
    invalid("Fixture startup cannot load model credentials.");
  let value = process.env.OPENAI_API_KEY;
  if (value === undefined) {
    const path = join(root, ".design-passport-local", "model-review.env");
    try {
      const info = await lstat(path);
      if (!info.isFile() || info.isSymbolicLink() || info.mode & 0o077)
        invalid("The private model credential file must have mode 600.");
      const parent = await lstat(join(root, ".design-passport-local"));
      if (
        !parent.isDirectory() ||
        parent.isSymbolicLink() ||
        parent.mode & 0o077
      )
        invalid("The private model credential directory must have mode 700.");
      const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const info = await file.stat();
        if (!info.isFile() || info.mode & 0o077 || info.size > 4096)
          invalid("The private model credential file is invalid.");
        value = parseEnv(await file.readFile("utf8")).OPENAI_API_KEY;
      } finally {
        await file.close();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        invalid(
          "The private model credential configuration could not be loaded.",
        );
    }
  }
  if (value === undefined) return "";
  if (!/^sk-[A-Za-z0-9_-]{12,}$/u.test(value))
    invalid("The runner model credential is invalid.");
  return value;
}
export function openAITransport(
  key: string,
  fetcher: typeof fetch = fetch,
): Transport {
  if (!key || process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0")
    invalid("Model execution requires a runner credential and verified TLS.");
  async function request(
    stage: string,
    path: string,
    method: string,
    body?: unknown,
  ): Promise<ProviderResponse & { input_tokens?: number; deleted?: boolean }> {
    let response: Response;
    try {
      response = await fetcher(`https://api.openai.com/v1/responses${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new TransportError(stage);
    }
    let parsed: Record<string, unknown>;
    try {
      const reader = response.body?.getReader();
      if (!reader) throw new Error();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        size += result.value.length;
        if (size > 2_000_000) {
          await reader.cancel();
          throw new Error();
        }
        chunks.push(result.value);
      }
      parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error();
    } catch {
      throw new TransportError(stage, false, { httpStatus: response.status });
    }
    const requestId = response.headers.get("x-request-id");
    if (!response.ok) {
      const error = parsed.error as
        { type?: unknown; code?: unknown } | undefined;
      const types = [
        "invalid_request_error",
        "authentication_error",
        "permission_error",
        "rate_limit_error",
        "insufficient_quota",
      ];
      const recognized =
        [400, 401, 403, 429].includes(response.status) &&
        !parsed.id &&
        !parsed.object &&
        !!error &&
        types.includes(String(error.type));
      const evidence: Record<string, unknown> = {
        httpStatus: response.status,
        type: types.includes(String(error?.type))
          ? error!.type
          : "unrecognized",
      };
      if (
        typeof parsed.id === "string" &&
        /^resp_[A-Za-z0-9_-]{1,200}$/u.test(parsed.id)
      )
        evidence.providerId = parsed.id;
      if (
        typeof requestId === "string" &&
        /^[A-Za-z0-9_-]{1,200}$/u.test(requestId)
      )
        evidence.requestId = requestId;
      if (
        typeof error?.code === "string" &&
        /^[a-z0-9_]{1,100}$/u.test(error.code)
      )
        evidence.code = error.code;
      throw new TransportError(stage, recognized, evidence);
    }
    if (requestId && /^[A-Za-z0-9_-]{1,200}$/u.test(requestId))
      parsed.requestId = requestId;
    return parsed as ProviderResponse & {
      input_tokens?: number;
      deleted?: boolean;
    };
  }
  function idPath(id: string) {
    if (!/^resp_[A-Za-z0-9_-]{1,200}$/u.test(id))
      throw new TransportError("retrieve");
    return `/${id}`;
  }
  return {
    count: async (body) => {
      validateProjection(body);
      const result = await request("count", "/input_tokens", "POST", body);
      if (
        !Number.isSafeInteger(result.input_tokens) ||
        Number(result.input_tokens) < 0
      )
        throw new TransportError("count");
      return result.input_tokens!;
    },
    generate: async (body) => {
      validateProjection(body);
      return request("generate", "", "POST", generationBody(body));
    },
    retrieve: (id) => request("retrieve", idPath(id), "GET"),
    cancel: (id) => request("cancel", `${idPath(id)}/cancel`, "POST"),
    delete: async (id) => {
      const result = await request("delete", idPath(id), "DELETE");
      if (!result.deleted) throw new TransportError("delete");
    },
  };
}
