import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { STATE_COOKIE, gbpConfig, redirectUriFor } from "@/lib/google-business/config";
import { exchangeCode, hasManageScope, isMissingTable, saveConnection } from "@/lib/google-business/connection";

export const dynamic = "force-dynamic";

const back = (request: NextRequest, query: string) => {
  const response = NextResponse.redirect(new URL(`/admin/google-business?${query}`, request.url));
  response.cookies.set(STATE_COOKIE, "", { path: "/api/google-business", maxAge: 0 });
  return response;
};

const sameState = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Google sends the admin back here after the consent screen. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/admin/login?callbackUrl=/admin/google-business", request.url));

  const config = gbpConfig();
  if (!config) return back(request, "error=not-configured");

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return back(request, "error=denied");

  const state = params.get("state") ?? "";
  const expected = request.cookies.get(STATE_COOKIE)?.value ?? "";
  const code = params.get("code");
  if (!state || !expected || !sameState(state, expected) || !code) return back(request, "error=state");

  try {
    const tokens = await exchangeCode(code, redirectUriFor(request.nextUrl.origin, config));
    if (!hasManageScope(tokens.scope)) return back(request, "error=scope");
    if (!tokens.refresh_token) return back(request, "error=no-refresh");
    await saveConnection({ ...tokens, refresh_token: tokens.refresh_token });
  } catch (e) {
    if (isMissingTable(e)) return back(request, "error=no-table");
    console.error("[google-business] connect failed:", e);
    return back(request, "error=exchange");
  }
  return back(request, "connected=1");
}
