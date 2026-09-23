"use server";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPush, vapidPublicKey } from "@/lib/push";
import { CHALLENGE_COOKIE, registerPasskey, registrationOptions, relyingPartyFrom, type RegistrationResponse } from "@/lib/passkeys";

/** The phone app's settings on the Account page: enquiry notifications and Face ID. Signed in only. */

async function userId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// ─── Enquiry notifications ───────────────────────────────────────────────────

export async function pushPublicKeyAction(): Promise<string | null> {
  if (!(await userId())) return null;
  return vapidPublicKey();
}

export async function savePushSubscriptionAction(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent: string) {
  const id = await userId();
  if (!id) return { ok: false as const, error: "Your session has ended. Sign in again." };
  if (!/^https:\/\//.test(sub?.endpoint ?? "") || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false as const, error: "This device gave an invalid subscription." };
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId: id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent.slice(0, 300) },
    update: { userId: id, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent.slice(0, 300) },
  });
  return { ok: true as const };
}

export async function removePushSubscriptionAction(endpoint: string) {
  const id = await userId();
  if (!id) return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: id } });
}

export async function sendTestPushAction() {
  const id = await userId();
  if (!id) return { ok: false as const, error: "Your session has ended. Sign in again." };
  const r = await sendPush({ title: "STBS Admin", body: "Notifications are working. New enquiries will arrive like this.", url: "/admin/enquiries", tag: "test" }, { userId: id });
  return r.sent > 0 ? { ok: true as const } : { ok: false as const, error: "No device accepted the test. Turn notifications off and on again." };
}

// ─── Face ID ─────────────────────────────────────────────────────────────────

export async function passkeyRegistrationOptionsAction() {
  const id = await userId();
  if (!id) return { ok: false as const, error: "Your session has ended. Sign in again." };
  const { options, challengeId } = await registrationOptions(id, relyingPartyFrom(await headers()));
  (await cookies()).set(CHALLENGE_COOKIE, challengeId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 300 });
  return { ok: true as const, options };
}

export async function registerPasskeyAction(response: RegistrationResponse, deviceName: string) {
  const id = await userId();
  if (!id) return { ok: false as const, error: "Your session has ended. Sign in again." };
  const jar = await cookies();
  const result = await registerPasskey({ userId: id, challengeId: jar.get(CHALLENGE_COOKIE)?.value, response, deviceName, rp: relyingPartyFrom(await headers()) });
  jar.delete(CHALLENGE_COOKIE);
  if (result.ok) revalidatePath("/admin/account");
  return result;
}

export async function removePasskeyAction(passkeyId: string) {
  const id = await userId();
  if (!id) return;
  await prisma.passkey.deleteMany({ where: { id: passkeyId, userId: id } });
  revalidatePath("/admin/account");
}
