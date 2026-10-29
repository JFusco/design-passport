/** Canonical browser-safe v1 contract; pinned byte-for-byte in Design Passport. */
export const WORKSPACE_CONTRACT_VERSION = "1.0.0" as const;
export const WORKSPACE_LIMITS = {
  items: 8,
  sourceBytes: 5 * 1024 * 1024,
  sourcePixels: 24_000_000,
  nodes: 300,
  depth: 8,
  textLength: 1_000,
  totalText: 20_000,
  instructionBytes: 256 * 1024,
  width: 4_096,
  height: 16_384,
  annotations: 20,
  messageLength: 10_000,
  submissionBytes: 64 * 1024,
  leaseMs: 120_000,
  heartbeatMs: 30_000,
  tokenMs: 8 * 60 * 60 * 1_000,
  pairingMs: 10 * 60 * 1_000,
  pollMs: 5_000,
} as const;

export type WorkspaceRole = "section" | "reference" | "wireframe" | "design";
export type JobState =
  | "queued"
  | "generating"
  | "ready_for_canvas"
  | "claimed"
  | "applied"
  | "failed"
  | "cancelled";
export interface WorkspaceIdentity {
  organizationId: string;
  projectId: string;
  deliverableId: string;
  componentId: string;
  workspaceId: string;
  fileKey: string;
  connectionVersion: number;
}
export interface WorkspaceBinding extends WorkspaceIdentity {
  schemaVersion: 1;
  nodeId: string;
  role: WorkspaceRole;
  jobItemId: string;
  revision: number;
  elementId: string;
  variantId: string;
}
export interface NativeInstruction {
  id: string;
  kind: "container" | "text" | "rectangle" | "image" | "control";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  layout?: "vertical" | "horizontal";
  /** Bounded presentation values for native wireframes, not executable styles. */
  fontSize?: number;
  padding?: number;
  gap?: number;
  children?: NativeInstruction[];
}
export interface CanvasInstructions {
  contractVersion: typeof WORKSPACE_CONTRACT_VERSION;
  width: number;
  height: number;
  nodes: NativeInstruction[];
  warnings: string[];
}
export interface CanvasJob extends WorkspaceIdentity {
  id: string;
  revision: number;
  canonicalName: string;
  deviceLabel: string;
  sourceDigest: string;
  instructionDigest: string;
  generation: "complete" | "failed";
  instructions: CanvasInstructions;
  wireframeVariantId: string;
  designVariantId: string;
}
export interface WorkspaceLease {
  epoch: number;
  expiresAt: string;
}
export interface WorkspaceReceipt {
  jobItemId: string;
  connectionVersion: number;
  epoch: number;
  fileKey: string;
  instructionDigest: string;
  sectionNodeId: string;
  referenceNodeId: string;
  designNodeId: string;
  wireframeNodeId?: string;
  warnings: string[];
}
export interface PreparationRequest {
  requestId: string;
  expectedConnectionVersion: number;
  items: { componentId: string; screenshotVariantId: string; deviceTargetSlug: string }[];
}
export interface ExistingFrameDestination {
  projectId: string;
  deliverableId: string;
  frameName: string;
  variantName: string;
  isDefaultAppearance: boolean;
  frameWidth: number;
  deviceTargetSlug: string;
}
export interface DesignSubmission {
  existingFrame?: ExistingFrameDestination;
  submissionId: string;
  connectionVersion: number;
  componentId: string;
  fileKey: string;
  frames: { nodeId: string; variantId: string; expectedVariantVersion: number | null }[];
  message: string;
  annotations: { nodeId: string; text: string }[];
  transition?: { id: string; expectedWorkflowVersion: number };
}
export interface SubmissionResult {
  submissionId: string;
  commentId: string;
  variantIds: string[];
  transition: "not_requested" | "pending" | "applied" | "refused";
  notification: "pending" | "sent" | "failed" | "disabled";
  warnings: string[];
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected an object");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error("Unknown contract field");
}
function text(value: unknown, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error("Invalid contract text");
  return value;
}
function integer(value: unknown, min = 1): number {
  if (!Number.isSafeInteger(value) || Number(value) < min)
    throw new Error("Invalid contract integer");
  return Number(value);
}
export function assertContractVersion(
  value: unknown,
): asserts value is typeof WORKSPACE_CONTRACT_VERSION {
  if (value !== WORKSPACE_CONTRACT_VERSION)
    throw new Error("Unsupported Conductor contract version");
}
export function utf8Bytes(value: string): number {
  // Plugin sandbox does not supply TextEncoder.
  let bytes = 0;
  for (const char of value) {
    const point = char.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}
export function parsePreparation(value: unknown): PreparationRequest {
  const input = object(value);
  keys(input, ["requestId", "expectedConnectionVersion", "items"]);
  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > WORKSPACE_LIMITS.items
  )
    throw new Error("Select one to eight screenshots");
  const seen = new Set<string>();
  const items = input.items.map((entry) => {
    const item = object(entry);
    keys(item, ["componentId", "screenshotVariantId", "deviceTargetSlug"]);
    const result = {
      componentId: text(item.componentId),
      screenshotVariantId: text(item.screenshotVariantId),
      deviceTargetSlug: text(item.deviceTargetSlug),
    };
    const key = JSON.stringify([result.componentId, result.deviceTargetSlug]);
    if (seen.has(key)) throw new Error("Repeated component/device selection");
    seen.add(key);
    return result;
  });
  return {
    requestId: uuid(input.requestId),
    expectedConnectionVersion: integer(input.expectedConnectionVersion),
    items,
  };
}
export function uuid(value: unknown): string {
  const result = text(value, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result))
    throw new Error("Invalid request UUID");
  return result;
}
/** Strict executable allowlist, shared by the server and independent plugin validation. */
export function parseCanvasInstructions(value: unknown): CanvasInstructions {
  if (utf8Bytes(JSON.stringify(value)) > WORKSPACE_LIMITS.instructionBytes)
    throw new Error("Instructions exceed byte limit");
  const envelope = object(value);
  keys(envelope, ["contractVersion", "width", "height", "nodes", "warnings"]);
  assertContractVersion(envelope.contractVersion);
  const width = integer(envelope.width);
  const height = integer(envelope.height);
  if (width > WORKSPACE_LIMITS.width || height > WORKSPACE_LIMITS.height)
    throw new Error("Frame dimensions exceed limits");
  let count = 0;
  let characters = 0;
  const ids = new Set<string>();
  const parse = (
    value: unknown,
    depth: number,
    bounds: { width: number; height: number },
  ): NativeInstruction => {
    if (++count > WORKSPACE_LIMITS.nodes || depth > WORKSPACE_LIMITS.depth)
      throw new Error("Native node budget exceeded");
    const node = object(value);
    keys(node, [
      "id",
      "kind",
      "name",
      "x",
      "y",
      "width",
      "height",
      "text",
      "layout",
      "fontSize",
      "padding",
      "gap",
      "children",
    ]);
    const id = text(node.id);
    if (ids.has(id)) throw new Error("Duplicate element identity");
    ids.add(id);
    if (!["container", "text", "rectangle", "image", "control"].includes(String(node.kind)))
      throw new Error("Unknown native instruction");
    for (const key of ["x", "y", "width", "height"])
      if (typeof node[key] !== "number" || !Number.isFinite(node[key]))
        throw new Error("Invalid geometry");
    if (Number(node.width) < 1 || Number(node.height) < 1) throw new Error("Invalid dimensions");
    const x = Math.min(Math.max(0, Number(node.x)), bounds.width - 1);
    const y = Math.min(Math.max(0, Number(node.y)), bounds.height - 1);
    const result: NativeInstruction = {
      id,
      kind: node.kind as NativeInstruction["kind"],
      name: text(node.name),
      x,
      y,
      width: Math.min(Number(node.width), bounds.width - x),
      height: Math.min(Number(node.height), bounds.height - y),
    };
    if (node.text !== undefined) {
      if (node.kind !== "text" && node.kind !== "control")
        throw new Error("Text on non-text instruction");
      if (typeof node.text !== "string" || node.text.length > WORKSPACE_LIMITS.textLength)
        throw new Error("Text exceeds limit");
      characters += node.text.length;
      if (characters > WORKSPACE_LIMITS.totalText) throw new Error("Total text exceeds limit");
      if (node.kind === "control" && node.text) {
        if (++count > WORKSPACE_LIMITS.nodes || ids.has(`${id}:label`))
          throw new Error("Expanded control budget exceeded");
        ids.add(`${id}:label`);
      }
      result.text = node.text;
    }
    if (node.layout !== undefined) {
      if (node.kind !== "container" || !["vertical", "horizontal"].includes(String(node.layout)))
        throw new Error("Invalid layout");
      result.layout = node.layout as "vertical" | "horizontal";
    }
    for (const field of ["fontSize", "padding", "gap"] as const) {
      if (node[field] === undefined) continue;
      const value = node[field];
      const isText = node.kind === "text" || node.kind === "control";
      if (
        (field === "fontSize" ? !isText : node.kind !== "container" || !node.layout) ||
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < (field === "fontSize" ? 10 : 0) ||
        value > (field === "fontSize" ? 96 : 128)
      )
        throw new Error("Invalid native presentation");
      if (field === "padding" && value * 2 >= Math.min(result.width, result.height))
        throw new Error("Padding exceeds container dimensions");
      result[field] = value;
    }
    if (node.children !== undefined) {
      if (node.kind !== "container" || !Array.isArray(node.children))
        throw new Error("Invalid instruction children");
      result.children = node.children.map((child) => parse(child, depth + 1, result));
    }
    return result;
  };
  if (!Array.isArray(envelope.nodes)) throw new Error("Missing instructions");
  if (!Array.isArray(envelope.warnings) || envelope.warnings.length > 20)
    throw new Error("Invalid warnings");
  return {
    contractVersion: WORKSPACE_CONTRACT_VERSION,
    width,
    height,
    nodes: envelope.nodes.map((node) => parse(node, 1, { width, height })),
    warnings: envelope.warnings.map((warning) => text(warning, 1_000)),
  };
}
export function parseDesignSubmission(value: unknown): DesignSubmission {
  if (utf8Bytes(JSON.stringify(value)) > WORKSPACE_LIMITS.submissionBytes)
    throw new Error("Submission exceeds byte limit");
  const input = object(value);
  keys(input, [
    "submissionId",
    "connectionVersion",
    "componentId",
    "fileKey",
    "frames",
    "message",
    "annotations",
    "transition",
    "existingFrame",
  ]);
  if (
    !Array.isArray(input.frames) ||
    input.frames.length < 1 ||
    input.frames.length > 8 ||
    !Array.isArray(input.annotations) ||
    input.annotations.length > 20
  )
    throw new Error("Submission selection exceeds limits");
  if (typeof input.message !== "string" || input.message.length > WORKSPACE_LIMITS.messageLength)
    throw new Error("Invalid submission message");
  const seen = new Set<string>();
  const frames = input.frames.map((entry) => {
    const frame = object(entry);
    keys(frame, ["nodeId", "variantId", "expectedVariantVersion"]);
    const nodeId = text(frame.nodeId);
    const variantId = text(frame.variantId);
    if (seen.has(nodeId) || seen.has(variantId)) throw new Error("Repeated design frame");
    seen.add(nodeId);
    seen.add(variantId);
    return {
      nodeId,
      variantId,
      expectedVariantVersion:
        frame.expectedVariantVersion === null ? null : integer(frame.expectedVariantVersion, 0),
    };
  });
  const result: DesignSubmission = {
    submissionId: uuid(input.submissionId),
    connectionVersion: integer(input.connectionVersion),
    componentId: text(input.componentId),
    fileKey: text(input.fileKey),
    frames,
    message: input.message,
    annotations: input.annotations.map((entry) => {
      const annotation = object(entry);
      keys(annotation, ["nodeId", "text"]);
      return { nodeId: text(annotation.nodeId), text: text(annotation.text, 1_000) };
    }),
  };
  if (input.existingFrame !== undefined) {
    const target = object(input.existingFrame);
    keys(target, [
      "projectId",
      "deliverableId",
      "frameName",
      "deviceTargetSlug",
      "variantName",
      "isDefaultAppearance",
      "frameWidth",
    ]);
    if (
      frames.length !== 1 ||
      frames[0]!.expectedVariantVersion !== null ||
      input.transition !== undefined
    )
      throw new Error("Existing frame submissions create one new design without a workflow action");
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(result.fileKey) || !/^\d+:\d+$/.test(frames[0]!.nodeId))
      throw new Error("Invalid Figma frame identity");
    if (
      typeof target.isDefaultAppearance !== "boolean" ||
      typeof target.frameWidth !== "number" ||
      !Number.isFinite(target.frameWidth) ||
      target.frameWidth <= 0 ||
      target.frameWidth > WORKSPACE_LIMITS.width
    )
      throw new Error("Invalid frame appearance or width");
    result.existingFrame = {
      variantName: text(target.variantName),
      isDefaultAppearance: target.isDefaultAppearance,
      frameWidth: target.frameWidth,
      projectId: text(target.projectId),
      deliverableId: text(target.deliverableId),
      frameName: text(target.frameName),
      deviceTargetSlug: text(target.deviceTargetSlug),
    };
  }
  if (input.transition !== undefined) {
    const transition = object(input.transition);
    keys(transition, ["id", "expectedWorkflowVersion"]);
    result.transition = {
      id: text(transition.id),
      expectedWorkflowVersion: integer(transition.expectedWorkflowVersion, 0),
    };
  }
  return result;
}

export function parseWorkspaceReceipt(value: unknown): WorkspaceReceipt {
  const input = object(value);
  keys(input, [
    "jobItemId",
    "connectionVersion",
    "epoch",
    "fileKey",
    "instructionDigest",
    "sectionNodeId",
    "referenceNodeId",
    "designNodeId",
    "wireframeNodeId",
    "warnings",
  ]);
  const nodeId = (value: unknown) => {
    const id = text(value);
    if (!/^\d+:\d+$/.test(id)) throw new Error("Invalid Figma node identity");
    return id;
  };
  if (!Array.isArray(input.warnings) || input.warnings.length > 20)
    throw new Error("Invalid receipt warnings");
  const result: WorkspaceReceipt = {
    jobItemId: text(input.jobItemId),
    connectionVersion: integer(input.connectionVersion),
    epoch: integer(input.epoch),
    fileKey: text(input.fileKey),
    instructionDigest: text(input.instructionDigest, 64),
    sectionNodeId: nodeId(input.sectionNodeId),
    referenceNodeId: nodeId(input.referenceNodeId),
    designNodeId: nodeId(input.designNodeId),
    warnings: input.warnings.map((warning) => text(warning, 1_000)),
  };
  if (input.wireframeNodeId !== undefined) result.wireframeNodeId = nodeId(input.wireframeNodeId);
  const nodes = [
    result.sectionNodeId,
    result.referenceNodeId,
    result.designNodeId,
    ...(result.wireframeNodeId ? [result.wireframeNodeId] : []),
  ];
  if (new Set(nodes).size !== nodes.length)
    throw new Error("Workspace roles must use distinct nodes");
  return result;
}
