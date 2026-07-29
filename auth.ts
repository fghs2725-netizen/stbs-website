import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Admin credentials",
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const ip = request instanceof Request
          ? (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown")
          : "unknown";

        const rateLimitResult = await checkRateLimit(`admin-login:${ip}`, {
          windowMs: 15 * 60 * 1000,
          maxRequests: 5,
        });

        if (!rateLimitResult.allowed) {
          console.warn(`[Auth] Rate limit exceeded for admin login from IP: ${ip}`);
          return null;
        }

        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          console.warn("[Auth] Login attempt with empty email or password");
          return null;
        }

        const user = await prisma.user.findFirst({
          where: { email, deletedAt: null },
          include: { role: true },
        });

        if (!user) {
          console.warn(`[Auth] No active user found for email: ${email}`);
          return null;
        }

        if (!user.password) {
          console.warn(`[Auth] User ${email} has no password hash stored`);
          return null;
        }

        let valid = false;
        try {
          valid = await bcrypt.compare(password, user.password);
        } catch (e) {
          console.error(`[Auth] bcrypt.compare threw for ${email}:`, e);
          return null;
        }

        if (!valid) {
          console.warn(`[Auth] Invalid password for: ${email}`);
          return null;
        }

        const roleName = user.role?.name;
        if (roleName !== "SUPER_ADMIN") {
          console.warn(
            `[Auth] User ${email} has role "${roleName}" — only SUPER_ADMIN is permitted. Denying login.`
          );
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        console.log(`[Auth] Successful login: ${email} (role: ${roleName})`);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: roleName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || "SUPER_ADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as { role?: string }).role = (token.role as string) || "SUPER_ADMIN";
      }
      return session;
    },
  },
});
