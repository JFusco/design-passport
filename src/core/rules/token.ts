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
  documentationScaffoldNodeIds,
  assessTokenProperty,
  propertyBindingEvidence,
  eligibleTokenFields,
  isSemanticVariableName,
  rawFieldValue,
  selectedVariables,
  tokenCoverageSummary,
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
  const availableCollections = [...new Map(graph.variables.map((variable) => [variable.collectionKey, variable.collectionName])).entries()];
  const sourceConfigured = profile.tokenSourceCollectionKeys.length > 0;
  output.push(createFinding(
    "token.foundation.sources",
    "token-foundation",
    4,
    root,
    root,
    variables.length > 0 ? "pass" : availableCollections.length === 0 ? "not-applicable" : "needs-review",
    "Approved token source",
    variables.length > 0
      ? `${variables.length} variables are available from designer-approved local or enabled-library collections.`
      : availableCollections.length === 0
        ? "No inspectable variable collections are available in this file."
        : sourceConfigured
          ? "The approved collection keys no longer resolve. Open Audit Setup and choose an available token collection."
          : "Variables exist, but no collection is approved. Open Audit Setup to choose the source designers intend this audit to trust.",
    {
      variableCount: variables.length,
      selectedCollectionCount: profile.tokenSourceCollectionKeys.length,
      availableCollectionCount: availableCollections.length,
      availableCollectionNames: availableCollections.map(([, name]) => name),
    },
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

  const ledger = tokenCoverageSummary(nodes, { documentationScaffoldNodeIds: documentationScaffoldNodeIds(graph, root, nodes) });
  const coverage = {
    eligible: ledger.applicable,
    bound: ledger.counts.bound + ledger.counts.inherited,
    coverage: ledger.coverage ?? 100,
  };
  const coverageStatus = (threshold: number): "pass" | "fail" | "not-applicable" => ledger.coverage === null
    ? "not-applicable"
    : ledger.coverage >= threshold ? "pass" : "fail";
  const coverageMessage = (threshold: number, label: string) => ledger.coverage === null
    ? `Token coverage is not applicable: every measured value is ignored or outside the source-owned, tokenizable denominator.`
    : `${ledger.counts.bound} bound + ${ledger.counts.inherited} inherited of ${ledger.applicable} applicable fields (${ledger.coverage.toFixed(1)}%); ${ledger.counts.missing} are missing and ${ledger.counts.ignored} are ignored. ${label} starts at ${threshold}%.`;
  output.push(createFinding(
    "token.application.started",
    "token-application",
    1,
    root,
    root,
    coverageStatus(25),
    "Basic token binding coverage",
    coverageMessage(25, "A meaningful token baseline"),
    { ...coverage, ...ledger.counts, threshold: 25 },
  ));
  output.push(createFinding(
    "token.application.substantial",
    "token-application",
    1,
    root,
    root,
    coverageStatus(50),
    "Substantial token binding coverage",
    coverageMessage(50, "The substantial-coverage band"),
    { ...coverage, ...ledger.counts, threshold: 50 },
  ));
  output.push(createFinding(
    "token.application.strong",
    "token-application",
    2,
    root,
    root,
    coverageStatus(70),
    "Strong token binding coverage",
    coverageMessage(70, "The strong-coverage band"),
    { ...coverage, ...ledger.counts, threshold: 70 },
  ));
  output.push(createFinding(
    "token.application.minimum",
    "token-application",
    4,
    root,
    root,
    coverageStatus(80),
    "Broad token binding coverage",
    coverageMessage(80, "The grade-B target"),
    { ...coverage, ...ledger.counts, threshold: 80 },
  ));
  output.push(createFinding(
    "token.application.excellent",
    "token-application",
    1,
    root,
    root,
    coverageStatus(95),
    "Excellent token binding coverage",
    coverageMessage(95, "The grade-A target"),
    { ...coverage, ...ledger.counts, threshold: 95 },
  ));

  for (const node of nodes) {
    if (node.type !== "TEXT" || !node.text || node.evidenceRole === "instance-descendant" || !node.visible || node.renderVisible === false || node.opacity <= 0) continue;
    if (node.text.style?.status === "unavailable" || node.text.style?.status === "mixed" || (node.text.mixedFields?.length ?? 0) > 0) {
      output.push(createFinding("token.application.typography-review", "token-application", 1, root, node, "needs-review",
        "Typography evidence needs review", "Inspect the text's mixed runs or unavailable style before choosing a semantic token; unresolved fields do not lower coverage.",
        { styleStatus: node.text.style?.status ?? "none", styleId: node.text.style?.id ?? "", mixedFields: node.text.mixedFields ?? [] },
        { scoreImpact: false }));
    }
  }

  const selectedVariablesById = new Map(variables.map((variable) => [variable.id, variable]));
  for (const node of nodes) {
    for (const [field, candidates] of Object.entries(node.inferredBindings) as Array<[BindableField, string[]]>) {
      if (!assessTokenProperty(node, field).repairable || propertyBindingEvidence(node, field)) continue;
      const compatible = candidates.filter((candidate) => {
        const variable = selectedVariablesById.get(candidate);
        return Boolean(variable && isPreciselyScopedVariableForField(variable, field));
      });
      if (compatible.length === 1) {
        const inferredVariable = selectedVariablesById.get(compatible[0] ?? "");
        output.push(createFinding(
          "token.application.unique-inference",
          "token-application",
          1,
          root,
          node,
          "fail",
          "Unique inferred variable is available",
          `Figma inferred one approved compatible variable for ${field}; it can be bound with guarded confirmation.`,
          { field, variableId: compatible[0] ?? "", variableName: inferredVariable?.name ?? "Approved variable", candidateCount: compatible.length },
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
      if (!assessTokenProperty(node, field).repairable || propertyBindingEvidence(node, field)) continue;
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
        : "The target exposes reusable variable or text-style evidence to downstream consumers.",
      { ...coverage },
      coverage.bound === 0 ? { hardBlocker: true } : {},
    ));
  }

  return output;
}
