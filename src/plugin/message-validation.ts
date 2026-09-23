import type { JsonValue, ReadinessProfile, TokenCoverageDisposition, TokenCoverageField, TokenCoverageReason } from "../core/contracts";
import { isBindableField } from "../core/operations/planning";
import { normalizeReadinessProfile } from "../core/profile";
import { utf8ByteLength } from "../core/stable";
import type { UiToPluginMessage } from "./messages";
import { isAuditViewState } from "./audit-state";

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function text(value: unknown, field: string, maximum = 500): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum) throw new Error(`${field} must be a non-empty string of at most ${maximum} characters`);
  return value;
}

function profile(value: unknown): ReadinessProfile {
  const normalized = normalizeReadinessProfile(value);
  if (!normalized) throw new Error("profile is invalid");
  return normalized;
}

function jsonValue(value: unknown, depth = 0, ancestors = new Set<object>()): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || depth >= 12 || ancestors.has(value)) return false;
  ancestors.add(value);
  const valid = Array.isArray(value)
    ? value.length <= 1_000 && value.every((item) => jsonValue(item, depth + 1, ancestors))
    : Object.keys(value).length <= 1_000 && Object.values(value as Record<string, unknown>).every((item) => jsonValue(item, depth + 1, ancestors));
  ancestors.delete(value);
  return valid;
}

const TOKEN_COVERAGE_DISPOSITIONS = new Set<TokenCoverageDisposition>(["bound", "inherited", "ignored", "missing"]);
const TOKEN_COVERAGE_REASONS = new Set<TokenCoverageReason>([
  "variable", "text-style", "component-instance", "not-rendered", "inert-default", "not-owner",
  "unresolved-style", "mixed", "unsupported-unit", "documentation-scaffold", "unbound",
]);

export function parseUiMessage(value: unknown): UiToPluginMessage {
  const message = record(value);
  if (!message || typeof message.type !== "string") throw new Error("Plugin message must be an object with a type");
  if (message.type === "initialize" || message.type === "refresh-audit" || message.type === "cancel-scan" || message.type === "certify" || message.type === "certify-components"
    || message.type === "remove-project-style-guide" || message.type === "clear-session-references" || message.type === "preview-contribution"
    || message.type === "clear-file-cache") return { type: message.type };
  if (message.type === "open-saved-audit" || message.type === "forget-saved-audit") return { type: message.type, id: text(message.id, "id", 1_000) };
  if (message.type === "save-audit-view") {
    if (!isAuditViewState(message.viewState)) throw new Error("Saved audit view is invalid");
    return { type: message.type, id: text(message.id, "id", 1_000), viewState: message.viewState };
  }
  if (message.type === "audit-pages") {
    if (!Array.isArray(message.pageIds) || message.pageIds.length === 0 || message.pageIds.length > 1_000) throw new Error("Choose between 1 and 1,000 pages");
    const pageIds = message.pageIds.map((id) => text(id, "pageId", 200));
    if (new Set(pageIds).size !== pageIds.length) throw new Error("Page IDs must be distinct");
    return { type: message.type, pageIds };
  }
  if (message.type === "save-profile") return { type: message.type, profile: profile(message.profile) };
  if (message.type === "recheck-audit") {
    const request = record(message.request);
    if (!request) throw new Error("recheck request is invalid");
    if ((request.mode === "changes" || request.mode === "full") && Object.keys(request).length === 1) {
      return { type: message.type, request: { mode: request.mode } };
    }
    if (request.mode === "component" && Object.keys(request).every((key) => key === "mode" || key === "componentId")) {
      return { type: message.type, request: { mode: "component", componentId: text(request.componentId, "componentId", 200) } };
    }
    if (request.mode === "issue" && Object.keys(request).every((key) => key === "mode" || key === "issueId")) {
      return { type: message.type, request: { mode: "issue", issueId: text(request.issueId, "issueId", 500) } };
    }
    throw new Error("recheck request is invalid");
  }
  if (message.type === "scan") {
    const request = record(message.request);
    if (!request || Object.keys(request).some((key) => key !== "scope" && key !== "refreshKnowledge")
      || !["selection", "page", "file"].includes(String(request.scope)) || typeof request.refreshKnowledge !== "boolean") throw new Error("scan request is invalid");
    return { type: "scan", request: { scope: request.scope as "selection" | "page" | "file", refreshKnowledge: request.refreshKnowledge } };
  }
  if (message.type === "navigate") return { type: message.type, nodeId: text(message.nodeId, "nodeId", 200) };
  if (message.type === "token-coverage-page") {
    const request = record(message.request);
    if (!request || Object.keys(request).some((key) => !["requestId", "reportHash", "rootIds", "disposition", "field", "reason", "offset", "limit"].includes(key))) {
      throw new Error("token coverage page request is invalid");
    }
    if (!Array.isArray(request.rootIds) || request.rootIds.length === 0 || request.rootIds.length > 1_000) throw new Error("token coverage rootIds are invalid");
    const rootIds = request.rootIds.map((id) => text(id, "rootId", 200));
    if (new Set(rootIds).size !== rootIds.length) throw new Error("token coverage rootIds must be distinct");
    if (!TOKEN_COVERAGE_DISPOSITIONS.has(request.disposition as TokenCoverageDisposition)) throw new Error("token coverage disposition is invalid");
    if (!(request.field === "effects" || isBindableField(request.field))) throw new Error("token coverage field is invalid");
    if (!TOKEN_COVERAGE_REASONS.has(request.reason as TokenCoverageReason)) throw new Error("token coverage reason is invalid");
    if (!Number.isInteger(request.offset) || Number(request.offset) < 0 || Number(request.offset) > 10_000_000) throw new Error("token coverage offset is invalid");
    if (!Number.isInteger(request.limit) || Number(request.limit) < 1 || Number(request.limit) > 50) throw new Error("token coverage limit is invalid");
    return {
      type: message.type,
      request: {
        requestId: text(request.requestId, "requestId", 500),
        reportHash: text(request.reportHash, "reportHash", 200),
        rootIds,
        disposition: request.disposition as TokenCoverageDisposition,
        field: request.field as TokenCoverageField,
        reason: request.reason as TokenCoverageReason,
        offset: Number(request.offset),
        limit: Number(request.limit),
      },
    };
  }
  if (message.type === "apply-plan") {
    if (typeof message.undoOnlyAcknowledged !== "boolean") throw new Error("undoOnlyAcknowledged must be boolean");
    return { type: message.type, planId: text(message.planId, "planId", 300), undoOnlyAcknowledged: message.undoOnlyAcknowledged };
  }
  if (message.type === "apply-all") {
    if (typeof message.undoOnlyAcknowledged !== "boolean") throw new Error("undoOnlyAcknowledged must be boolean");
    if (!Array.isArray(message.planIds) || message.planIds.length === 0 || message.planIds.length > 100) throw new Error("planIds must contain between 1 and 100 plans");
    const planIds = message.planIds.map((planId) => text(planId, "planId", 300));
    if (new Set(planIds).size !== planIds.length) throw new Error("planIds must be distinct");
    return { type: message.type, planIds, undoOnlyAcknowledged: message.undoOnlyAcknowledged };
  }
  if (message.type === "import-project-style-guide" || message.type === "add-session-reference") {
    if (typeof message.raw !== "string" || utf8ByteLength(message.raw) > 90_000) {
      throw new Error("Reference pack JSON must be a string no larger than 90 KB");
    }
    return { type: message.type, raw: message.raw };
  }
  if (message.type === "export-contribution") return { type: message.type, digest: text(message.digest, "digest", 40) };
  if (message.type === "export") {
    if (message.format !== "json" && message.format !== "markdown") throw new Error("export format is invalid");
    return { type: message.type, format: message.format };
  }
  if (message.type === "waive") return { type: message.type, findingId: text(message.findingId, "findingId", 500), reason: text(message.reason, "reason", 500) };
  if (message.type === "clear-waiver" || message.type === "acknowledge-detachment" || message.type === "clear-detachment-acknowledgement") return { type: message.type, findingId: text(message.findingId, "findingId", 500) };
  if (message.type === "confirm-pattern") return { type: message.type, findingId: text(message.findingId, "findingId", 500), canonicalName: text(message.canonicalName, "canonicalName", 200) };
  if (message.type === "create-token") {
    if (!isBindableField(message.field)) throw new Error("token field is invalid");
    if (!Array.isArray(message.nodeIds) || message.nodeIds.length < 3 || message.nodeIds.length > 10_000 || message.nodeIds.some((id) => typeof id !== "string" || !id || id.length > 200)) {
      throw new Error("token nodeIds must contain between 3 and 10,000 node IDs");
    }
    if (new Set(message.nodeIds).size !== message.nodeIds.length) throw new Error("token nodeIds must be distinct");
    if (!jsonValue(message.rawValue)) throw new Error("token rawValue must be finite JSON data");
    return {
      type: message.type,
      collectionId: text(message.collectionId, "collectionId", 200),
      name: text(message.name, "name", 300),
      field: message.field,
      nodeIds: message.nodeIds,
      rawValue: message.rawValue,
    };
  }
  throw new Error(`Unsupported plugin message type: ${message.type.slice(0, 100)}`);
}
