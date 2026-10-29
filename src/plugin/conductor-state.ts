import type { ExistingFrameState, ExistingFrameCommand } from "./conductor-existing-state";
/** Presentation only. Bearer credentials and pairing proofs never cross to the UI. */
export interface ConductorPresentation {
  supportsDesignChanges?: boolean;
  recovery?: import("./conductor-pending-send").PendingSendPresentation;
  change?: import("./conductor-change-controller").DesignChangeState;
  redacted?: boolean;
  state: "offline" | "pairing" | "connected" | "unavailable" | "error";
  message: string;
  busy?: "choosing" | "connecting" | "refreshing" | "inspecting" | "submitting" | "preparing";
  hasError?: boolean;
  environments: { id: string; label: string }[];
  submission?: {
    retry?: { message: string; annotationIds: string[]; transitionId: string };
    componentName: string; frames: { id: string; name: string }[]; message: string;
    annotations: { id: string; text: string }[]; transitions: { id: string; label: string }[];
  };
  existing?: ExistingFrameState;
  existingResult?: string;
  userCode?: string;
  destination?: { project: string; deliverable: string; component?: string };
  jobs: { id: string; name: string; device: string; state: string; canApply: boolean }[];
}
export type ConductorCommand = ExistingFrameCommand | import("./conductor-change-controller").DesignChangeCommand
  | { type: "conductor-check-pending" | "conductor-request-resolution" | "conductor-resolve-pending" | "conductor-cancel-send" }
  | { type: "conductor-open" }
  | { type: "conductor-offline" }
  | { type: "conductor-connect"; environment: string }
  | { type: "conductor-disconnect" }
  | { type: "conductor-refresh" }
  | { type: "conductor-inspect-selection" }
  | { type: "conductor-submit"; message: string; annotationIds: string[]; transitionId: string }
  | { type: "conductor-apply"; jobId: string };
