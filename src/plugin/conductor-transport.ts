import { WORKSPACE_LIMITS, utf8Bytes } from "../core/conductor-contracts";

export interface ConductorCredentials { origin: string; token: string; ownerUserId: string; expiresAt: string; companionOnly?: true; }
export interface ConductorEnvironment { id: string; label: string; origin: string; }

/** A bounded request may time out while the same pairing is still pending. */
export class ConductorRequestTimeoutError extends Error {
  constructor() { super("Conductor request timed out; refresh to check saved progress"); this.name = "ConductorRequestTimeoutError"; }
}

export class ConductorAuthorizationError extends Error {}
export class ConductorSubmissionRefusedError extends Error {}
export class CompanionRequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export interface CompanionUpload { kind: "audit" | "learning"; requestId: string; content: string }
export const credentialStorageKey = "conductor-credentials-v1";

export function readConnection(value: unknown, environments: readonly ConductorEnvironment[]): ConductorCredentials | undefined {
  if (!value || typeof value !== "object") return;
  const saved = value as Partial<ConductorCredentials>;
  if (typeof saved.token === "string" && typeof saved.ownerUserId === "string" && typeof saved.expiresAt === "string"
    && Date.parse(saved.expiresAt) > Date.now() && environments.some(env => env.origin === saved.origin)) return saved as ConductorCredentials;
}

/** Fixed origins only. Credentials never enter presentation state or shared data. */
export class ConductorTransport {
  private generation = 0;
  private enabled = false;
  constructor(private readonly environments: readonly ConductorEnvironment[], private readonly fetcher: typeof fetch = fetch) {}
  open(): void { this.enabled = true; }
  stop(): void { this.enabled = false; this.generation++; }
  environment(id: string): ConductorEnvironment {
    const env = this.environments.find((entry) => entry.id === id);
    if (!env) throw new Error("This Conductor environment is not configured");
    return env;
  }
  async request(origin: string, path: string, options: { token?: string; body?: unknown; binary?: boolean; companion?: CompanionUpload } = {}): Promise<unknown> {
    if (!this.enabled) throw new Error("Open the Conductor area before connecting");
    if (!this.environments.some((entry) => entry.origin === origin) || !path.startsWith("/api/figma-plugin/v1/") || path.includes("..") || path.includes("\\") || path.includes("#")) throw new Error("Invalid Conductor destination");
    if (/[\u0000-\u0020]/.test(path) || !/^https?:\/\/[^/]+$/.test(origin)) throw new Error("Invalid Conductor destination");
    const destination = `${origin}${path}`;
    const generation = this.generation;
    // The fixed development origin may compile a route on its first request.
    const requestTimeoutMs = origin === "http://localhost:3109" ? 120_000 : 30_000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const work = (async () => {
      const upload = options.companion;
      if (upload && (!options.token || !path.startsWith("/api/figma-plugin/v1/companion?project=") || options.body !== undefined || options.binary)) throw new Error("Invalid Companion request");
      const body = upload ? upload.content : JSON.stringify(options.body);
      const response = await this.fetcher(destination, {
        method: body === undefined ? "GET" : "POST", credentials: "omit", redirect: "error",
        headers: {
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(upload ? { "X-Passport-Kind": upload.kind, "X-Passport-Request": upload.requestId } : {}),
        },
        ...(body === undefined ? {} : { body }),
      });
      if (!this.enabled || generation !== this.generation) throw new Error("Conductor connection stopped");
      if (response.redirected || (response.url && !response.url.startsWith(`${origin}/`))) throw new Error("Conductor redirect refused");
      if (!response.ok) {
        if (response.status === 401) throw new ConductorAuthorizationError("Your Conductor connection expired or was revoked. Connect again.");
        if (path.split("?")[0] === "/api/figma-plugin/v1/companion") {
          const messages: Record<number, string> = {
            400: "Companion could not read this export. Generate a new export and try again.",
            403: "Check your project assignment and reconnect with Companion contributions approved.",
            404: "Companion or this receipt is unavailable for your connection.",
            409: "This submission ID already belongs to different evidence.",
            413: "This export exceeds the Companion file size limit.",
            422: "Companion could not validate this export. Generate it again with Design Passport.",
            429: "Companion is busy. Wait before checking the receipt.",
          };
          throw new CompanionRequestError(response.status, messages[response.status] ?? "Companion could not confirm the request. Check the receipt before sending again.");
        }
        if (path === "/api/figma-plugin/v1/submissions" && [400,403,404,409].includes(response.status)) throw new ConductorSubmissionRefusedError("Conductor refused this submission. Check the saved receipt or resolve the pending request before starting another send.");
        if (path.endsWith("/resolve")) {
          if (response.status === 403) throw new Error("Pending-send recovery is disabled or not permitted. Ask your Conductor administrator to restore access before resolving this request.");
          if (response.status === 404) throw new Error("The recovery endpoint or your current access is unavailable. Reconnect and ask your project lead to check access and server recovery support.");
        }
        if (response.status === 409) throw new Error("This workspace changed. Refresh before continuing.");
        if (response.status === 429) throw new Error("Conductor is busy. Wait before refreshing.");
        throw new Error("Conductor is unavailable. Your design and offline audits are retained.");
      }
      const cap = options.binary ? WORKSPACE_LIMITS.sourceBytes : WORKSPACE_LIMITS.instructionBytes + 64 * 1024;
      const declared = Number(response.headers?.get("Content-Length"));
      if (Number.isFinite(declared) && declared > cap) throw new Error("Conductor response exceeds limits");
      if (options.binary) {
        const contentType = response.headers?.get("Content-Type")?.split(";")[0];
        if (contentType && !["image/png", "image/jpeg"].includes(contentType)) throw new Error("Unsupported screenshot type");
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!this.enabled || generation !== this.generation) throw new Error("Conductor connection stopped");
        if (!bytes.length || bytes.length > cap) throw new Error("Screenshot exceeds limits");
        const png = [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value);
        const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        if (!png && !jpeg) throw new Error("Unsupported screenshot bytes");
        return bytes;
      }
      const raw = await response.text();
      if (!this.enabled || generation !== this.generation) throw new Error("Conductor connection stopped");
      if (utf8Bytes(raw) > cap) throw new Error("Conductor response exceeds limits");
      return JSON.parse(raw) as unknown;
      })();
      return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new ConductorRequestTimeoutError()), requestTimeoutMs); })]);
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }
}
