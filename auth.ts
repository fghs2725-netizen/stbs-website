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
        let bcryptCompareResult = false;
        let bcryptError = false;
        let authorizeReturnedUser = false;

        const finishDiagnostics = () => {
          console.log("AUTH_DIAG_RESULT", JSON.stringify({
            submittedEmailPresent: Boolean(submittedEmail),
            submittedPasswordPresent: Boolean(password),
            adminEmailPresent: Boolean(rawAdminEmail),
            adminHashPresent: Boolean(rawAdminHash),
            adminEmailLength: rawAdminEmail?.length ?? 0,
            adminHashLength: rawAdminHash?.length ?? 0,
            adminHashValidPrefix: /^\$2[aby]\$/.test(passwordHash),
            emailMatchAfterNormalization: Boolean(identifier && configuredIdentifier && identifier === configuredIdentifier),
            bcryptCompareResult,
            bcryptError,
            authorizeReturnedUser,
          }));
        };

        if (!identifier || !password || !configuredIdentifier || !passwordHash || identifier !== configuredIdentifier) {
          finishDiagnostics();
          return null;
        }
        try {
          bcryptCompareResult = await bcrypt.compare(password, passwordHash);
        } catch {
          bcryptError = true;
          finishDiagnostics();
          return null;
        }
        if (!bcryptCompareResult) {
          finishDiagnostics();
          return null;
        }
        authorizeReturnedUser = true;
        finishDiagnostics();
        return { id: "admin", name: "STBS Administrator", email: configuredIdentifier };
      },
    }),
  ],
});
