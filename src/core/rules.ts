import type {
  BindableField,
  DesignKnowledgeGraph,
  Finding,
  ReadinessProfile,
} from "./contracts";
import { collectDescendants } from "./operations/graph";
import { CODE_RELEVANT_FIELDS } from "./operations/node-fields";
import { evaluateAccessibilityRules } from "./rules/accessibility";
import { evaluateComponentRules } from "./rules/component";
import { evaluateNamingRules } from "./rules/naming";
import { evaluatePipelineRules } from "./rules/pipeline";
import { evaluateResponsiveRules } from "./rules/responsive";
import { evaluateStructureRules } from "./rules/structure";
import { evaluateTokenRules } from "./rules/token";

function findingOrder(left: Finding, right: Finding): number {
  return left.rootId.localeCompare(right.rootId)
    || left.axis.localeCompare(right.axis)
    || left.ruleId.localeCompare(right.ruleId)
    || left.nodePath.localeCompare(right.nodePath)
    || left.id.localeCompare(right.id);
}

export function evaluateRules(
  graph: DesignKnowledgeGraph,
  profile: ReadinessProfile,
  targetRootIds: string[],
): Finding[] {
  const uniqueRootIds = [...new Set(targetRootIds)];
  const findings: Finding[] = [];
  for (const rootId of uniqueRootIds) {
    const root = graph.nodes[rootId];
    if (!root) continue;
    const nodes = collectDescendants(graph, rootId);
    const sourceNodes = nodes.filter((node) => node.evidenceRole !== "instance-descendant");
    findings.push(
      ...evaluateTokenRules(graph, profile, root, sourceNodes),
      ...evaluateNamingRules(graph, root, sourceNodes),
      ...evaluateStructureRules(root, sourceNodes),
      ...evaluateComponentRules(graph, root, sourceNodes),
      ...evaluateResponsiveRules(graph, profile, root),
      ...evaluateAccessibilityRules(graph, root, nodes),
      ...evaluatePipelineRules(graph, profile, root, sourceNodes),
    );
  }
  return findings.sort(findingOrder);
}

export function codeRelevantFields(): readonly BindableField[] {
  return CODE_RELEVANT_FIELDS;
}
