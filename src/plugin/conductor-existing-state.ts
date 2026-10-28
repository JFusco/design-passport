import type { readExistingFrame } from "../figma/conductor-existing-frame";

export interface ExistingDestination {
  project: { id: string; name: string };
  deliverable: { id: string; name: string };
  component: { id: string; name: string };
  devices: { slug: string; width: number; hasDefault: boolean }[];
}
export interface ExistingFrameState {
  frame: ReturnType<typeof readExistingFrame>;
  query: { projectId?: string; deliverableId?: string; componentId?: string; search?: string };
  path?: { project: string; deliverable?: string };
  options: { id: string; name: string }[];
  more: boolean;
  destination?: ExistingDestination;
  details?: { variantName: string; isDefaultAppearance: boolean; deviceTargetSlug: string; message: string; annotationIds: string[] } | undefined;
  review?: { variantName: string; isDefaultAppearance: boolean; deviceTargetSlug: string; message: string; annotationIds: string[] } | undefined;
}
export type ExistingFrameCommand =
  | { type: "conductor-start-existing" }
  | { type: "conductor-existing-destination"; projectId?: string; deliverableId?: string; componentId?: string; search?: string }
  | { type: "conductor-review-existing"; variantName: string; isDefaultAppearance: boolean; deviceTargetSlug: string; message: string; annotationIds: string[] }
  | { type: "conductor-edit-existing" }
  | { type: "conductor-confirm-existing" }
  | { type: "conductor-open-existing-result" };

export function parseDestinationOptions(value: unknown): Pick<ExistingFrameState, "options" | "more" | "destination"> {
  if (!value || typeof value !== "object") throw new Error("Conductor returned an invalid destination list. Try again.");
  const data = value as Pick<ExistingFrameState, "options" | "more" | "destination">;
  const named = (item: { id: string; name: string }) => item && typeof item.id === "string" && item.id.length > 0 && item.id.length <= 200 && typeof item.name === "string" && item.name.length > 0 && item.name.length <= 200;
  if (!Array.isArray(data.options) || data.options.length > 100 || !data.options.every(named) || typeof data.more !== "boolean") throw new Error("Conductor returned an invalid destination list. Try again.");
  const target = data.destination;
  if (target && (!named(target.project) || !named(target.deliverable) || !named(target.component) || !Array.isArray(target.devices) || target.devices.length > 100 || !target.devices.every((device) => typeof device.slug === "string" && device.slug.length > 0 && device.slug.length <= 200 && Number.isFinite(device.width) && device.width > 0 && typeof device.hasDefault === "boolean"))) throw new Error("Conductor returned invalid project breakpoints. Try again.");
  return { options: data.options, more: data.more, ...(target ? { destination: target } : {}) };
}
