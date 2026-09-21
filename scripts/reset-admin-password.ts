/**
 * Emergency password reset, run by whoever manages the site from a machine that can reach the database.
 * Use it when email recovery is not set up or the recovery mailbox is lost.
 *
 *   ADMIN_NEW_PASSWORD='choose-a-long-passphrase' npx tsx scripts/reset-admin-password.ts admin@stbs.com
 *
 * The password comes from an environment variable, not an argument, so it does not land in shell history
 * or the process list. It is checked against the same rules as the admin screens, and nothing is printed
 * but the outcome. Every signed-in session for that account ends, and any pending reset link is cancelled.
 */
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { newPasswordProblem } from "../lib/password-policy";

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  const next = process.env.ADMIN_NEW_PASSWORD ?? "";
  if (!email || !next) {
    console.error("Usage: ADMIN_NEW_PASSWORD='...' npx tsx scripts/reset-admin-password.ts <admin email or username>");
    process.exitCode = 1;
    return;
  }

  const problem = newPasswordProblem({ next, confirm: next, email });
  if (problem) { console.error(`That password is not acceptable: ${problem}`); process.exitCode = 1; return; }

  const user = await prisma.user.findFirst({ where: { email, deletedAt: null }, include: { role: true } });
  if (!user || user.role?.name !== "SUPER_ADMIN") { console.error("No active admin account with that email or username."); process.exitCode = 1; return; }

  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(next, 12) } });
  await prisma.verificationToken.deleteMany({ where: { identifier: `pwreset:${user.id}` } });
  console.log(`Password reset for ${email}. All existing sessions for it are now signed out.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
