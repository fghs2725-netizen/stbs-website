"use server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { passwordProblem } from "@/lib/password-policy";

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

const BCRYPT_COST = 12; // matches the seed script, so every hash in the table costs the same to check

/**
 * Changes the signed-in admin's own password. Needs the current password even though you are signed in:
 * a stolen or left-open session alone must not be enough to lock the owner out.
 *
 * On success the stored hash changes, which ends every session issued before now (see password-fingerprint),
 * this one included. The form signs out and sends you to log in with the new password.
 */
export async function changePasswordAction(input: { current: string; next: string; confirm: string }): Promise<ChangePasswordResult> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return { ok: false, error: "Your session has ended. Sign in again, then change the password." };

  // The current-password check is a guessing oracle for anyone holding a live session, so it is limited too.
  const limit = await checkRateLimit(`change-password:${id}`, { windowMs: 15 * 60 * 1000, maxRequests: 5 });
  if (!limit.allowed) return { ok: false, error: "Too many attempts. Wait 15 minutes and try again." };

  const user = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: { id: true, email: true, password: true } });
  if (!user?.password) return { ok: false, error: "This account cannot change its password here." };

  const problem = passwordProblem({ current: input.current ?? "", next: input.next ?? "", confirm: input.confirm ?? "", email: user.email });
  if (problem) return { ok: false, error: problem };

  let correct = false;
  try { correct = await bcrypt.compare(input.current, user.password); } catch { correct = false; }
  if (!correct) {
    console.warn(`[Auth] Wrong current password while changing password for user ${user.id}`);
    return { ok: false, error: "The current password is not correct." };
  }

  const hash = await bcrypt.hash(input.next, BCRYPT_COST);
  await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
  // A reset link issued before this must not work afterwards.
  await prisma.verificationToken.deleteMany({ where: { identifier: `pwreset:${user.id}` } });
  console.warn(`[Auth] Password changed for user ${user.id}; existing sessions are now invalid`);
  return { ok: true };
}
