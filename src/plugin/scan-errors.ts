import type { PluginToUiMessage } from "./messages";

export class ScanCancelledError extends Error {
  constructor() {
    super("Scan cancelled before whole-file knowledge was complete");
    this.name = "ScanCancelledError";
  }
}

export function pluginMessageForError(error: unknown): PluginToUiMessage {
  if (error instanceof ScanCancelledError) {
    return { type: "scan-cancelled" };
  }

  return {
    type: "error",
    message: error instanceof Error ? error.message : String(error),
  };
}
