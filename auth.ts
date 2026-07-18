import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

function normalizeConfiguredValue(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  if (normalized.length >= 2) {
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) return normalized.slice(1, -1).trim();
  }
  return normalized;
}

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
      async authorize(credentials) {
        const submittedEmail = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");
        const rawAdminEmail = process.env.ADMIN_EMAIL;
        const rawAdminHash = process.env.ADMIN_PASSWORD_HASH;
        const configuredIdentifier = normalizeConfiguredValue(rawAdminEmail).toLowerCase();
        const passwordHash = normalizeConfiguredValue(rawAdminHash);
        const identifier = submittedEmail.trim().toLowerCase();
        if (!identifier || !password || !configuredIdentifier || !passwordHash || identifier !== configuredIdentifier) {
          return null;
        }
        let bcryptCompareResult = false;
        try {
          bcryptCompareResult = await bcrypt.compare(password, passwordHash);
        } catch {
          return null;
        }
        return bcryptCompareResult ? { id: "admin", name: "STBS Administrator", email: configuredIdentifier } : null;
      },
    }),
  ],
});
