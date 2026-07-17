import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname } = request.nextUrl;
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
});

export const config = { matcher: ["/admin/:path*"] };
