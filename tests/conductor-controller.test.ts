import { afterEach, describe, expect, it, vi } from "vitest";
import { createConductorController } from "../src/plugin/conductor-controller";
import { CONDUCTOR_ENVIRONMENTS } from "../src/plugin/conductor-environments";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
function controller() {
  return createConductorController({ post: vi.fn(), enterCanvas: () => () => {}, apply: vi.fn() });
}
describe("native Conductor controller", () => {
  it("pairs without a browser URL global in the Figma sandbox", async () => {
    vi.useFakeTimers();
    const environment = CONDUCTOR_ENVIRONMENTS[0]!;
    const verificationUrl = `${environment.origin}/design-passport/pair?code=ABCDEF12`;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "pairing", userCode: "ABCDEF12", pollingSecret: "a".repeat(64), verificationUrl, expiresAt: new Date(Date.now() + 600000).toISOString() }));
    const openExternal = vi.fn();
    vi.stubGlobal("fetch", fetcher); vi.stubGlobal("URL", undefined);
    vi.stubGlobal("figma", { openExternal, clientStorage: { getAsync: async () => undefined } });
    const client = controller(); await client.handle({ type: "conductor-connect", environment: environment.id });
    expect(fetcher).toHaveBeenCalledTimes(1); expect(openExternal).toHaveBeenCalledWith(verificationUrl);
    client.stop();
  });
  it("does not resume network access when credential loading finishes after entering offline audit", async () => {
    let finish!: (value: unknown) => void;
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("figma", { fileKey: "file", clientStorage: { getAsync: () => new Promise((resolve) => { finish = resolve; }) } });
    const client = controller(); const opening = client.handle({ type: "conductor-open" });
    await client.handle({ type: "conductor-offline" });
    finish({ origin: CONDUCTOR_ENVIRONMENTS[0]!.origin, ownerUserId: "owner", token: "secret", expiresAt: new Date(Date.now() + 10000).toISOString() });
    await opening; expect(fetcher).not.toHaveBeenCalled();
  });
});
