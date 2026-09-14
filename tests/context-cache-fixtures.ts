import { FigmaAdapter } from "../src/figma/adapter";
import type { ContextCachePort } from "../src/figma/context-cache";
import { profile } from "./fixtures";

// Mutable Plugin API test doubles: changes happen to live inputs independently
// from the cached serialized snapshots.
type MockScene = Record<string, any> & { id: string; type: string; name: string; parent: unknown; children: MockScene[] };

export function contextFixture(pageCount = 1, childrenPerRoot = 1) {
  const counts = { exports: 0, resources: 0, rootResources: 0, inferences: 0, mainComponents: 0, cacheReads: 0, cacheWrites: 0 };
  const cacheValues = new Map<string, unknown>();
  const metadata = new Map<string, string>();
  const resources: Array<{ nodeId: string; name: string; url: string }> = [];
  let inference: SceneNode["inferredVariables"] = {};
  let variables: Variable[] = [];
  let collections: VariableCollection[] = [];
  let mainName = "Card";
  const scene = (id: string, type: string, name: string): MockScene => ({
    id, type, name, parent: null as unknown, children: [] as MockScene[],
    visible: true, width: 200, height: 100, x: 0, y: 0, opacity: 1, rotation: 0,
    fills: [{ type: "SOLID", visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 } }],
    strokes: [] as unknown[], effects: [] as unknown[], exportSettings: [] as unknown[],
    effectStyleId: "", boundVariables: {}, annotations: [] as Array<{ label: string }>,
    devStatus: null as null | { type: string }, detachedInfo: null,
    layoutMode: type === "TEXT" ? undefined : "HORIZONTAL", layoutWrap: "NO_WRAP", primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "FIXED",
    itemSpacing: 8, paddingTop: 8, paddingRight: 8, paddingBottom: 8, paddingLeft: 8, clipsContent: false, cornerRadius: 0, strokeWeight: 0,
    characters: "Heading", fontSize: 18, fontWeight: 400, fontName: { family: "Inter", style: "Regular" }, letterSpacing: { unit: "PIXELS", value: 0 }, lineHeight: { unit: "PIXELS", value: 24 }, paragraphSpacing: 0, paragraphIndent: 0,
    key: `${id}:key`, description: "Documented component", documentationLinks: [] as unknown[], componentPropertyDefinitions: {}, componentProperties: {}, variantProperties: {} as Record<string, string>,
    getSharedPluginData: (namespace: string, key: string) => metadata.get(`${id}:${namespace}:${key}`) ?? "",
    getDevResourcesAsync: async () => { counts.rootResources += 1; return resources.filter((resource) => resource.nodeId === id); },
    getMainComponentAsync: async () => { counts.mainComponents += 1; return { id: "main:1", name: mainName, key: "main:key" }; },
    get inferredVariables() { counts.inferences += 1; return inference; },
    get inferredAutoLayout() { return null; },
  });
  const restNode = (node: ReturnType<typeof scene>): Record<string, unknown> => ({
    id: node.id, type: node.type, name: node.name,
    fills: node.fills, strokes: node.strokes, effects: node.effects, exportSettings: node.exportSettings,
    ...(node.type === "TEXT" ? { characters: node.characters } : {}),
    children: node.children.map(restNode),
  });
  const pages = Array.from({ length: pageCount }, (_, index) => {
    const root = scene(`root:${index}`, "FRAME", "Card");
    root.children = Array.from({ length: childrenPerRoot }, (_, child) => scene(`text:${index}:${child}`, "TEXT", "Heading"));
    root.children.forEach((child) => { child.parent = root; delete (child as Partial<typeof child>).layoutMode; });
    const page = {
      id: `page:${index}`, type: "PAGE", name: `Page ${index}`, children: [root],
      loadAsync: async () => undefined,
      exportAsync: async () => { counts.exports += 1; return JSON.parse(JSON.stringify({ document: { id: `page:${index}`, children: page.children.map(restNode) } })); },
      getDevResourcesAsync: async () => { counts.resources += 1; return resources; },
    };
    root.parent = page;
    return page;
  });
  const figma = {
    fileKey: "test-file-key", root: { id: "document", name: "Cache fixture", children: pages }, mixed: Symbol("mixed"),
    variables: { getLocalVariableCollectionsAsync: async () => collections, getLocalVariablesAsync: async () => variables, getVariableByIdAsync: async (id: string) => variables.find((variable) => variable.id === id) ?? null, getVariableCollectionByIdAsync: async (id: string) => collections.find((collection) => collection.id === id) ?? null },
    teamLibrary: { getVariablesInLibraryCollectionAsync: async () => [] },
  };
  Object.assign(globalThis, { figma });
  const adapter = new FigmaAdapter();
  adapter.getCollectionOptions = async () => [];
  const cache: ContextCachePort = {
    get: async (key) => { counts.cacheReads += 1; return cacheValues.get(key); },
    set: async (key, value) => { counts.cacheWrites += 1; cacheValues.set(key, JSON.parse(JSON.stringify(value))); },
  };
  const readinessProfile = profile({ pageRoles: { screens: { pageIds: pages.map((page) => page.id), externalLibraryKeys: [] }, components: { pageIds: [], externalLibraryKeys: [] }, foundations: { pageIds: [], externalLibraryKeys: [] } } });
  return { adapter, cache, cacheValues, figma, counts, metadata, resources, pages, readinessProfile, setInference: (value: SceneNode["inferredVariables"]) => { inference = value; }, setVariables: (value: Variable[]) => { variables = value; }, setCollections: (value: VariableCollection[]) => { collections = value; }, setMainName: (value: string) => { mainName = value; } };
}
