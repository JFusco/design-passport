import { describe, expect, it } from "vitest";
import { createReferencePack, figmaFetchJson } from "../src/companion/figma";

describe("companion Figma boundary", () => {
  it("uses only the fixed Figma API origin and rejects redirects", async () => {
    let requestedUrl = "";
    let redirect = "";
    const transport = async (url: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(url);
      redirect = init?.redirect ?? "";
      return new Response(null, { status: 302 });
    };
    await expect(figmaFetchJson("token", "abcdefgh", "", transport as typeof fetch)).rejects.toThrow(/HTTP 302/u);
    expect(requestedUrl).toBe("https://api.figma.com/v1/files/abcdefgh");
    expect(redirect).toBe("error");
  });

  it("rejects non-Figma source links before making a request", async () => {
    let called = false;
    const transport = async () => {
      called = true;
      return Response.json({});
    };
    await expect(createReferencePack({
      url: "https://example.com/design/abcdefgh/Library",
      sourceId: "style-guide:test",
      projectScope: "project:test",
      role: "style-guide",
    }, "token", transport as typeof fetch)).rejects.toThrow();
    expect(called).toBe(false);
  });

  it("rejects a streamed response after the 25 MB limit", async () => {
    const megabyte = new Uint8Array(1_000_000);
    const transport = async () => new Response(new ReadableStream({
      start(controller) {
        for (let index = 0; index < 26; index += 1) controller.enqueue(megabyte);
        controller.close();
      },
    }), { status: 200 });
    await expect(figmaFetchJson("token", "abcdefgh", "", transport as typeof fetch)).rejects.toThrow(/25 MB/u);
  });

  it("creates a usable pack and surfaces an optional variable warning", async () => {
    let call = 0;
    const transport = async () => {
      call += 1;
      if (call === 2) return new Response("unavailable", { status: 403 });
      return Response.json({
        document: { type: "DOCUMENT", children: [{ type: "FRAME", name: "Foundation", itemSpacing: 8, absoluteBoundingBox: { width: 1440 } }] },
      });
    };
    const result = await createReferencePack({
      url: "https://www.figma.com/design/abcdefgh/Library?node-id=1-2",
      sourceId: "style-guide:test",
      projectScope: "project:test",
      role: "style-guide",
    }, "token", transport as typeof fetch);
    expect(result.pack.source.role).toBe("style-guide");
    expect(result.warnings.some((warning) => /variable/iu.test(warning))).toBe(true);
  });
});
