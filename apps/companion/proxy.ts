import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest): NextResponse {
  const expectedOrigin = process.env.DESIGN_PASSPORT_EXPECTED_ORIGIN;
  if (expectedOrigin) {
    const expected = new URL(expectedOrigin);
    if (request.headers.get("host") !== expected.host) return new NextResponse("Forbidden", { status: 403 });
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.headers.get("origin") !== expected.origin) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const nonce = Buffer.from(randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ""}`,
    "connect-src 'self'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico).*)" }],
};
