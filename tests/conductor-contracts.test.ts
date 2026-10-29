import { describe, expect, it } from "vitest";
import { parseCanvasInstructions, parseDesignSubmission, parsePreparation, WORKSPACE_CONTRACT_VERSION } from "../src/core/conductor-contracts";
import { instructionDigest, sha256 } from "../src/core/conductor-digest";

const node = { id: "heading", kind: "text", name: "Heading", x: 0, y: 0, width: 200, height: 30, text: "Welcome" };
const instructions = () => ({ contractVersion: WORKSPACE_CONTRACT_VERSION, width: 390, height: 844, nodes: [{ ...node }], warnings: [] });
const uuid = "a0d21b5d-56bd-48f0-9d68-d3585f6044be";
describe("Conductor native instruction boundary", () => {
  it("clamps finite geometry and preserves semantic text", () => {
    const input = instructions(); input.nodes[0]!.x = -20; input.nodes[0]!.width = 800;
    expect(parseCanvasInstructions(input).nodes[0]).toMatchObject({ x: 0, width: 390, text: "Welcome" });
  });
  it.each([
    { ...instructions(), contractVersion: "2.0.0" },
    { ...instructions(), script: "alert(1)" },
    { ...instructions(), width: 5000 },
    { ...instructions(), nodes: [{ ...node, kind: "script" }] },
    { ...instructions(), nodes: [{ ...node, x: Infinity }] },
    { ...instructions(), nodes: [{ ...node, fontSize: 1000 }] },
    { ...instructions(), nodes: [{ ...node, fontSize: "40" }] },
    { ...instructions(), nodes: [{ ...node, padding: 8 }] },
    { ...instructions(), nodes: [{ ...node, kind: "container", text: undefined, layout: "vertical", padding: 100 }] },
    { ...instructions(), nodes: [{ ...node, kind: "container", text: undefined, layout: "vertical", gap: -1 }] },
    { ...instructions(), nodes: [{ ...node, width: -1 }] },
    { ...instructions(), nodes: [{ ...node, text: "x".repeat(1001) }] },
    { ...instructions(), nodes: [{ ...node, url: "https://untrusted.example" }] },
    { ...instructions(), nodes: [node, node] },
    { ...instructions(), nodes: Array.from({length:301}, (_,i) => ({ ...node, id: `${i}` })) },
  ])("rejects untrusted or unbounded output %#", (input) => expect(() => parseCanvasInstructions(input)).toThrow());
  it("rejects excessive nesting", () => {
    let root: unknown = node;
    for (let i = 0; i < 9; i++) root = { ...node, id: `parent-${i}`, kind: "container", text: undefined, children: [root] };
    expect(() => parseCanvasInstructions({ ...instructions(), nodes: [root] })).toThrow();
  });
  it("rejects duplicate component/device selections", () => {
    const item = { componentId: "c1", screenshotVariantId: "v1", deviceTargetSlug: "mobile" };
    expect(() => parsePreparation({ requestId: uuid, expectedConnectionVersion: 1, items: [item, item] })).toThrow(/Repeated/);
  });
  it("accepts explicit design submissions and rejects extra payload fields", () => {
    const payload = { submissionId: uuid, connectionVersion: 1, componentId: "c1", fileKey: "key", frames: [{ nodeId: "1:2", variantId: "v1", expectedVariantVersion: null }], message: "Ready for review", annotations: [] };
    expect(parseDesignSubmission(payload).frames).toHaveLength(1);
    expect(() => parseDesignSubmission({ ...payload, approved: true })).toThrow();
    expect(() => parseDesignSubmission({ ...payload, frames: [...payload.frames,...payload.frames] })).toThrow();
  });
});
describe("portable SHA-256", () => {
  it("matches standard empty and abc vectors", () => {
    expect(sha256(new Uint8Array())).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256(new Uint8Array([97,98,99]))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("canonicalizes keys but retains array order and Unicode", () => {
    expect(instructionDigest({ b: "😀", a: 1 })).toBe(instructionDigest({ a: 1, b: "😀" }));
    expect(instructionDigest([1,2])).not.toBe(instructionDigest([2,1]));
  });
});
