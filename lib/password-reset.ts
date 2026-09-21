import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { absolutePath } from "@/lib/site-url";
import { mailConfigured, sendMail } from "@/lib/mail";
import { newPasswordProblem } from "@/lib/password-policy";
import {
  hashToken,
  isExpired,
  issuedRecently,
  looksLikeToken,
  newRawToken,
  parseRecoveryAddress,
  resetEmail,
  resetIdentifier,
  tokenExpiry,
} from "@/lib/password-reset-core";

const BCRYPT_COST = 12;

/** Reset links go here and nowhere else: fixed on the server, never taken from the form. */
export const recoveryAddress = () => parseRecoveryAddress(process.env.ADMIN_RECOVERY_EMAIL);

/** Both halves are needed: somewhere safe to send it, and a way to send it. */
export const resetByEmailAvailable = () => Boolean(recoveryAddress()) && mailConfigured();

/** Only an active SUPER_ADMIN with a password can reset by email: the same accounts that can sign in. */
async function eligibleAccount(where: { email?: string; id?: string }) {
  const user = await prisma.user.findFirst({ where: { ...where, deletedAt: null }, include: { role: true } });
  return user && user.password && user.role?.name === "SUPER_ADMIN" ? user : null;
}

/**
 * Creates a token and emails the link, if the identifier belongs to an eligible account and no link was
 * sent in the last few minutes. Meant to run after the response has gone out (see the action), so that a
 * real account and an unknown one take the same time to answer.
 */
export async function issueReset(identifier: string): Promise<void> {
  const to = recoveryAddress();
  if (!to) return;
  const user = await eligibleAccount({ email: identifier });
  if (!user) { console.info("[Auth] Password reset requested for an unknown or ineligible account; nothing sent."); return; }

  const id = resetIdentifier(user.id);
  const existing = await prisma.verificationToken.findFirst({ where: { identifier: id }, orderBy: { expires: "desc" } });
  if (existing && !isExpired(existing.expires) && issuedRecently(existing.expires)) {
    console.info(`[Auth] Password reset for ${user.id} skipped: a link was sent within the cooldown.`);
    return;
  }

  const raw = newRawToken();
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: id } }),
    prisma.verificationToken.create({ data: { identifier: id, token: hashToken(raw), expires: tokenExpiry() } }),
  ]);

  const requestedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " IST";
  const mail = resetEmail({ link: absolutePath(`/admin/reset-password?token=${raw}`), account: user.email ?? "the admin account", requestedAt });
  const sent = await sendMail({ to, subject: mail.subject, text: mail.text, html: mail.html });
  if (!sent.ok) {
    // Remove the token so the cooldown does not lock the owner out of trying again once mail is fixed.
    await prisma.verificationToken.deleteMany({ where: { identifier: id } });
    console.error(`[Auth] Could not send the password reset email for ${user.id}: ${sent.error}`);
    return;
  }
  console.warn(`[Auth] Password reset link emailed for user ${user.id}`);
}

/** Looks a presented token up without using it. Null for anything malformed, unknown, expired or ineligible. */
export async function findResetToken(raw: unknown): Promise<{ userId: string; email: string | null } | null> {
  if (!looksLikeToken(raw)) return null;
  const row = await prisma.verificationToken.findUnique({ where: { token: hashToken(raw) } });
  if (!row || isExpired(row.expires) || !row.identifier.startsWith("pwreset:")) return null;
  const user = await eligibleAccount({ id: row.identifier.slice("pwreset:".length) });
  return user ? { userId: user.id, email: user.email } : null;
}

export type ResetResult = { ok: true } | { ok: false; error: string; expired?: boolean };

/**
 * Sets a new password from a reset link. The token is claimed with a single delete-and-count before anything
 * else happens, so two people (or two tabs) presenting it at once cannot both succeed. Changing the stored hash
 * also ends every signed-in session, on every device.
 */
export async function completeReset(raw: unknown, next: string, confirm: string): Promise<ResetResult> {
  const found = await findResetToken(raw);
  if (!found) return { ok: false, expired: true, error: "This link has expired or was already used." };

  const problem = newPasswordProblem({ next, confirm, email: found.email });
  if (problem) return { ok: false, error: problem };

  const hash = await bcrypt.hash(next, BCRYPT_COST);
  const done = await prisma.$transaction(async (tx) => {
    const claimed = await tx.verificationToken.deleteMany({ where: { token: hashToken(raw as string), expires: { gt: new Date() } } });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: found.userId }, data: { password: hash } });
    await tx.verificationToken.deleteMany({ where: { identifier: resetIdentifier(found.userId) } });
    return true;
  });
  if (!done) return { ok: false, expired: true, error: "This link has expired or was already used." };
  console.warn(`[Auth] Password reset completed for user ${found.userId}; existing sessions are now invalid`);
  return { ok: true };
}
