import { describe, expect, it } from "vitest";
import { importCodeConnectJson } from "../src/core/code-connect";
import { reportToMarkdown } from "../src/core/markdown";
import { profileSemanticErrors } from "../src/core/profile";
import { validateContract } from "../src/core/schema";
import { buildReadinessReport } from "../src/core/report";
import { healthyGraph, profile } from "./fixtures";

describe("contracts and hostile input handling", () => {
  it("validates profile JSON Schema and semantic constraints", () => {
    const p = profile();
    expect(validateContract("readiness-profile", p)).toEqual({ valid: true, errors: [] });
    const duplicate = { ...p, breakpoints: [{ name: "Desktop", width: 1440 }, { name: "desktop", width: 768 }] };
    expect(profileSemanticErrors(duplicate)).toContain("Breakpoint names must be unique");
  });

  it("accepts current-file Code Connect evidence without retaining or evaluating templates", () => {
    const graph = healthyGraph();
    const raw = JSON.stringify({ docs: [{
      figmaNode: "https://www.figma.com/design/file-key/Test?node-id=root-desktop",
      source: "/sensitive/private/path/Button.tsx",
      template: "<script>globalThis.compromised = true</script>{{ process.env.SECRET }}",
      templateData: { nested: "untrusted" },
      language: "typescript",
      label: "React",
    }] });
    const result = importCodeConnectJson(raw.replace("root-desktop", "root%3Adesktop"), graph);
    expect(result.rejected).toEqual([]);
    expect(result.evidence).toHaveLength(1);
    expect(JSON.stringify(result.evidence)).not.toContain("<script>");
    expect(JSON.stringify(result.evidence)).not.toContain("sensitive/private/path");
    expect((globalThis as { compromised?: boolean }).compromised).toBeUndefined();
  });

  it("parses Figma node URLs without relying on the browser URL global", () => {
    const previousUrl = globalThis.URL;
    Reflect.deleteProperty(globalThis, "URL");
    try {
      const raw = JSON.stringify({ docs: [{
        figmaNode: "https://www.figma.com/design/file-key/Test?node-id=root%3Adesktop",
        source: "src/Card.tsx",
        template: "figma.tsx`<Card />`",
        language: "tsx",
        label: "React",
      }] });
      expect(importCodeConnectJson(raw, healthyGraph()).evidence).toHaveLength(1);
    } finally {
      globalThis.URL = previousUrl;
    }
  });

  it("rejects other files, non-HTTPS URLs, missing nodes, and malformed shape", () => {
    const graph = healthyGraph();
    const docs = [
      { figmaNode: "https://figma.com/design/other/Test?node-id=root%3Adesktop", source: "x", template: "x", language: "tsx", label: "React" },
      { figmaNode: "javascript:alert(1)", source: "x", template: "x", language: "tsx", label: "React" },
      { figmaNode: "https://figma.com/design/file-key/Test?node-id=missing%3A1", source: "x", template: "x", language: "tsx", label: "React" },
    ];
    expect(importCodeConnectJson(JSON.stringify({ docs }), graph).rejected).toHaveLength(3);
    expect(() => importCodeConnectJson(JSON.stringify({ docs: [{ figmaNode: "x" }] }), graph)).toThrow(/contract failed/i);
    expect(() => importCodeConnectJson("not json", graph)).toThrow(/not valid JSON/i);
  });

  it("rejects lookalike hosts, user-info tricks, ports, and malformed encoding", () => {
    const graph = healthyGraph();
    const docs = [
      "https://figma.com.evil.example/design/file-key/Test?node-id=root%3Adesktop",
      "https://evil.example@figma.com/design/file-key/Test?node-id=root%3Adesktop",
      "https://figma.com:443/design/file-key/Test?node-id=root%3Adesktop",
      "https://figma.com/design/file-key/%E0%A4%A?node-id=root%3Adesktop",
    ].map((figmaNode) => ({ figmaNode, source: "x", template: "x", language: "tsx", label: "React" }));
    expect(importCodeConnectJson(JSON.stringify({ docs }), graph).rejected).toHaveLength(docs.length);
  });

  it("escapes untrusted layer content in Markdown exports", () => {
    const p = profile();
    const report = buildReadinessReport({ graph: healthyGraph(p), profile: p, scope: "selection", targetRootIds: ["root:desktop"] });
    report.findings[0]!.title = "<script>|break [click](javascript:alert(1))";
    const markdown = reportToMarkdown(report);
    expect(markdown).toContain("&lt;script&gt;\\|break");
    expect(markdown).toContain("The score belongs to the component set as a whole");
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("[click](javascript:");
  });
});
