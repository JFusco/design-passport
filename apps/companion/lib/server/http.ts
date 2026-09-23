import "server-only";

import { NextResponse } from "next/server";
import { CompanionError, safeErrorMessage } from "../../../../src/companion/errors";
import type { CompanionActionResult } from "../types";

export function success<T>(data: T, message?: string, status = 200): NextResponse<CompanionActionResult<T>> {
  return NextResponse.json({ ok: true, data, ...(message ? { message } : {}) }, { status });
}

export function failure(error: unknown): NextResponse<CompanionActionResult<never>> {
  const status = error instanceof CompanionError ? error.status : 500;
  const code = error instanceof CompanionError ? error.code : "internal";
  return NextResponse.json({ ok: false, error: { code, message: safeErrorMessage(error) } }, { status });
}
