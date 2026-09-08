export interface RejectedCodeConnectEntry {
  index: number;
  reason: string;
}

export interface CodeConnectImportFeedback {
  tone: "success" | "error";
  message: string;
}

export function codeConnectImportFeedback(
  accepted: number,
  rejected: readonly RejectedCodeConnectEntry[],
): CodeConnectImportFeedback {
  const summary = `Accepted ${accepted} Code Connect entr${accepted === 1 ? "y" : "ies"}; rejected ${rejected.length}.`;
  if (rejected.length === 0) return { tone: "success", message: summary };

  const first = rejected[0];
  const detail = first ? ` Entry ${first.index + 1}: ${first.reason}` : "";
  return {
    tone: accepted === 0 ? "error" : "success",
    message: `${summary}${detail}`,
  };
}
