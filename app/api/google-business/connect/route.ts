import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { STATE_COOKIE, buildAuthUrl, gbpConfig, redirectUriFor } from "@/lib/google-business/config";

export const dynamic = "force-dynamic";

/** Admin -> Google Business -> Connect: sends the signed-in admin to Google's consent screen. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/admin/login?callbackUrl=/admin/google-business", request.url));

  const config = gbpConfig();
  if (!config) return NextResponse.redirect(new URL("/admin/google-business?error=not-configured", request.url));

  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(buildAuthUrl(config, redirectUriFor(request.nextUrl.origin, config), state));
  // Checked by the callback so a forged return from Google cannot connect someone else's account.
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/google-business",
    maxAge: 600,
  });
  return response;
}
