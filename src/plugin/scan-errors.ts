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

  const message = error instanceof Error ? error.message : String(error);
  return {
    type: "error",
    message: friendlyImportError(message),
  };
}

function friendlyImportError(message: string): string {
  if (/design-reference-pack failed JSON Schema validation|Reference pack is not valid JSON/iu.test(message)) {
    return "This file is not a valid Design Passport guide. Export a fresh pack from the local companion and try again.";
  }
  if (/Reference pack role must be/iu.test(message)) {
    return "This pack is meant for a different guidance option. Choose a project style-guide pack or a session reference pack as labeled.";
  }
  if (/digest does not match/iu.test(message)) {
    return "This pack changed after it was exported. Generate a fresh pack from the local companion and try again.";
  }
  if (/90 KB/iu.test(message)) return "This guidance pack is larger than the 90 KB safety limit. Ask the project lead to export a smaller pack.";
  if (/Unsafe (?:URL|email|local path)|Unsafe field/iu.test(message)) return "This pack contains information Design Passport cannot import safely. Ask the project lead to export a sanitized pack.";
  if (/does not contain actionable learnings/iu.test(message)) return "There are no actionable learnings to contribute from this review. Make or resolve a finding, then rescan before contributing.";
  return message;
}
