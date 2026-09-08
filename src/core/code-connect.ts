import type { CodeConnectEvidence, DesignKnowledgeGraph } from "./contracts";
import { validateContract } from "./schema";
import { hashValue } from "./stable";

interface ParseDoc {
  figmaNode: string;
  source: string;
  template: string;
  language: string;
  label: string;
}

interface ParseOutput {
  docs: ParseDoc[];
}

export interface CodeConnectImportResult {
  evidence: CodeConnectEvidence[];
  rejected: Array<{ index: number; reason: string }>;
}

function decodeUrlPart(value: string): string | undefined {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return undefined;
  }
}

function firstQueryValue(query: string, expectedKey: string): string | undefined {
  for (const entry of query.split("&")) {
    const separator = entry.indexOf("=");
    const rawKey = separator < 0 ? entry : entry.slice(0, separator);
    if (decodeUrlPart(rawKey) !== expectedKey) continue;
    return decodeUrlPart(separator < 0 ? "" : entry.slice(separator + 1));
  }
  return undefined;
}

function parseFigmaNodeUrl(value: string): { fileKey?: string; nodeId?: string } {
  // The Figma plugin main-thread sandbox does not consistently expose the URL
  // constructor. Parse this deliberately narrow contract without browser globals.
  const match = /^https:\/\/([^/?#]+)(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i.exec(value);
  if (!match) return {};
  const hostname = match[1];
  if (!hostname || !/(^|\.)figma\.com$/i.test(hostname)) return {};

  const decodedSegments = (match[2] ?? "").split("/").filter(Boolean).map(decodeUrlPart);
  if (decodedSegments.some((segment) => segment === undefined)) return {};
  const segments = decodedSegments as string[];
  const kindIndex = segments.findIndex((segment) => ["design", "file", "proto"].includes(segment));
  if (kindIndex < 0 || !segments[kindIndex + 1]) return {};
  const fileKey = segments[kindIndex + 2] === "branch" ? segments[kindIndex + 3] : segments[kindIndex + 1];
  const rawNodeId = firstQueryValue(match[3] ?? "", "node-id");
  const nodeId = rawNodeId?.replace(/^([0-9]+)-([0-9]+)$/, "$1:$2");
  return { ...(fileKey ? { fileKey } : {}), ...(nodeId ? { nodeId } : {}) };
}

export function importCodeConnectJson(raw: string, graph: DesignKnowledgeGraph): CodeConnectImportResult {
  if (raw.length > 2_000_000) throw new Error("Code Connect JSON exceeds the 2 MB import limit");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Code Connect import is not valid JSON");
  }
  const validation = validateContract("code-connect-parse", parsed);
  if (!validation.valid) throw new Error(`Code Connect parse contract failed: ${validation.errors.join("; ")}`);
  if (!graph.fileKey) throw new Error("This private plugin cannot verify the current file key; Code Connect evidence was not imported");

  const output = parsed as ParseOutput;
  const evidence: CodeConnectEvidence[] = [];
  const rejected: Array<{ index: number; reason: string }> = [];
  const seen = new Set<string>();
  for (const [index, doc] of output.docs.entries()) {
    const target = parseFigmaNodeUrl(doc.figmaNode);
    if (!target.fileKey || !target.nodeId) {
      rejected.push({ index, reason: "figmaNode must be an HTTPS Figma node URL" });
      continue;
    }
    if (target.fileKey !== graph.fileKey) {
      rejected.push({ index, reason: "figmaNode references another file" });
      continue;
    }
    if (!graph.nodes[target.nodeId]) {
      rejected.push({ index, reason: "figmaNode does not exist in the complete file index" });
      continue;
    }
    if (seen.has(target.nodeId)) continue;
    seen.add(target.nodeId);
    evidence.push({
      nodeId: target.nodeId,
      label: doc.label.slice(0, 200),
      language: doc.language.slice(0, 100),
      sourceFingerprint: hashValue(doc.source),
      verifiedForFile: true,
    });
    // doc.template and doc.templateData are deliberately neither retained nor rendered.
  }
  return { evidence, rejected };
}
