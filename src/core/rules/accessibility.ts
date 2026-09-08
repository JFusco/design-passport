import { contrastRatio, isLargeText } from "../contrast";
import { SOURCES } from "../constants";
import type { DesignKnowledgeGraph, Finding, NodeSnapshot } from "../contracts";
import { createFinding } from "./finding";
import { INTERACTIVE_COMPONENT_NAME } from "./patterns";

function nearestBackground(
  graph: DesignKnowledgeGraph,
  node: NodeSnapshot,
): { r: number; g: number; b: number; a: number } | undefined {
  const visited = new Set<string>();
  let currentId = node.parentId;
  while (currentId) {
    if (visited.has(currentId)) return undefined;
    visited.add(currentId);
    const parent = graph.nodes[currentId];
    if (!parent) return undefined;
    const solid = parent.fills.find((paint) => paint.visible && paint.type === "SOLID" && paint.color);
    if (solid?.color) return { ...solid.color, a: solid.opacity * parent.opacity };
    currentId = parent.parentId;
  }
  return { r: 1, g: 1, b: 1, a: 1 };
}

export function evaluateAccessibilityRules(
  graph: DesignKnowledgeGraph,
  root: NodeSnapshot,
  nodes: NodeSnapshot[],
): Finding[] {
  const output: Finding[] = [];
  const textNodes = nodes.filter((node) => node.text);
  let resolved = 0;
  let failures = 0;
  let unresolved = 0;
  for (const node of textNodes) {
    const text = node.text;
    if (!text?.textColor || !text.backgroundResolvable) {
      unresolved += 1;
      output.push(createFinding(
        "accessibility.contrast-unresolved",
        "accessibility",
        1,
        root,
        node,
        "needs-review",
        "Contrast needs manual review",
        "Text contrast cannot be measured reliably because the foreground or solid background is unresolved.",
        { backgroundResolvable: text?.backgroundResolvable ?? false },
        {
          confidence: 0.8,
          discriminator: node.id,
          sourceRefs: [SOURCES.wcagContrast],
          scoreImpact: false,
        },
      ));
      continue;
    }
    const background = text.backgroundColor ?? nearestBackground(graph, node);
    if (!background) {
      unresolved += 1;
      continue;
    }
    resolved += 1;
    const ratio = contrastRatio(text.textColor, background);
    const minimum = isLargeText(text.fontSize, text.fontWeight) ? 3 : 4.5;
    if (ratio < minimum) {
      failures += 1;
      output.push(createFinding(
        "accessibility.text-contrast-node",
        "accessibility",
        ratio < 3 ? 4 : 2,
        root,
        node,
        "fail",
        "Text contrast below WCAG 2.2 AA",
        `Measured contrast is ${ratio.toFixed(2)}:1; this text requires ${minimum.toFixed(1)}:1.`,
        { ratio, minimum, fontSize: text.fontSize ?? null, fontWeight: text.fontWeight ?? null },
        {
          discriminator: node.id,
          sourceRefs: [SOURCES.wcagContrast],
          scoreImpact: false,
        },
      ));
    }
  }
  output.push(createFinding(
    "accessibility.text-contrast",
    "accessibility",
    4,
    root,
    root,
    textNodes.length === 0
      ? "not-applicable"
      : failures === 0 && unresolved === 0
        ? "pass"
        : failures > 0
          ? "fail"
          : "needs-review",
    "WCAG 2.2 AA text contrast",
    `${resolved} text layers were measured; ${failures} failed and ${unresolved} require manual review.`,
    { textNodeCount: textNodes.length, resolved, failures, unresolved },
    { sourceRefs: [SOURCES.wcagContrast] },
  ));

  const interactive = nodes.filter((node) => INTERACTIVE_COMPONENT_NAME.test(node.name));
  const undersized = interactive.filter((node) => node.width < 24 || node.height < 24);
  const belowPreferred = interactive.filter((node) => node.width < 44 || node.height < 44);
  output.push(createFinding(
    "accessibility.target-minimum",
    "accessibility",
    2,
    root,
    undersized[0] ?? root,
    interactive.length === 0 ? "not-applicable" : undersized.length === 0 ? "pass" : "fail",
    "Minimum target size",
    interactive.length === 0
      ? "No interactive patterns were resolved by name."
      : undersized.length === 0
        ? "Resolved interactive targets are at least 24×24."
        : `${undersized.length} resolved targets are smaller than 24×24.`,
    { interactiveCount: interactive.length, undersizedCount: undersized.length },
    { sourceRefs: [SOURCES.wcagTarget] },
  ));
  output.push(createFinding(
    "accessibility.target-preferred",
    "accessibility",
    1,
    root,
    belowPreferred[0] ?? root,
    interactive.length === 0 ? "not-applicable" : belowPreferred.length === 0 ? "pass" : "needs-review",
    "Preferred touch target",
    interactive.length === 0
      ? "No interactive patterns were resolved by name."
      : belowPreferred.length === 0
        ? "Resolved interactive targets are at least 44×44."
        : `${belowPreferred.length} targets are below the preferred 44×44 touch size.`,
    { interactiveCount: interactive.length, belowPreferredCount: belowPreferred.length },
    { sourceRefs: [SOURCES.wcagTarget] },
  ));
  output.push(createFinding(
    "accessibility.behavior-review",
    "accessibility",
    1,
    root,
    root,
    interactive.length === 0 ? "not-applicable" : "needs-review",
    "Keyboard, focus, and semantic behavior",
    interactive.length === 0
      ? "No interactive behavior is in scope."
      : "Figma geometry cannot prove keyboard operation, focus order, focus visibility, or ARIA semantics; manual review is required.",
    { interactiveCount: interactive.length },
    { sourceRefs: [SOURCES.wcagTarget] },
  ));
  return output;
}
