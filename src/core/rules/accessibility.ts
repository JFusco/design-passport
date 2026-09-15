import { contrastRatio, isLargeText } from "../contrast";
import { SOURCES } from "../constants";
import type { DesignKnowledgeGraph, Finding, NodeSnapshot } from "../contracts";
import { interactionState } from "../operations/interaction-state";
import { createFinding } from "./finding";
import { INTERACTIVE_COMPONENT_NAME } from "./patterns";

function isDescendant(graph: DesignKnowledgeGraph, node: NodeSnapshot, ancestorId: string): boolean {
  const visited = new Set<string>();
  let id = node.parentId;
  while (id && !visited.has(id)) {
    if (id === ancestorId) return true;
    visited.add(id);
    id = graph.nodes[id]?.parentId;
  }
  return false;
}

function renderedInGraph(graph: DesignKnowledgeGraph, node: NodeSnapshot): boolean {
  const visited = new Set<string>();
  let current: NodeSnapshot | undefined = node;
  while (current) {
    if (visited.has(current.id) || !current.visible || current.renderVisible === false || current.opacity === 0) return false;
    visited.add(current.id);
    current = current.parentId ? graph.nodes[current.parentId] : undefined;
  }
  return true;
}

function insideDefinition(graph: DesignKnowledgeGraph, node: NodeSnapshot): boolean {
  const visited = new Set<string>();
  let current: NodeSnapshot | undefined = node;
  while (current && !visited.has(current.id)) {
    if (current.type === "COMPONENT" || current.type === "COMPONENT_SET") return true;
    visited.add(current.id);
    current = current.parentId ? graph.nodes[current.parentId] : undefined;
  }
  return false;
}

function interactiveCandidates(graph: DesignKnowledgeGraph): NodeSnapshot[] {
  const candidates = Object.values(graph.nodes).filter((node) => renderedInGraph(graph, node) && (
    node.hasPointerInteraction || (["FRAME", "GROUP", "COMPONENT", "INSTANCE"].includes(node.type) && INTERACTIVE_COMPONENT_NAME.test(node.name))
  ));
  // A named child is not another hit target when an enclosing control already
  // owns the interaction. Explicit nested prototype targets retain identity.
  const candidateIds = new Set(candidates.map((node) => node.id));
  return candidates.filter((node) => {
    if (node.hasPointerInteraction) return true;
    const visited = new Set<string>();
    let id = node.parentId;
    while (id && !visited.has(id)) {
      if (candidateIds.has(id)) return false;
      visited.add(id);
      id = graph.nodes[id]?.parentId;
    }
    return true;
  });
}

type TargetAssessment = "minimum" | "spacing-exception" | "undersized" | "review";

function overlappingBounds(a: NonNullable<NodeSnapshot["absoluteBounds"]>, b: NonNullable<NodeSnapshot["absoluteBounds"]>): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function withinUnclippedRectangle(container: NodeSnapshot, content: NonNullable<NodeSnapshot["absoluteBounds"]>): boolean {
  const bounds = container.absoluteBounds;
  if (!bounds || bounds.x > content.x || bounds.y > content.y
    || bounds.x + bounds.width < content.x + content.width || bounds.y + bounds.height < content.y + content.height) return false;
  const radius = Math.max(container.cornerRadius ?? 0, ...Object.values(container.cornerRadii ?? {}), 0);
  // Either central strip is wholly inside a rounded rectangle. Shapes that
  // need corner-curve measurement stay review rather than assuming a hit box.
  return radius === 0 || (content.x >= bounds.x + radius && content.x + content.width <= bounds.x + bounds.width - radius)
    || (content.y >= bounds.y + radius && content.y + content.height <= bounds.y + bounds.height - radius);
}

function supportedTargetGeometry(graph: DesignKnowledgeGraph, node: NodeSnapshot): boolean {
  const bounds = node.absoluteBounds;
  if (!bounds || !["FRAME", "GROUP", "COMPONENT", "INSTANCE", "RECTANGLE", "TEXT"].includes(node.type)) return false;
  // The bounding rectangle alone does not establish a rounded or masked hit
  // region. Do not claim it contains a solid axis-aligned 24×24 square.
  if (node.isMask) return false;
  if ((node.cornerRadius ?? 0) > 0 || Object.values(node.cornerRadii ?? {}).some((radius) => radius > 0)) {
    const minimumSquare = { x: bounds.x + bounds.width / 2 - 12, y: bounds.y + bounds.height / 2 - 12, width: 24, height: 24 };
    if (!withinUnclippedRectangle(node, minimumSquare)) return false;
  }
  const seen = new Set<string>();
  let current: NodeSnapshot | undefined = node;
  while (current) {
    if (seen.has(current.id) || current.rotation !== 0 || current.isMask) return false;
    seen.add(current.id);
    if (current.id !== node.id && (current.clipsContent || current.layout?.clipsContent)) {
      if (!withinUnclippedRectangle(current, bounds)) return false;
    }
    current = current.parentId ? graph.nodes[current.parentId] : undefined;
  }
  return true;
}

function assessTarget(graph: DesignKnowledgeGraph, node: NodeSnapshot, candidates: NodeSnapshot[]): TargetAssessment {
  if (!node.hasPointerInteraction || interactionState(graph, node).state === "conflicting") return "review";
  if (node.type === "TEXT") return "review"; // Inline/equivalent-link exceptions need semantic confirmation.
  const bounds = node.absoluteBounds;
  if (!bounds || !supportedTargetGeometry(graph, node)) return "review";
  // Overlapping targets can share or intercept an action. Figma does not prove
  // their final hit regions or that they perform the same action.
  if (candidates.some((other) => other.id !== node.id && other.pageId === node.pageId && other.absoluteBounds
    && interactionState(graph, other).state !== "disabled" && overlappingBounds(bounds, other.absoluteBounds))) return "review";
  if (bounds.width >= 24 && bounds.height >= 24) return "minimum";
  // Spacing requires the complete surrounding target set. A component
  // definition cannot establish spacing at its eventual consumer placement.
  if (!graph.complete || insideDefinition(graph, node)
    || Object.values(graph.nodes).some((other) => other.pageId === node.pageId && renderedInGraph(graph, other) && other.hasPointerInteraction === undefined)
    || candidates.some((other) => other.id !== node.id && other.pageId === node.pageId && !other.absoluteBounds)) return "review";
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  let uncertain = false;
  for (const other of candidates) {
    if (other.id === node.id || other.pageId !== node.pageId || interactionState(graph, other).state === "disabled") continue;
    // Parent and nested target activation semantics are not inferable from
    // overlapping Figma geometry alone.
    if (isDescendant(graph, node, other.id) || isDescendant(graph, other, node.id)) return "review";
    const rect = other.absoluteBounds!;
    const undersized = rect.width < 24 || rect.height < 24;
    const dx = cx - Math.max(rect.x, Math.min(cx, rect.x + rect.width));
    const dy = cy - Math.max(rect.y, Math.min(cy, rect.y + rect.height));
    // Even an undersized target can be long: the tested circle must avoid both
    // its actual rectangle AND its 24px circle, not merely the other circle.
    const intersects = Math.hypot(dx, dy) < 12
      || (undersized && Math.hypot(cx - (rect.x + rect.width / 2), cy - (rect.y + rect.height / 2)) < 24);
    if (!intersects) continue;
    if (!other.hasPointerInteraction || !supportedTargetGeometry(graph, other) || interactionState(graph, other).state === "conflicting") uncertain = true;
    else return "undersized";
  }
  return uncertain ? "review" : "spacing-exception";
}

export function evaluateAccessibilityRules(graph: DesignKnowledgeGraph, root: NodeSnapshot, nodes: NodeSnapshot[]): Finding[] {
  const output: Finding[] = [];
  const textNodes = nodes.filter((node) => node.type === "TEXT" && node.text && renderedInGraph(graph, node));
  let disabledCount = 0;
  let resolved = 0;
  let failures = 0;
  let unresolved = 0;
  for (const node of textNodes) {
    const state = interactionState(graph, node);
    if (state.state === "disabled") {
      disabledCount += 1;
      output.push(createFinding(
        "accessibility.contrast-disabled", "accessibility", 1, root, node, "not-applicable",
        "Disabled control text is exempt from contrast minimums",
        "An explicit disabled component property or variant establishes this exemption.",
        { disabledEvidence: state.evidence },
        { discriminator: node.id, sourceRefs: [SOURCES.wcagContrast], scoreImpact: false },
      ));
      continue;
    }
    const text = node.text!;
    const background = text.backgroundColor;
    const ratio = text.textColor && background && text.backgroundResolvable ? contrastRatio(text.textColor, background) : Number.NaN;
    const thresholdUnresolved = text.fontSize === undefined || text.mixedFields?.includes("fontSize")
      || (text.fontSize >= 18.66 && text.fontSize < 24 && (text.fontWeight === undefined || text.mixedFields?.includes("fontWeight")));
    if (state.state === "conflicting" || !Number.isFinite(ratio) || thresholdUnresolved) {
      unresolved += 1;
      output.push(createFinding(
        "accessibility.contrast-unresolved", "accessibility", 1, root, node, "needs-review",
        "Contrast needs manual review",
        state.state === "conflicting"
          ? "Component state evidence conflicts; resolve the enabled/disabled intent before applying a contrast exemption or failure."
          : thresholdUnresolved ? "Mixed or unavailable font metrics cannot establish the applicable contrast threshold; review the text runs."
            : text.backgroundReason ?? "The rendered foreground or opaque consumer background is unresolved; a canvas color is not assumed.",
        { backgroundResolvable: text.backgroundResolvable, backgroundSourceNodeIds: text.backgroundSourceNodeIds ?? [], interactionState: state.state, stateEvidence: state.evidence, thresholdUnresolved: Boolean(thresholdUnresolved) },
        { confidence: 0.8, discriminator: node.id, sourceRefs: [SOURCES.wcagContrast], scoreImpact: false },
      ));
      continue;
    }
    resolved += 1;
    const minimum = isLargeText(text.fontSize, text.fontWeight) ? 3 : 4.5;
    if (ratio < minimum) {
      failures += 1;
      output.push(createFinding(
        "accessibility.text-contrast-node", "accessibility", ratio < 3 ? 4 : 2, root, node, "fail",
        "Text contrast below WCAG 2.2 AA",
        `Measured contrast is ${ratio.toFixed(2)}:1; this text requires ${minimum.toFixed(1)}:1.`,
        { ratio, minimum, fontSize: text.fontSize ?? null, fontWeight: text.fontWeight ?? null, background: background!, backgroundSourceNodeIds: text.backgroundSourceNodeIds ?? [], foreground: text.textColor! },
        { discriminator: node.id, sourceRefs: [SOURCES.wcagContrast], scoreImpact: false },
      ));
    }
  }
  const activeTextNodeCount = textNodes.length - disabledCount;
  output.push(createFinding(
    "accessibility.text-contrast", "accessibility", 4, root, root,
    activeTextNodeCount === 0 ? "not-applicable" : failures > 0 ? "fail" : unresolved > 0 ? "needs-review" : "pass",
    "WCAG 2.2 AA text contrast",
    `${resolved} active text layers were measured; ${failures} failed, ${unresolved} require manual review, and ${disabledCount} explicitly disabled-control layers were exempt.`,
    { textNodeCount: textNodes.length, activeTextNodeCount, inactiveTextNodeCount: disabledCount, resolved, failures, unresolved },
    { sourceRefs: [SOURCES.wcagContrast], scoreImpact: failures > 0 || unresolved === 0 },
  ));

  const allCandidates = interactiveCandidates(graph);
  const scopeIds = new Set(nodes.map((node) => node.id));
  const inScope = allCandidates.filter((node) => scopeIds.has(node.id));
  const interactive = inScope.filter((node) => interactionState(graph, node).state !== "disabled");
  const inactiveInteractiveCount = inScope.length - interactive.length;
  const assessed = interactive.map((node) => ({ node, assessment: assessTarget(graph, node, allCandidates) }));
  const undersized = assessed.filter((item) => item.assessment === "undersized");
  const review = assessed.filter((item) => item.assessment === "review");
  const exceptions = assessed.filter((item) => item.assessment === "spacing-exception");
  const belowPreferred = interactive.filter((node) => (node.absoluteBounds?.width ?? node.width) < 44 || (node.absoluteBounds?.height ?? node.height) < 44);
  output.push(createFinding(
    "accessibility.target-minimum", "accessibility", 2, root, undersized[0]?.node ?? review[0]?.node ?? root,
    interactive.length === 0 ? "not-applicable" : undersized.length > 0 ? "fail" : review.length > 0 ? "needs-review" : "pass",
    "Minimum target size",
    interactive.length === 0 ? "No interactive targets were evidenced."
      : `${undersized.length} evidenced targets fail the 24×24 minimum and spacing condition; ${exceptions.length} satisfy the spacing exception; ${review.length} need target or exception review. Prototype targets provide geometry evidence; equivalent controls, inline links, user-agent controls, and essential sizing exceptions need manual confirmation where applicable.`,
    { interactiveCount: interactive.length, inactiveInteractiveCount, undersizedCount: undersized.length, reviewCount: review.length, spacingExceptionCount: exceptions.length, targetEvidence: assessed.map(({ node, assessment }) => ({ nodeId: node.id, explicitPointerInteraction: node.hasPointerInteraction ?? false, assessment, bounds: node.absoluteBounds ?? null })) },
    { sourceRefs: [SOURCES.wcagTarget], scoreImpact: undersized.length > 0 || review.length === 0 },
  ));
  output.push(createFinding(
    "accessibility.target-preferred", "accessibility", 1, root, belowPreferred[0] ?? root,
    interactive.length === 0 ? "not-applicable" : belowPreferred.length === 0 ? "pass" : "needs-review",
    "Preferred touch target",
    interactive.length === 0 ? "No interactive targets were evidenced." : `${belowPreferred.length} target candidates are below the enhanced 44×44 size. This recommendation does not lower the grade.`,
    { interactiveCount: interactive.length, inactiveInteractiveCount, belowPreferredCount: belowPreferred.length },
    { sourceRefs: [SOURCES.wcagTargetEnhanced], scoreImpact: false },
  ));
  output.push(createFinding(
    "accessibility.behavior-review", "accessibility", 1, root, root,
    interactive.length === 0 ? "not-applicable" : "needs-review",
    "Keyboard, focus, and semantic behavior",
    interactive.length === 0 ? "No interactive behavior is in scope." : "Figma geometry cannot prove keyboard operation, focus order, focus visibility, or ARIA semantics; manual review is required.",
    { interactiveCount: interactive.length, inactiveInteractiveCount },
    { sourceRefs: [SOURCES.wcagTarget], scoreImpact: false },
  ));
  return output;
}
