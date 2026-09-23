export type CompanionErrorCode =
  | "busy"
  | "conflict"
  | "invalid-input"
  | "not-configured"
  | "not-found"
  | "unauthorized"
  | "upstream";

export class CompanionError extends Error {
  constructor(
    public readonly code: CompanionErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CompanionError";
  }
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof CompanionError) return error.message;
  if (error instanceof Error && error.name === "AbortError") return "Figma took too long to respond. Try again.";
  return "The companion could not complete this request. Try again.";
}
