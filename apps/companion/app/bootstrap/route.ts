import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isConfigured, SESSION_COOKIE, validCapability } from "@/lib/server/runtime";

export function GET(request: NextRequest): NextResponse {
  const capability = request.nextUrl.searchParams.get("cap") ?? undefined;
  if (!isConfigured() || !validCapability(capability)) return new NextResponse("This companion link is invalid or expired.", { status: 403 });
  const destination = new URL("/", process.env.DESIGN_PASSPORT_EXPECTED_ORIGIN);
  const response = NextResponse.redirect(destination);
  response.cookies.set(SESSION_COOKIE, capability!, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
