import { describe, expect, it, vi } from "vitest";
import { ConductorTransport } from "../src/plugin/conductor-transport";
const origin = "https://conductor.example";
const environments = [{ id: "test", label: "Test", origin }];
describe("Conductor transport boundary", () => {
  it("makes no requests before opening or after returning offline", async () => {
    const fetcher = vi.fn<typeof fetch>(); const transport = new ConductorTransport(environments, fetcher);
    await expect(transport.request(origin, "/api/figma-plugin/v1/context")).rejects.toThrow();
    transport.open(); transport.stop();
    await expect(transport.request(origin, "/api/figma-plugin/v1/context")).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("refuses arbitrary hosts and paths before sending a credential", async () => {
    const fetcher = vi.fn<typeof fetch>(); const transport = new ConductorTransport(environments, fetcher); transport.open();
    for (const [host, path] of [["https://evil.example", "/api/figma-plugin/v1/context"], [origin, "/api/data"], [origin, "/api/figma-plugin/v1/../data"], [origin, "//evil.example/api/figma-plugin/v1/context"]]) {
      await expect(transport.request(host!, path!, { token: "private" })).rejects.toThrow();
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("omits cookies, rejects redirects and keeps credentials in the request header", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ enabled: true }));
    const transport = new ConductorTransport(environments, fetcher); transport.open();
    await transport.request(origin, "/api/figma-plugin/v1/context", { token: "private" });
    expect(fetcher).toHaveBeenCalledWith(`${origin}/api/figma-plugin/v1/context`, expect.objectContaining({ credentials: "omit", redirect: "error", headers: { Authorization: "Bearer private" } }));
    expect(fetcher.mock.calls[0]?.[0]).not.toContain("private");
  });
  it("discards an in-flight response when offline is selected", async () => {
    let finish!: (value: Response) => void;
    const transport = new ConductorTransport(environments, () => new Promise((resolve) => { finish = resolve; })); transport.open();
    const pending = transport.request(origin, "/api/figma-plugin/v1/context");
    transport.stop(); finish(Response.json({ enabled: true }));
    await expect(pending).rejects.toThrow("stopped");
  });
  it("supports the native Figma response without browser headers", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue({ ok: true, status: 200, text: async () => '{"state":"pending"}' } as Response);
    const transport = new ConductorTransport(environments, fetcher); transport.open();
    expect(await transport.request(origin, "/api/figma-plugin/v1/pairings/pair", { body: { pollingSecret: "proof" } })).toEqual({ state: "pending" });
  });
  it("refuses oversized responses and unsupported screenshot types", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("{}", { headers: { "Content-Length": "99999999" } })).mockResolvedValueOnce(new Response("<svg/>", { headers: { "Content-Type": "image/svg+xml" } }));
    const transport = new ConductorTransport(environments, fetcher); transport.open();
    await expect(transport.request(origin, "/api/figma-plugin/v1/context")).rejects.toThrow("limits");
    await expect(transport.request(origin, "/api/figma-plugin/v1/job-items/1/screenshot", { binary: true })).rejects.toThrow("type");
  });
});
