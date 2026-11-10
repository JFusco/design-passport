import { PRODUCER_IDENTITY } from "../core/build-info";
import type { ConductorEnvironment } from "./conductor-transport";

/** Fixed hosted origins; staging was reverified in the browser on 2026-11-10. */
export const CONDUCTOR_ENVIRONMENTS: readonly ConductorEnvironment[] = [
  ...(PRODUCER_IDENTITY.channel === "development" ? [{ id: "local", label: "Conductor local", origin: "http://localhost:3109" }] : []),
  { id: "production", label: "Conductor", origin: "https://conductor.verndale.com" },
  { id: "staging", label: "Conductor staging", origin: "https://ca-cos-conductor-shell-stg.bluewave-5fc9d211.eastus2.azurecontainerapps.io" },
];
