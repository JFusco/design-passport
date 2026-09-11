import { afterEach, describe, expect, it, vi } from "vitest";
import { FigmaAdapter, summarizeSelection, type VariableCollectionOption } from "../src/figma/adapter";
import { healthyGraph, profile } from "./fixtures";

interface MockSelectionNode {
  id: string;
  type: string;
}

function installFigma(selection: MockSelectionNode[], pageId = "page:1") {
  const currentPage = { id: pageId, selection };
  Object.assign(globalThis, { figma: { currentPage } });
  return currentPage;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "figma");
  vi.restoreAllMocks();
});

describe("audit target capture", () => {
  it("summarizes eligible and unsupported selections separately", () => {
    expect(summarizeSelection([
      { type: "FRAME" },
      { type: "COMPONENT" },
      { type: "COMPONENT_SET" },
      { type: "TEXT" },
      { type: "INSTANCE" },
    ])).toEqual({ eligibleCount: 3, unsupportedCount: 2 });
  });

  it("rejects empty, unsupported, and mixed selections before scanning", () => {
    const currentPage = installFigma([]);
    const adapter = new FigmaAdapter();

    expect(() => adapter.captureAuditTarget("selection")).toThrow(/Select at least one frame/i);

    currentPage.selection = [{ id: "text:1", type: "TEXT" }];
    expect(() => adapter.captureAuditTarget("selection")).toThrow(/supports only frames, components, and component sets/i);

    currentPage.selection = [
      { id: "root:desktop", type: "FRAME" },
      { id: "text:1", type: "TEXT" },
    ];
    expect(() => adapter.captureAuditTarget("selection")).toThrow(/Remove 1 unsupported layer/i);
  });

  it("deduplicates selection IDs and resolves the captured selection after live selection changes", () => {
    const currentPage = installFigma([
      { id: "root:desktop", type: "FRAME" },
      { id: "root:desktop", type: "FRAME" },
    ]);
    const adapter = new FigmaAdapter();
    const target = adapter.captureAuditTarget("selection");

    currentPage.selection = [{ id: "root:mobile", type: "FRAME" }];

    expect(target).toEqual({ scope: "selection", nodeIds: ["root:desktop"] });
    expect(adapter.targetRootIds(target, healthyGraph())).toEqual(["root:desktop"]);
  });

  it("resolves a captured page after the current page changes", () => {
    const currentPage = installFigma([], "page:1");
    const adapter = new FigmaAdapter();
    const target = adapter.captureAuditTarget("page");

    currentPage.id = "page:other";

    expect(adapter.targetRootIds(target, healthyGraph())).toEqual(["root:desktop", "root:tablet", "root:mobile"]);
  });

  it("fails clearly when a captured selection target disappears", () => {
    installFigma([{ id: "frame:deleted", type: "FRAME" }]);
    const adapter = new FigmaAdapter();
    const target = adapter.captureAuditTarget("selection");

    expect(() => adapter.targetRootIds(target, healthyGraph())).toThrow(/captured audit selection changed or no longer exists/i);
  });

  it("keeps file scope tied to the graph source-frame inventory", () => {
    installFigma([{ id: "text:1", type: "TEXT" }], "page:other");
    const adapter = new FigmaAdapter();
    const target = adapter.captureAuditTarget("file");

    expect(adapter.targetRootIds(target, healthyGraph())).toEqual(["root:desktop", "root:tablet", "root:mobile"]);
  });
});

describe("scan lifecycle", () => {
  it("preserves cancellation through knowledge building until the next scan begins", async () => {
    Object.assign(globalThis, {
      figma: {
        root: { children: [], name: "Empty file" },
      },
    });
    const adapter = new FigmaAdapter();
    vi.spyOn(adapter, "getCollectionOptions").mockResolvedValue([]);

    adapter.beginScan();
    adapter.cancel();
    const result = await adapter.buildKnowledge(profile(), () => undefined);

    expect(adapter.isScanCancelled()).toBe(true);
    expect(result.graph).toMatchObject({ complete: false, cancelled: true });

    adapter.beginScan();
    expect(adapter.isScanCancelled()).toBe(false);
  });

  it("captures bootstrap selection eligibility after collection discovery completes", async () => {
    const currentPage = installFigma([{ id: "frame:1", type: "FRAME" }]);
    Object.assign((globalThis as unknown as { figma: Record<string, unknown> }).figma, {
      root: {
        id: "root",
        name: "Test file",
        children: [],
        getSharedPluginData: () => "",
        getPluginData: () => "",
      },
      editorType: "figma",
    });
    let finishDiscovery!: (collections: VariableCollectionOption[]) => void;
    const discovery = new Promise<VariableCollectionOption[]>((resolve) => { finishDiscovery = resolve; });
    const adapter = new FigmaAdapter();
    vi.spyOn(adapter, "getCollectionOptions").mockReturnValue(discovery);

    const bootstrapPromise = adapter.getBootstrap();
    currentPage.selection = [{ id: "text:1", type: "TEXT" }];
    finishDiscovery([]);

    await expect(bootstrapPromise).resolves.toMatchObject({
      selectionSummary: { eligibleCount: 0, unsupportedCount: 1 },
    });
  });
});
