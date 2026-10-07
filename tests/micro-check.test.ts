import { afterEach, describe, expect, it, vi } from "vitest";
import { buildReadinessReport } from "../src/core/report";
import { buildChangePlans } from "../src/core/planner";
import { microClosure } from "../src/figma/micro-check";
import { KnowledgeSessionState } from "../src/plugin/session-state";
import { contextFixture } from "./context-cache-fixtures";

afterEach(() => vi.unstubAllGlobals());
const comparable = (report: ReturnType<typeof buildReadinessReport>) => ({ findings: report.findings, grade: report.grade, axes: report.axes, frames: report.frames, ready: report.ready, blockers: report.blockers, issueGroups: report.issueGroups, plans: buildChangePlans(report.findings) });

describe("bounded live evidence", () => {
  it("combines naming and gap edits on separate included pages, with full-capture parity and no exports", async () => {
    const f = contextFixture(2);
    const initial = await f.adapter.buildKnowledge(f.readinessProfile, () => {}, { contextCache: f.cache });
    const exports = f.counts.exports;
    f.pages[0]!.children[0]!.name = "Card / Desktop";
    f.pages[1]!.children[0]!.itemSpacing = 16;
    const staged = await f.adapter.stageMicroCheck(initial.graph, f.readinessProfile, { "root:0": ["name"], "root:1": ["itemSpacing"] }, new Map([["root:0", ["name"]]]));
    expect(staged.nodeIds).toContain("text:1:0");
    expect(staged.graph.nodes["root:0"]!.name).toBe("Card / Desktop");
    expect(staged.graph.nodes["text:0:0"]!.path).toContain("Card / Desktop");
    expect(staged.graph.nodes["root:1"]!.layout!.itemSpacing).toBe(16);
    expect(f.counts.exports).toBe(exports);
    expect(await staged.verify()).toBe(true);
    const micro = buildReadinessReport({ graph: staged.graph, profile: f.readinessProfile, scope: "file", targetRootIds: ["root:0", "root:1"] });
    staged.commit();
    const fresh = await f.adapter.buildKnowledge(f.readinessProfile, () => {}, { forceFullCapture: true });
    const full = buildReadinessReport({ graph: fresh.graph, profile: f.readinessProfile, scope: "file", targetRootIds: ["root:0", "root:1"] });
    expect(comparable(micro)).toEqual(comparable(full));
  });

  it("updates untouched descendant paths when both an ancestor and its parent are renamed", async () => {
    const f = contextFixture(1, 2);
    const root = f.pages[0]!.children[0]!, container = root.children[0]!, child = root.children[1]!;
    container.type = "FRAME"; container.layoutMode = "NONE";
    root.children = [container]; container.children = [child]; child.parent = container;
    const { graph } = await f.adapter.buildKnowledge(f.readinessProfile, () => {});
    root.name = "Card / Desktop"; container.name = "Content";
    const staged = await f.adapter.stageMicroCheck(graph, f.readinessProfile,
      { [root.id]: ["name"], [container.id]: ["name"] }, new Map([[root.id, ["name"]]]));
    expect(staged.nodeIds).not.toContain(child.id);
    expect(staged.graph.nodes[child.id]!.path).toBe("Page 0 / Card / Desktop / Content / Heading");
    const fresh = await f.adapter.buildKnowledge(f.readinessProfile, () => {}, { forceFullCapture: true });
    expect(staged.graph.nodes[child.id]!.path).toBe(fresh.graph.nodes[child.id]!.path);
  });

  it("rebuilds responsive families after a member rename with full-capture parity", async () => {
    const f = contextFixture(2);
    const desktop = f.pages[0]!.children[0]!, mobile = f.pages[1]!.children[0]!;
    desktop.name = "Card / Desktop / 1440"; mobile.name = "Card / Mobile / 375";
    f.pages[0]!.children.push(mobile); mobile.parent = f.pages[0]!; f.pages.splice(1, 1);
    f.readinessProfile.pageRoles.screens.pageIds = ["page:0"];
    const { graph } = await f.adapter.buildKnowledge(f.readinessProfile, () => {});
    mobile.name = "Card / Tablet / 768";
    const staged = await f.adapter.stageMicroCheck(graph, f.readinessProfile,
      { [mobile.id]: ["name"] }, new Map([[mobile.id, ["name"]]]));
    expect(staged.graph.responsiveFamilies[0]!.breakpointNames).toContain("Tablet");
    expect(staged.graph.responsiveFamilies[0]!.breakpointNames).not.toContain("Mobile");
    const fresh = await f.adapter.buildKnowledge(f.readinessProfile, () => {}, { forceFullCapture: true });
    const report = (g: typeof graph) => buildReadinessReport({ graph: g, profile: f.readinessProfile, scope: "page", targetRootIds: [desktop.id, mobile.id] });
    expect(comparable(report(staged.graph))).toEqual(comparable(report(fresh.graph)));
  });

  it("accepts an existing token binding and applied text style, then rejects resource-definition changes", async () => {
    const f = contextFixture();
    const variable = { id: "var:1", key: "var:key", name: "semantic/space", variableCollectionId: "collection:1", resolvedType: "FLOAT", remote: false, valuesByMode: { mode: 8 }, scopes: ["GAP"], codeSyntax: {} };
    const collection = { id: "collection:1", key: "collection:key", name: "Semantic", remote: false, modes: [{ modeId: "mode", name: "Default" }], defaultModeId: "mode", variableIds: [variable.id] };
    f.setVariables([variable as unknown as Variable]); f.setCollections([collection as unknown as VariableCollection]);
    const style = { id: "style:1", type: "TEXT", key: "style:key", name: "Body", remote: false, fontSize: 18, fontName: { family: "Inter", style: "Regular" }, letterSpacing: { unit: "PIXELS", value: 0 }, lineHeight: { unit: "PIXELS", value: 24 }, paragraphSpacing: 0, paragraphIndent: 0 };
    Object.assign(f.figma, { getStyleByIdAsync: async () => style });
    const root = f.pages[0]!.children[0]!, text = root.children[0]!;
    const { graph } = await f.adapter.buildKnowledge(f.readinessProfile, () => {}, { contextCache: f.cache });
    root.boundVariables = { itemSpacing: { type: "VARIABLE_ALIAS", id: variable.id } };
    text.textStyleId = style.id;
    const staged = await f.adapter.stageMicroCheck(graph, f.readinessProfile, { [root.id]: ["boundVariables"], [text.id]: ["textStyleId"] }, new Map([[root.id, ["tokens"]]]));
    expect(staged.graph.nodes[root.id]!.boundVariableIds.itemSpacing).toEqual([variable.id]);
    expect(staged.graph.nodes[text.id]!.text!.style).toMatchObject({ status: "resolved", controlledFields: expect.arrayContaining(["fontSize", "fontWeight"]) });
    expect(await staged.verify()).toBe(true);
    staged.commit();
    style.fontSize = 20;
    expect(await f.adapter.matchesVariableEnvironment()).toBe(false);
    expect(await staged.verify()).toBe(false);
  });

  it("refreshes shared component consumers and induced rendering without exporting a page", async () => {
    const f = contextFixture(2);
    const source = f.pages[0]!.children[0]!, instance = f.pages[1]!.children[0]!;
    source.id = "main:1"; source.type = "COMPONENT"; instance.type = "INSTANCE";
    instance.getMainComponentAsync = async () => source;
    const { graph } = await f.adapter.buildKnowledge(f.readinessProfile, () => {});
    const exports = f.counts.exports;
    source.itemSpacing = 16; instance.itemSpacing = 16; instance.children[0]!.width = 300;
    const staged = await f.adapter.stageMicroCheck(graph, f.readinessProfile,
      { [source.id]: ["itemSpacing"] }, new Map([[source.id, ["tokens"]]]));
    expect(staged.nodeIds).toContain(instance.id);
    expect(staged.graph.nodes[instance.id]!.layout!.itemSpacing).toBe(16);
    expect(staged.graph.nodes[instance.children[0]!.id]!.width).toBe(300);
    expect(await staged.verify()).toBe(true); expect(f.counts.exports).toBe(exports);
    const fresh = await f.adapter.buildKnowledge(f.readinessProfile, () => {}, { forceFullCapture: true });
    const report = (g: typeof graph) => buildReadinessReport({ graph: g, profile: f.readinessProfile, scope: "file", targetRootIds: [source.id, instance.id] });
    expect(comparable(report(staged.graph))).toEqual(comparable(report(fresh.graph)));
  });

  it("rejects a newly unavailable binding and an instance whose source page was excluded", async () => {
    const f = contextFixture(2);
    const source = f.pages[0]!.children[0]!, wrapper = f.pages[1]!.children[0]!, instance = wrapper.children[0]!;
    source.id = "main:1"; source.type = "COMPONENT"; instance.type = "INSTANCE";
    instance.getMainComponentAsync = async () => source;
    f.readinessProfile.excludedPageIds = ["page:0"];
    const { graph } = await f.adapter.buildKnowledge(f.readinessProfile, () => {});
    await expect(f.adapter.assertTargetSources({ scope: "page", pageId: "page:1" }, graph)).rejects.toThrow("excluded page");
    wrapper.boundVariables = { itemSpacing: { type: "VARIABLE_ALIAS", id: "var:uncaptured" } };
    await expect(f.adapter.stageMicroCheck(graph, f.readinessProfile,
      { [wrapper.id]: ["boundVariables"] }, new Map([[wrapper.id, ["tokens"]]]))).rejects.toThrow("Regenerate audit to verify");
  });

  it("re-resolves a component wrapper's roots when an annotation changes source targeting", async () => {
    const f = contextFixture();
    const wrapper = f.pages[0]!.children[0]!, component = wrapper.children[0]!;
    component.type = "COMPONENT"; component.layoutMode = "HORIZONTAL";
    f.readinessProfile.pageRoles.screens.pageIds = [];
    f.readinessProfile.pageRoles.components.pageIds = ["page:0"];
    const { graph } = await f.adapter.buildKnowledge(f.readinessProfile, () => {});
    const target = { scope: "selection" as const, nodeIds: [wrapper.id] };
    expect(f.adapter.targetRootIds(target, graph)).toEqual([component.id]);
    wrapper.annotations = [{ label: "AI source frame" }];
    const staged = await f.adapter.stageMicroCheck(graph, f.readinessProfile,
      { [wrapper.id]: ["annotations"] }, new Map([[wrapper.id, ["annotations"]]]));
    expect(f.adapter.targetRootIds(target, staged.graph)).toEqual([wrapper.id]);
    expect(f.adapter.targetRootIds(target, graph)).toEqual([component.id]);
  });

  it("rejects unsupported dirt, missing captured evidence and an edit after staging", async () => {
    const f = contextFixture(2);
    const { graph } = await f.adapter.buildKnowledge(f.readinessProfile, () => {}, { contextCache: f.cache });
    const selected = new Map([["root:0", ["name"] as const]]);
    await expect(f.adapter.stageMicroCheck(graph, f.readinessProfile, { "root:1": ["layoutMode"] }, selected)).rejects.toThrow("Regenerate");
    await expect(f.adapter.stageMicroCheck(graph, f.readinessProfile, { missing: ["name"] }, selected)).rejects.toThrow("not captured");
    f.pages[0]!.children[0]!.name = "Changed";
    const staged = await f.adapter.stageMicroCheck(graph, f.readinessProfile, { "root:0": ["name"] }, selected);
    f.pages[0]!.children[0]!.name = "Changed again";
    expect(await staged.verify()).toBe(false);
  });

  it("captures confirmed included pages only and rejects excluded targets", async () => {
    const f = contextFixture(2);
    f.readinessProfile.excludedPageIds = ["page:1"];
    const { graph } = await f.adapter.buildKnowledge(f.readinessProfile, () => {}, { contextCache: f.cache });
    expect(graph.complete).toBe(true);
    expect(graph.loadedPageCount).toBe(1);
    expect(graph.pages).toHaveLength(2);
    expect(graph.nodes["root:1"]).toBeUndefined();
    expect(f.counts.exports).toBe(1);
    expect(() => f.adapter.targetRootIds({ scope: "page", pageId: "page:1" }, graph)).toThrow("excluded");
    expect(() => microClosure(graph, { "root:1": ["name"] }, new Map())).toThrow("not captured");
    const report = buildReadinessReport({ graph, profile: f.readinessProfile, scope: "page", targetRootIds: ["root:0"] });
    expect(report.target.knowledgeComplete).toBe(true);
    expect(report.target.excludedPageIds).toEqual(["page:1"]);
    expect(report.findings.find((finding) => finding.ruleId === "pipeline.file-knowledge")?.status).toBe("pass");
  });
});

describe("micro-check journal and session clock", () => {
  it("retains unverified properties and rejects any later revision without renewing context age", () => {
    const state = new KnowledgeSessionState();
    state.completeBuild(state.beginBuild(), true);
    state.validateWholeContext(0, 1000);
    state.recordChanges([{ id: "a", origin: "LOCAL", properties: ["name", "boundVariables"] }, { id: "b", origin: "REMOTE", properties: ["itemSpacing"] }]);
    const revision = state.documentRevision;
    state.commitMicroCheck(revision, new Map([["a", new Set(["name"])], ["b", new Set(["itemSpacing"])]]));
    expect(state.dirty).toBe(true);
    expect(state.changes.nodeIds).toEqual(["a"]);
    expect(state.wholeContextValidatedAt).toBe(1000);
    expect(state.canCommitMicroCheck(revision, new Map([["a", new Set(["name", "boundVariables"])]]))).toBe(true);
    state.recordChanges([{ id: "b", origin: "REMOTE", properties: ["name"] }]);
    expect(state.canCommitMicroCheck(revision, new Map())).toBe(false);
    expect(() => state.commitMicroCheck(revision, new Map())).toThrow("changed");
    expect(state.validationFresh(901000)).toBe(false);
  });
});
