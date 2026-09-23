import webpush from "web-push";
import { company } from "@/lib/company";
import { prisma } from "@/lib/prisma";

/**
 * Web Push for the admin app: enquiry notifications on the owner's phone.
 *
 * The VAPID key pair (the site's push identity) is generated the first time it is needed and kept in
 * the database, so there is no environment variable to set up. Replacing it would silently orphan
 * every existing subscription, so it is created once and never rotated here.
 */
async function vapidKeys() {
  const existing = await prisma.vapidKey.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  const generated = webpush.generateVAPIDKeys();
  try {
    return await prisma.vapidKey.create({ data: { id: "default", publicKey: generated.publicKey, privateKey: generated.privateKey } });
  } catch {
    // Another request created it first; use theirs so every subscription shares one identity.
    return prisma.vapidKey.findUniqueOrThrow({ where: { id: "default" } });
  }
}

export async function vapidPublicKey(): Promise<string> {
  return (await vapidKeys()).publicKey;
}

export type PushMessage = { title: string; body: string; url: string; tag?: string };

/**
 * Sends to every subscribed device of active users (or one user's devices). Subscriptions the push
 * service reports as gone (404/410) are removed. Returns how many devices accepted the message.
 */
export async function sendPush(message: PushMessage, only?: { userId: string }): Promise<{ sent: number; failed: number }> {
  const keys = await vapidKeys();
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { ...(only ? { userId: only.userId } : {}), user: { deletedAt: null } },
  });
  const payload = JSON.stringify(message);
  const options = {
    vapidDetails: { subject: `mailto:${company.email}`, publicKey: keys.publicKey, privateKey: keys.privateKey },
    TTL: 24 * 60 * 60,
    urgency: "high" as const,
  };

  let sent = 0;
  let failed = 0;
  await Promise.all(subscriptions.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, options);
      sent++;
      await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastSuccessAt: new Date() } }).catch(() => {});
    } catch (e) {
      failed++;
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      } else {
        console.error(`[push] send failed (${status ?? "no status"}):`, (e as Error).message);
      }
    }
  }));
  return { sent, failed };
}

/** The notification for a new website enquiry; tapping it opens the enquiry in the admin app. */
export async function notifyEnquiry(enquiryId: string): Promise<void> {
  const e = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
  if (!e) return;
  await sendPush({
    title: `New enquiry: ${e.service}`,
    body: [e.name, e.location].filter(Boolean).join(" · "),
    url: `/admin/enquiries/${e.id}`,
    tag: `enquiry-${e.id}`,
  });
}
