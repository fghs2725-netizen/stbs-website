import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth-edge";
import { verifyPortalToken } from "@/lib/portal-auth-edge";

function getAuthSecret(): string {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured.");
  return value;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = getAuthSecret();

  // ── Admin routes ──
  if (pathname.startsWith("/admin")) {
    const isLogin = pathname === "/admin/login";
    console.log("[Middleware Debug] Path: " + pathname);
    console.log("[Middleware Debug] Admin login page: " + isLogin);
    const session = await getSession(request.headers.get("cookie"), secret);
    console.log("[Middleware Debug] Session found: " + (!!session?.user));
    console.log("[Middleware Debug] Session role: " + (session?.user?.role || "NONE"));

    if (isLogin && session?.user) {
      console.log("[Middleware Debug] Decision: REDIRECT_ADMIN");
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (!isLogin && !session?.user) {
      console.log("[Middleware Debug] Decision: REDIRECT_LOGIN");
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(login);
    }
    console.log("[Middleware Debug] Decision: ALLOW");
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
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/api/portal/:path*", "/internal/:path*"],
};
