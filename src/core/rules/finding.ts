import { SOURCES } from "../constants";
import type {
  Axis,
  Finding,
  FindingStatus,
  JsonValue,
  NodeSnapshot,
  Severity,
} from "../contracts";

type FindingInput = Omit<Finding, "id" | "sourceRefs" | "confidence" | "evidence"> & {
  evidence: Finding["evidence"];
  sourceRefs?: Finding["sourceRefs"];
  confidence?: number;
  discriminator?: string;
};

export type FindingOptions = Partial<Omit<
  FindingInput,
  "ruleId" | "axis" | "severity" | "rootId" | "nodeId" | "nodePath" | "status" | "title" | "message" | "evidence"
>>;

export function createFinding(
  ruleId: string,
  axis: Axis,
  severity: Severity,
  root: NodeSnapshot,
  node: NodeSnapshot,
  status: FindingStatus,
  title: string,
  message: string,
  measured: Record<string, JsonValue>,
  options: FindingOptions = {},
): Finding {
  const discriminator = options.discriminator ? `:${options.discriminator}` : "";
  const { discriminator: _ignored, ...rest } = options;
  return {
    ruleId,
    axis,
    severity,
    rootId: root.id,
    nodeId: node.id,
    nodePath: node.path,
    status,
    title,
    message,
    evidence: { summary: message, measured },
    fixability: options.fixability ?? "manual",
    ...rest,
    id: `${ruleId}:${root.id}:${node.id}${discriminator}`,
    sourceRefs: options.sourceRefs ?? [SOURCES.plugin],
    confidence: options.confidence ?? 1,
  };
}
