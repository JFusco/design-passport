import { CATALOG_VERSION, canonicalPatternName, resolvePattern } from "../catalog";
import type { DesignKnowledgeGraph, Finding, NodeSnapshot } from "../contracts";
import { createFinding } from "./finding";
import {
  ABBREVIATED_COMPONENT_VALUE,
  DEFAULT_LAYER_NAME,
  GENERIC_COMPONENT_PROPERTY,
} from "./patterns";

export function evaluateNamingRules(
  graph: DesignKnowledgeGraph,
  root: NodeSnapshot,
  nodes: NodeSnapshot[],
): Finding[] {
  const output: Finding[] = [];
  const defaults = nodes.filter((node) => DEFAULT_LAYER_NAME.test(node.name.trim()));
  const percentage = nodes.length === 0 ? 0 : (defaults.length / nodes.length) * 100;
  output.push(createFinding(
    "naming.default-critical",
    "layer-naming",
    4,
    root,
    defaults[0] ?? root,
    percentage <= 15 ? "pass" : "fail",
    "Default layer names below critical threshold",
    `${percentage.toFixed(1)}% of layers have Figma-default names; over 15% is D territory.`,
    { defaultCount: defaults.length, nodeCount: nodes.length, percentage },
  ));
  output.push(createFinding(
    "naming.default-healthy",
    "layer-naming",
    2,
    root,
    defaults[0] ?? root,
    percentage < 5 ? "pass" : "fail",
    "Healthy semantic naming coverage",
    `${percentage.toFixed(1)}% of layers have default names; under 5% is healthy.`,
    { defaultCount: defaults.length, nodeCount: nodes.length, percentage },
  ));
  for (const node of defaults.slice(0, 100)) {
    output.push(createFinding(
      "naming.default-node",
      "layer-naming",
      1,
      root,
      node,
      "fail",
      "Default layer name",
      `“${node.name}” does not communicate a semantic role.`,
      { currentName: node.name },
      { discriminator: node.id, scoreImpact: false },
    ));
  }

  for (const node of nodes.filter((candidate) => candidate.component)) {
    const resolution = resolvePattern(node.name);
    const normalized = canonicalPatternName(resolution);
    if (resolution.kind === "contextual") {
      const currentRootName = node.name.split("/")[0]?.trim() ?? node.name.trim();
      const confirmed = Boolean(
        node.confirmedPattern
        && node.confirmedPattern.catalogVersion === CATALOG_VERSION
        && node.confirmedPattern.sourceName.toLocaleLowerCase("en-US") === currentRootName.toLocaleLowerCase("en-US")
        && resolution.candidates?.includes(node.confirmedPattern.canonicalName),
      );
      const confirmedName = confirmed ? node.confirmedPattern?.canonicalName : undefined;
      const confirmedResolution = confirmedName
        ? { ...resolution, canonicalName: confirmedName, requiresConfirmation: false }
        : resolution;
      output.push(createFinding(
        "naming.pattern-contextual",
        "layer-naming",
        2,
        root,
        node,
        confirmed ? "pass" : "needs-review",
        "Contextual component alias",
        confirmedName
          ? `“${node.name}” is explicitly confirmed as ${confirmedName}.`
          : `“${node.name}” can map to ${resolution.candidates?.join(" or ")}; designer confirmation is required.`,
        { candidates: resolution.candidates ?? [], confirmedCanonicalName: confirmedName ?? null },
        { patternResolution: confirmedResolution },
      ));
    } else if (resolution.kind === "novel") {
      output.push(createFinding(
        "naming.pattern-novel",
        "layer-naming",
        1,
        root,
        node,
        "needs-review",
        "Novel component term",
        `“${node.name}” is not in the pinned catalog and is recorded without guessing.`,
        { currentName: node.name },
        { patternResolution: resolution },
      ));
    } else if (resolution.kind === "alias" && normalized) {
      output.push(createFinding(
        "naming.pattern-alias",
        "layer-naming",
        1,
        root,
        node,
        "fail",
        "Canonical component name",
        `“${node.name}” resolves unambiguously to “${normalized}”.`,
        { currentName: node.name, canonicalName: normalized },
        {
          patternResolution: resolution,
          fixability: "automatic",
          suggestedValue: { name: normalized },
        },
      ));
    } else {
      const expected = normalized ?? node.name.trim().replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ");
      output.push(createFinding(
        "naming.pattern-canonical",
        "layer-naming",
        2,
        root,
        node,
        node.name === expected ? "pass" : "fail",
        "Canonical component grammar",
        node.name === expected
          ? `“${node.name}” uses the canonical pattern grammar.`
          : `Normalize “${node.name}” to “${expected}”.`,
        { currentName: node.name, expectedName: expected },
        {
          patternResolution: resolution,
          ...(node.name === expected
            ? {}
            : { fixability: "automatic" as const, suggestedValue: { name: expected } }),
        },
      ));
    }

    for (const property of node.component?.propertyDefinitions ?? []) {
      const propertyName = property.name.split("#")[0] ?? property.name;
      const propertyValid = /^[a-z][A-Za-z0-9]*$/.test(propertyName)
        && !GENERIC_COMPONENT_PROPERTY.test(propertyName);
      output.push(createFinding(
        "naming.component-property",
        "component-hygiene",
        2,
        root,
        node,
        propertyValid ? "pass" : "fail",
        "Component property grammar",
        propertyValid
          ? `“${propertyName}” uses lower-camel semantic naming.`
          : `“${propertyName}” must be a semantic lower-camel property name.`,
        { propertyName, propertyType: property.type },
        { discriminator: propertyName },
      ));
      if (property.type !== "VARIANT") continue;
      const badValues = property.values.filter((value) => (
        value !== value.toLocaleLowerCase("en-US")
        || /[_\s]/.test(value)
        || ABBREVIATED_COMPONENT_VALUE.test(value)
      ));
      output.push(createFinding(
        "naming.component-value",
        "component-hygiene",
        1,
        root,
        node,
        badValues.length === 0 ? "pass" : "fail",
        "Component property values",
        badValues.length === 0
          ? `Values for “${propertyName}” use lowercase full words.`
          : `Normalize nonconforming values for “${propertyName}”: ${badValues.join(", ")}.`,
        { propertyName, badValues },
        { discriminator: propertyName },
      ));
    }
  }

  for (const node of nodes.filter((candidate) => candidate.name !== candidate.name.trim().replace(/\s+/g, " "))) {
    const name = node.name.trim().replace(/\s+/g, " ");
    output.push(createFinding(
      "naming.whitespace",
      "layer-naming",
      1,
      root,
      node,
      "fail",
      "Lossless name normalization",
      `Normalize whitespace in “${node.name}”.`,
      { currentName: node.name, expectedName: name },
      { fixability: "automatic", suggestedValue: { name } },
    ));
  }

  const rootNameDuplicates = Object.values(graph.nodes).filter((node) => (
    node.pageId === root.pageId && node.parentId === root.parentId && node.name === root.name
  ));
  output.push(createFinding(
    "naming.source-unique",
    "layer-naming",
    2,
    root,
    root,
    rootNameDuplicates.length <= 1 ? "pass" : "fail",
    "Unique source name",
    rootNameDuplicates.length <= 1
      ? "This source name is unique among its siblings."
      : `${rootNameDuplicates.length} sibling roots share “${root.name}”.`,
    { duplicateCount: rootNameDuplicates.length },
  ));

  return output;
}
