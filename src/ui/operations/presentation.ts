import type { Finding, ReadinessProfile } from "../../core/contracts";

export function cloneProfile(profile: ReadinessProfile): ReadinessProfile {
  return JSON.parse(JSON.stringify(profile)) as ReadinessProfile;
}

export function gradeClass(letter: string): string {
  return `grade grade-${letter.toLocaleLowerCase("en-US")}`;
}

export function statusClass(status: Finding["status"]): string {
  return `status status-${status}`;
}

export function certificationNotice(
  count: number,
  target: "source frames" | "components",
  removedVariantAnnotations: number,
): string {
  const certified = `Certified ${count} ${target}.`;
  if (target !== "components") return certified;
  const noun = removedVariantAnnotations === 1 ? "annotation" : "annotations";
  return `${certified} Removed ${removedVariantAnnotations} legacy variant ${noun}.`;
}

export function relativeTime(value: string, now = Date.now()): string {
  const milliseconds = now - Date.parse(value);
  if (!Number.isFinite(milliseconds)) return value;
  const minutes = Math.max(0, Math.round(milliseconds / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

export function friendlyReference(value: string): string {
  const normalized = value.replace(/^[^:]+:/u, "").replace(/[^A-Za-z0-9]/gu, "").toLocaleUpperCase("en-US");
  const visible = normalized.slice(0, 8).padEnd(8, "0");
  return `${visible.slice(0, 4)}-${visible.slice(4)}`;
}

export function humanizeIdentifier(value: string): string {
  const label = value.replace(/^[^:]+:/u, "").replace(/styleguide/giu, "style guide").replace(/[._-]+/gu, " ").trim();
  return label.replace(/\bui\b/giu, "UI").replace(/\b\w/gu, (character) => character.toLocaleUpperCase("en-US"));
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
