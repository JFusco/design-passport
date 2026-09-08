import { DEFAULT_PROFILE } from "../src/core/constants";
import type { DesignKnowledgeGraph, Finding, NodeSnapshot, ReadinessProfile, VariableCandidate } from "../src/core/contracts";
import { finalizeKnowledgeGraph } from "../src/core/knowledge";

export function profile(overrides: Partial<ReadinessProfile> = {}): ReadinessProfile {
  return {
    ...JSON.parse(JSON.stringify(DEFAULT_PROFILE)) as ReadinessProfile,
    artifactKind: "product",
    pageRoles: {
      foundations: { pageIds: [], externalLibraryKeys: [] },
      components: { pageIds: [], externalLibraryKeys: [] },
      screens: { pageIds: ["page:1"], externalLibraryKeys: [] },
    },
    tokenSourceCollectionKeys: ["collection:key"],
    ...overrides,
  };
}

type NodeOverrides = { [Key in keyof NodeSnapshot]?: NodeSnapshot[Key] | undefined };

export function node(overrides: NodeOverrides = {}): NodeSnapshot {
  const value = {
    id: "node:1",
    rootId: "node:1",
    pageId: "page:1",
    parentId: "page:1",
    path: "Screens / Hero / Desktop / 1440",
    name: "Hero / Desktop / 1440",
    type: "FRAME",
    visible: true,
    width: 1440,
    height: 800,
    x: 0,
    y: 0,
    opacity: 1,
    rotation: 0,
    childIds: [],
    descendantCount: 0,
    layout: {
      mode: "HORIZONTAL",
      primarySizing: "FIXED",
      counterSizing: "FIXED",
      itemSpacing: 16,
      paddingTop: 24,
      paddingRight: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      clipsContent: false,
      inferredAvailable: false,
    },
    fills: [{ type: "SOLID", visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 }, boundVariableId: "var:surface", inferredVariableIds: [] }],
    strokes: [],
    effects: [],
    boundFields: ["fills", "itemSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "width", "height"],
    boundVariableIds: { fills: ["var:surface"], itemSpacing: ["var:space"], paddingTop: ["var:space"], paddingRight: ["var:space"], paddingBottom: ["var:space"], paddingLeft: ["var:space"] },
    inferredBindings: {},
    hasAnnotations: true,
    devResourceCount: 1,
    exportSettings: [],
    structuralSignature: "structure:hero",
    contentSignature: "content:hero",
    ...overrides,
  };
  for (const key of Object.keys(value) as Array<keyof typeof value>) {
    if (value[key] === undefined) delete value[key];
  }
  return value as NodeSnapshot;
}

function tokens(): VariableCandidate[] {
  return [
    ["var:surface", "semantic/surface/default", "COLOR"],
    ["var:text", "semantic/text/default", "COLOR"],
    ["var:font", "semantic/type/body/font-size", "FLOAT"],
    ["var:line", "semantic/type/body/line-height", "FLOAT"],
    ["var:space", "semantic/space/default", "FLOAT"],
    ["var:width", "semantic/breakpoint/desktop", "FLOAT"],
  ].map(([id, name, type]) => ({
    id: id as string,
    key: `${id}:key`,
    name: name as string,
    collectionId: "collection:1",
    collectionKey: "collection:key",
    collectionName: "Semantic",
    type: type as VariableCandidate["type"],
    remote: false,
    evidenceLevel: "full",
    semantic: true,
    aliased: true,
    scopes: ["ALL_SCOPES"],
    modeNames: ["Desktop", "Tablet", "Mobile"],
    webSyntax: `--${String(name).replaceAll("/", "-")}`,
  }));
}

export function healthyGraph(inputProfile = profile()): DesignKnowledgeGraph {
  const root = node({ id: "root:desktop", rootId: "root:desktop", childIds: ["text:1", "button:1"], descendantCount: 2 });
  const text = node({
    id: "text:1",
    rootId: root.id,
    parentId: root.id,
    path: `${root.path} / Heading`,
    name: "Heading",
    type: "TEXT",
    width: 500,
    height: 56,
    childIds: [],
    layout: undefined,
    fills: [{ type: "SOLID", visible: true, opacity: 1, color: { r: 0.05, g: 0.06, b: 0.05 }, boundVariableId: "var:text", inferredVariableIds: [] }],
    boundFields: ["fills", "fontSize", "fontWeight", "lineHeight"],
    boundVariableIds: { fills: ["var:text"], fontSize: ["var:font"], fontWeight: ["var:font"], lineHeight: ["var:line"] },
    text: {
      fontSize: 32,
      fontWeight: 700,
      lineHeightPx: 40,
      charactersLength: 12,
      contentHash: "content:heading",
      textColor: { r: 0.05, g: 0.06, b: 0.05, a: 1 },
      backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
      backgroundResolvable: true,
    },
    structuralSignature: undefined,
    contentSignature: "content:text",
  });
  const button = node({
    id: "button:1",
    rootId: root.id,
    parentId: root.id,
    path: `${root.path} / Button / Primary`,
    name: "Button / Primary",
    width: 48,
    height: 48,
    childIds: [],
    layout: undefined,
    fills: [{ type: "SOLID", visible: true, opacity: 1, color: { r: 0.1, g: 0.3, b: 0.1 }, boundVariableId: "var:surface", inferredVariableIds: [] }],
    boundFields: ["fills", "width", "height"],
    boundVariableIds: { fills: ["var:surface"] },
    structuralSignature: undefined,
    contentSignature: "content:button",
  });
  const tablet = node({
    id: "root:tablet",
    rootId: "root:tablet",
    path: "Screens / Hero / Tablet / 768",
    name: "Hero / Tablet / 768",
    width: 768,
    childIds: [],
    boundFields: root.boundFields,
    contentSignature: "content:hero",
  });
  const mobile = node({
    id: "root:mobile",
    rootId: "root:mobile",
    path: "Screens / Hero / Mobile / 375",
    name: "Hero / Mobile / 375",
    width: 375,
    childIds: [],
    boundFields: root.boundFields,
    contentSignature: "content:hero",
  });
  const nodes = Object.fromEntries([root, text, button, tablet, mobile].map((item) => [item.id, item]));
  return finalizeKnowledgeGraph({
    schemaVersion: 1,
    fileName: "Golden Product",
    fileKey: "file-key",
    builtAt: "2026-09-07T12:00:00.000Z",
    complete: true,
    cancelled: false,
    pageCount: 1,
    loadedPageCount: 1,
    pages: [{ id: "page:1", name: "Screens", role: "screens", loaded: true, nodeCount: 5, rootNodeIds: [root.id, tablet.id, mobile.id] }],
    nodes,
    variables: tokens(),
    componentIds: [],
    instanceIds: [],
    sourceFrameIds: [root.id, tablet.id, mobile.id],
    codeConnect: [],
  }, inputProfile);
}

export function syntheticFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "rule:root:node",
    ruleId: "rule.test",
    axis: "token-foundation",
    severity: 1,
    rootId: "root:1",
    nodeId: "node:1",
    nodePath: "Page / Node",
    status: "pass",
    title: "Test rule",
    message: "Measured evidence",
    evidence: { summary: "Measured evidence", measured: {} },
    sourceRefs: [],
    fixability: "manual",
    confidence: 1,
    ...overrides,
  };
}
