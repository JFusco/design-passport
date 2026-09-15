import { AXES, type Axis, type ChangePlan, type FindingCategory, type Grade, type KnowledgeInsight, type ReadinessProfile, type ReadinessReport } from "../core/contracts";
import { hashValue } from "../core/stable";
import type { CapturedAuditTarget } from "../figma/adapter";
import type { Tab } from "../ui/types";
import type { KnowledgeSummary } from "./messages";

/** Only presentation preferences belong here; edits and action confirmations never persist. */
export interface AuditViewState {
  activeTab: Tab;
  showPassing: boolean;
  axisFilter: Axis | "all";
  categoryFilter?: FindingCategory | "all";
  pageFilter: string;
  rootFilter: string;
  variantFilter: string;
  expanded?: string;
}

export interface AuditSaveStatus {
  state: "saved" | "not-saved" | "session-only";
  message?: string;
}

export interface SavedAuditV1 {
  schemaVersion: 1;
  id: string;
  fileKey: string;
  targetKey: string;
  target: CapturedAuditTarget;
  savedAt: string;
  report: ReadinessReport;
  plans: ChangePlan[];
  knowledge: KnowledgeSummary;
  insights: KnowledgeInsight[];
  profile: ReadinessProfile;
  provenance: { pluginVersion: string; knowledgeVersion: string };
  viewState?: AuditViewState;
}

export type SaveAuditInput = Omit<SavedAuditV1, "schemaVersion" | "id" | "targetKey" | "savedAt">;

export interface SavedAuditSummary {
  id: string;
  target: CapturedAuditTarget;
  label: string;
  generatedAt: string;
  grade: Grade;
  lastViewedAt: string;
}

export function canonicalAuditTargetKey(target: CapturedAuditTarget): string {
  if (target.scope === "file") return "file";
  if (target.scope === "page") return `page:${target.pageId}`;
  return `selection:${hashValue([...new Set(target.nodeIds)].sort())}`;
}

export function isAuditViewState(value: unknown): value is AuditViewState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const view = value as Record<string, unknown>;
  const allowed = new Set(["activeTab", "showPassing", "axisFilter", "categoryFilter", "pageFilter", "rootFilter", "variantFilter", "expanded"]);
  return Object.keys(view).every((key) => allowed.has(key))
    && ["overview", "modules", "findings", "guidance", "cleanup", "context", "profile"].includes(String(view.activeTab))
    && typeof view.showPassing === "boolean"
    && (view.axisFilter === "all" || AXES.includes(view.axisFilter as Axis))
    && (view.categoryFilter === undefined || ["all", "requirement", "recommendation", "governance"].includes(String(view.categoryFilter)))
    && [view.pageFilter, view.rootFilter, view.variantFilter].every((item) => typeof item === "string" && item.length <= 500)
    && (view.expanded === undefined || typeof view.expanded === "string" && view.expanded.length <= 1_000);
}
