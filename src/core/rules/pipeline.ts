import { CATALOG_VERSION, resolvePattern } from "../catalog";
import { AI_SOURCE_FRAME_ANNOTATION, RULESET_VERSION } from "../constants";
import type { DesignKnowledgeGraph, Finding, NodeSnapshot, ReadinessProfile } from "../contracts";
import { createFinding } from "./finding";
import { DEFAULT_LAYER_NAME } from "./patterns";

export function evaluatePipelineRules(
  graph: DesignKnowledgeGraph,
  profile: ReadinessProfile,
  root: NodeSnapshot,
  nodes: NodeSnapshot[],
): Finding[] {
  const output: Finding[] = [];
  const consumable = ["FRAME", "COMPONENT", "COMPONENT_SET"].includes(root.type);
  output.push(createFinding(
    "pipeline.consumable-root",
    "pipeline-readiness",
    4,
    root,
    root,
    consumable ? "pass" : "fail",
    "Consumable source target",
    consumable
      ? `The target is a ${root.type.toLocaleLowerCase("en-US")} that MCP/API consumers can address.`
      : `A ${root.type.toLocaleLowerCase("en-US")} is not an approved source-frame altitude.`,
    { nodeType: root.type },
    consumable ? {} : { hardBlocker: true },
  ));
  const knowledgeComplete = graph.complete && !graph.cancelled && graph.loadedPageCount === graph.pageCount;
  output.push(createFinding(
    "pipeline.file-knowledge",
    "pipeline-readiness",
    4,
    root,
    root,
    knowledgeComplete ? "pass" : "fail",
    "Complete file knowledge",
    knowledgeComplete
      ? `All ${graph.pageCount} pages were loaded into the design knowledge graph.`
      : `Only ${graph.loadedPageCount} of ${graph.pageCount} pages are indexed; certification is disabled.`,
    { pageCount: graph.pageCount, loadedPageCount: graph.loadedPageCount, cancelled: graph.cancelled },
    knowledgeComplete ? {} : { hardBlocker: true },
  ));
  output.push(createFinding(
    "pipeline.annotation",
    "pipeline-readiness",
    1,
    root,
    root,
    root.hasAnnotations ? "pass" : "fail",
    "Source annotation",
    root.hasAnnotations
      ? "The source frame has at least one annotation."
      : consumable
        ? "Add a concise source-of-truth annotation for downstream consumers."
        : "Convert or retarget this source to a frame or component before adding its source annotation.",
    { hasAnnotations: root.hasAnnotations, annotationSupported: consumable },
    root.hasAnnotations
      ? {}
      : consumable
        ? { fixability: "automatic", suggestedValue: { label: AI_SOURCE_FRAME_ANNOTATION } }
        : { fixability: "manual" },
  ));
  output.push(createFinding(
    "pipeline.dev-resource",
    "pipeline-readiness",
    1,
    root,
    root,
    root.devResourceCount > 0 ? "pass" : "needs-review",
    "Development resource",
    root.devResourceCount > 0
      ? `${root.devResourceCount} development resources are attached.`
      : "No development resource is attached; confirm whether a coded counterpart exists.",
    { devResourceCount: root.devResourceCount },
  ));
  const exported = nodes.filter((node) => node.exportSettings.length > 0);
  const badExports = exported.filter((node) => DEFAULT_LAYER_NAME.test(node.name) || /\s{2,}/.test(node.name));
  output.push(createFinding(
    "pipeline.export-names",
    "pipeline-readiness",
    1,
    root,
    badExports[0] ?? root,
    badExports.length === 0 ? "pass" : "fail",
    "Named export assets",
    badExports.length === 0
      ? "Exported assets use non-default names."
      : `${badExports.length} exported assets need stable semantic names.`,
    { exportedCount: exported.length, invalidNameCount: badExports.length },
  ));

  const coreComponents = new Map<string, { id: string; name: string }>();
  for (const node of nodes) {
    if (node.component && !["novel", "contextual", "none"].includes(resolvePattern(node.name).kind)) {
      coreComponents.set(node.id, { id: node.id, name: node.name });
    }
    if (
      node.instance?.mainComponentId
      && node.instance.mainComponentName
      && !["novel", "contextual", "none"].includes(resolvePattern(node.instance.mainComponentName).kind)
    ) {
      coreComponents.set(node.instance.mainComponentId, {
        id: node.instance.mainComponentId,
        name: node.instance.mainComponentName,
      });
    }
  }
  const connected = new Set(
    graph.codeConnect.filter((item) => item.verifiedForFile).map((item) => item.nodeId),
  );
  const unconnected = [...coreComponents.values()].filter((node) => !connected.has(node.id));
  const unconnectedNode = graph.nodes[unconnected[0]?.id ?? ""] ?? root;
  const codeConnectRequired = profile.requireCodeConnect === true;
  output.push(createFinding(
    "pipeline.code-connect",
    "pipeline-readiness",
    2,
    root,
    unconnectedNode,
    !codeConnectRequired || coreComponents.size === 0 ? "not-applicable" : unconnected.length === 0 ? "pass" : "fail",
    "Verified Code Connect evidence",
    !codeConnectRequired
      ? "Code Connect is not required by this file profile."
      : coreComponents.size === 0
      ? "No in-scope core components are defined or referenced in this target."
      : unconnected.length === 0
        ? "Every in-scope core component has verified Code Connect parse evidence."
        : `${unconnected.length} of ${coreComponents.size} core components lack verified Code Connect evidence; the grade is capped at B.`,
    { required: codeConnectRequired, coreComponentCount: coreComponents.size, unconnectedCount: unconnected.length },
  ));

  const certification = root.certification;
  const certificationCurrent = Boolean(
    certification
    && certification.knowledgeSnapshotHash === graph.snapshotHash
    && certification.rulesetVersion === RULESET_VERSION
    && certification.catalogVersion === CATALOG_VERSION,
  );
  output.push(createFinding(
    "pipeline.certification-freshness",
    "pipeline-readiness",
    1,
    root,
    root,
    !certification ? "not-applicable" : certificationCurrent ? "pass" : "needs-review",
    "Certification freshness",
    !certification
      ? "This target has not previously been certified."
      : certificationCurrent
        ? "The existing certificate matches the current knowledge snapshot and ruleset."
        : "The existing certificate is stale because the design snapshot, ruleset, or catalog changed.",
    { hasCertification: Boolean(certification), certificationCurrent },
  ));
  return output;
}
