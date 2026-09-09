import type {
  BindableField,
  DesignKnowledgeGraph,
  Finding,
  JsonValue,
  NodeSnapshot,
  ReadinessProfile,
} from "../contracts";
import { collectDescendants } from "../operations/graph";
import {
  bindingCoverage,
  CODE_RELEVANT_FIELDS,
  eligibleTokenFields,
  isSemanticVariableName,
  rawFieldValue,
  selectedVariables,
} from "../operations/node-fields";
import { isPreciselyScopedVariableForField } from "../operations/variable-compatibility";
import { createFinding } from "./finding";

export function evaluateTokenRules(
  graph: DesignKnowledgeGraph,
  profile: ReadinessProfile,
  root: NodeSnapshot,
  nodes: NodeSnapshot[],
): Finding[] {
  const output: Finding[] = [];
  const variables = selectedVariables(graph, profile);
  output.push(createFinding(
    "token.foundation.sources",
    "token-foundation",
    4,
    root,
    root,
    variables.length > 0 ? "pass" : "needs-review",
    "Approved token source",
    variables.length > 0
      ? `${variables.length} variables are available from designer-approved local or enabled-library collections.`
      : "No token collection is approved in this file profile.",
    { variableCount: variables.length, selectedCollectionCount: profile.tokenSourceCollectionKeys.length },
  ));

  const semanticCount = variables.filter((variable) => variable.semantic || isSemanticVariableName(variable.name)).length;
  const semanticCoverage = variables.length === 0 ? 0 : (semanticCount / variables.length) * 100;
  output.push(createFinding(
    "token.foundation.semantic",
    "token-foundation",
    2,
    root,
    root,
    variables.length === 0 ? "not-applicable" : semanticCoverage >= 75 ? "pass" : "fail",
    "Semantic variable foundation",
    variables.length === 0
      ? "Semantic naming cannot be evaluated until a token source is selected."
      : `${semanticCoverage.toFixed(1)}% of approved variables use semantic-looking names.`,
    { semanticCount, variableCount: variables.length, semanticCoverage },
  ));

  const fullEvidence = variables.filter((variable) => variable.evidenceLevel === "full");
  const richCount = fullEvidence.filter((variable) => variable.scopes.length > 0 && variable.modeNames.length > 0 && Boolean(variable.webSyntax)).length;
  const metadataCoverage = fullEvidence.length === 0 ? 0 : (richCount / fullEvidence.length) * 100;
  output.push(createFinding(
    "token.foundation.metadata",
    "token-foundation",
    1,
    root,
    root,
    variables.length === 0 ? "not-applicable" : fullEvidence.length === 0 ? "needs-review" : metadataCoverage >= 95 ? "pass" : "fail",
    "Variable scopes, modes, and code syntax",
    variables.length === 0
      ? "Variable metadata is not applicable without an approved source."
      : fullEvidence.length === 0
        ? "The approved library exposes summary-only metadata; inspect scopes, modes, and web syntax in its source file."
        : `${richCount} of ${fullEvidence.length} fully inspectable variables (${metadataCoverage.toFixed(1)}%) expose scopes, modes, and web code syntax; 95% is required.`,
    {
      completeMetadataCount: richCount,
      fullEvidenceCount: fullEvidence.length,
      metadataCoverage,
      summaryEvidenceCount: variables.length - fullEvidence.length,
      variableCount: variables.length,
    },
  ));

  const semanticVariables = variables.filter((variable) => variable.semantic || isSemanticVariableName(variable.name));
  const aliasEvidence = semanticVariables.filter((variable) => variable.aliased !== undefined);
  const aliasedSemantic = aliasEvidence.filter((variable) => variable.aliased).length;
  output.push(createFinding(
    "token.foundation.alias-layer",
    "token-foundation",
    1,
    root,
    root,
    semanticVariables.length === 0 ? "not-applicable" : aliasEvidence.length === 0 ? "needs-review" : aliasedSemantic > 0 ? "pass" : "needs-review",
    "Primitive-to-semantic alias layer",
    semanticVariables.length === 0
      ? "No semantic variables are available to evaluate."
      : aliasedSemantic > 0
        ? `${aliasedSemantic} semantic variables resolve through aliases.`
        : "No semantic variable aliases were measured; confirm whether this collection intentionally combines primitive and semantic roles.",
    {
      semanticVariableCount: semanticVariables.length,
      aliasEvidenceCount: aliasEvidence.length,
      aliasedSemanticCount: aliasedSemantic,
    },
  ));

  const coverage = bindingCoverage(nodes);
  output.push(createFinding(
    "token.application.started",
    "token-application",
    1,
    root,
    root,
    coverage.coverage >= 25 ? "pass" : "fail",
    "Basic token binding coverage",
    `${coverage.bound} of ${coverage.eligible} measurable fields (${coverage.coverage.toFixed(1)}%) are bound; 25% marks a meaningful token baseline.`,
    { ...coverage, threshold: 25 },
  ));
  output.push(createFinding(
    "token.application.substantial",
    "token-application",
    1,
    root,
    root,
    coverage.coverage >= 50 ? "pass" : "fail",
    "Substantial token binding coverage",
    `${coverage.bound} of ${coverage.eligible} measurable fields (${coverage.coverage.toFixed(1)}%) are bound; the next progress band starts at 50%.`,
    { ...coverage, threshold: 50 },
  ));
  output.push(createFinding(
    "token.application.strong",
    "token-application",
    2,
    root,
    root,
    coverage.coverage >= 70 ? "pass" : "fail",
    "Strong token binding coverage",
    `${coverage.bound} of ${coverage.eligible} measurable fields (${coverage.coverage.toFixed(1)}%) are bound; the strong-coverage band starts at 70%.`,
    { ...coverage, threshold: 70 },
  ));
  output.push(createFinding(
    "token.application.minimum",
    "token-application",
    4,
    root,
    root,
    coverage.coverage >= 80 ? "pass" : "fail",
    "Broad token binding coverage",
    `${coverage.bound} of ${coverage.eligible} measurable code-relevant fields (${coverage.coverage.toFixed(1)}%) are variable-bound; 80% is the grade-B target.`,
    { ...coverage, threshold: 80 },
  ));
  output.push(createFinding(
    "token.application.excellent",
    "token-application",
    1,
    root,
    root,
    coverage.coverage >= 95 ? "pass" : "fail",
    "Excellent token binding coverage",
    `${coverage.bound} of ${coverage.eligible} measurable fields (${coverage.coverage.toFixed(1)}%) are bound; 95% is required for grade A.`,
    { ...coverage, threshold: 95 },
  ));

  const selectedVariablesById = new Map(variables.map((variable) => [variable.id, variable]));
  for (const node of nodes) {
    for (const [field, candidates] of Object.entries(node.inferredBindings) as Array<[BindableField, string[]]>) {
      if (!CODE_RELEVANT_FIELDS.includes(field)) continue;
      if (node.boundFields.includes(field)) continue;
      const compatible = candidates.filter((candidate) => {
        const variable = selectedVariablesById.get(candidate);
        return Boolean(variable && isPreciselyScopedVariableForField(variable, field));
      });
      if (compatible.length === 1) {
        output.push(createFinding(
          "token.application.unique-inference",
          "token-application",
          1,
          root,
          node,
          "fail",
          "Unique inferred variable is available",
          `Figma inferred one approved compatible variable for ${field}; it can be bound with guarded confirmation.`,
          { field, variableId: compatible[0] ?? "", candidateCount: compatible.length },
          {
            fixability: "guarded",
            suggestedValue: { field, variableId: compatible[0] ?? "" },
            discriminator: field,
            scoreImpact: false,
          },
        ));
      } else if (compatible.length > 1) {
        output.push(createFinding(
          "token.application.ambiguous-inference",
          "token-application",
          1,
          root,
          node,
          "needs-review",
          "Multiple token candidates",
          `${compatible.length} approved variables match ${field}; a designer must choose the semantic mapping.`,
          { field, candidateCount: compatible.length },
          { discriminator: field, scoreImpact: false },
        ));
      }
    }
  }

  const repeated = new Map<string, { field: BindableField; rawValue: JsonValue; nodeIds: string[] }>();
  for (const node of nodes) {
    for (const field of eligibleTokenFields(node)) {
      if (node.boundFields.includes(field)) continue;
      const rawValue = rawFieldValue(node, field);
      if (rawValue === undefined) continue;
      const key = `${field}:${JSON.stringify(rawValue)}`;
      const current = repeated.get(key) ?? { field, rawValue, nodeIds: [] };
      current.nodeIds.push(node.id);
      repeated.set(key, current);
    }
  }
  for (const [key, group] of repeated) {
    if (group.nodeIds.length < 3) continue;
    const node = graph.nodes[group.nodeIds[0] ?? ""] ?? root;
    output.push(createFinding(
      "token.application.repeated-literal",
      "token-application",
      1,
      root,
      node,
      "needs-review",
      "Repeated literal can become a semantic token",
      `${group.nodeIds.length} unbound ${group.field} values match. Choose an existing local collection and a semantic slash-separated name.`,
      { field: group.field, occurrenceCount: group.nodeIds.length, rawValue: group.rawValue },
      {
        suggestedValue: { field: group.field, rawValue: group.rawValue, nodeIds: group.nodeIds },
        discriminator: key,
        scoreImpact: false,
      },
    ));
  }

  const family = graph.responsiveFamilies.find((item) => item.memberIds.includes(root.id));
  if (family && family.memberIds.length > 1) {
    const memberCoverage = family.memberIds.map((id) => ({ id, ...bindingCoverage(collectDescendants(graph, id)) }));
    const whollyUnbound = memberCoverage.some((member) => member.eligible > 0 && member.bound === 0)
      && memberCoverage.some((member) => member.bound > 0);
    output.push(createFinding(
      "token.application.breakpoint-tier",
      "token-application",
      4,
      root,
      root,
      whollyUnbound ? "fail" : "pass",
      "Breakpoint token parity",
      whollyUnbound
        ? "At least one responsive tier is wholly unbound while a sibling tier uses variables."
        : "No wholly unbound responsive tier was measured.",
      { tiers: memberCoverage },
      whollyUnbound ? { hardBlocker: true } : {},
    ));
  }

  if (coverage.eligible >= 4) {
    output.push(createFinding(
      "pipeline.literal-styling",
      "pipeline-readiness",
      4,
      root,
      root,
      coverage.bound === 0 ? "fail" : "pass",
      "Machine-readable styling",
      coverage.bound === 0
        ? "All measurable code-relevant styling on this target is literal."
        : "The target exposes variable-backed styling to downstream consumers.",
      { ...coverage },
      coverage.bound === 0 ? { hardBlocker: true } : {},
    ));
  }

  return output;
}
