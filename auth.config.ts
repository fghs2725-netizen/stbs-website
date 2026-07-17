import type { NextAuthConfig } from "next-auth";

// Edge-safe configuration shared by middleware. Keep database adapters,
// password hashing, and other Node/server-only dependencies out of this file.
export default {
  trustHost: true,
  providers: [],
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
} satisfies NextAuthConfig;
