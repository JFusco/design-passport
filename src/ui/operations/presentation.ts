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
