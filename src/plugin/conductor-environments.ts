import { PRODUCER_IDENTITY } from "../core/build-info";
import type { ConductorEnvironment } from "./conductor-transport";

/** Verified from deployed non-secret COS_PUBLIC_BASE_URL values on 2026-10-27. */
export const CONDUCTOR_ENVIRONMENTS: readonly ConductorEnvironment[] = [
  ...(PRODUCER_IDENTITY.channel === "development" ? [{ id: "local", label: "Conductor local", origin: "http://localhost:3109" }] : []),
  { id: "production", label: "Conductor", origin: "https://conductor.verndale.com" },
  { id: "staging", label: "Conductor staging", origin: "https://ca-cumulative-os-shell.redhill-26044d68.eastus2.azurecontainerapps.io" },
];
