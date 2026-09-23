export type CompanionActionResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string> } };
