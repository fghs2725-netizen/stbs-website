import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { verifyPortalToken } from "@/lib/portal-auth";

const { auth } = NextAuth(authConfig);

export default auth(async (request: NextRequest & { auth?: any }, _context?: any) => {
  const { pathname } = request.nextUrl;

  // ── Admin routes ──
  if (pathname.startsWith("/admin")) {
    const isLogin = pathname === "/admin/login";

    if (isLogin && request.auth) return NextResponse.redirect(new URL("/admin", request.url));
    if (!isLogin && !request.auth) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(login);
    }
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  // ── Portal API routes (token auth) ──
  if (pathname.startsWith("/api/portal")) {
    if (pathname === "/api/portal/login") {
      return NextResponse.next();
    }
    const token = request.cookies.get("portal_token")?.value;
    const client = await verifyPortalToken(token);
    if (!client) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  // ── Portal pages (token auth) ──
  if (pathname.startsWith("/portal")) {
    if (pathname === "/portal/login") {
      return NextResponse.next();
    }
    const token = request.cookies.get("portal_token")?.value;
    const client = await verifyPortalToken(token);
    if (!client) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  // ── Internal routes (block external access) ──
  if (pathname.startsWith("/internal")) {
    const host = request.headers.get("host") || "";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
    if (!isLocalhost && !process.env.VERCEL) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/api/portal/:path*", "/internal/:path*"],
};
