/**
 * A deliberately small mail sender for the one job the admin needs: a password-reset email.
 *
 * It talks to Resend's HTTP API with fetch, so it adds no dependency. Configure with:
 *   RESEND_API_KEY   the API key
 *   MAIL_FROM        e.g. "STBS <noreply@stbs.in>" (SMTP_FROM is accepted too); the domain must be verified in Resend
 *
 * With no key, nothing is sent and callers are told, so the forgot-password page can say so plainly
 * instead of promising an email that will never arrive. For local testing only, MAIL_DEV_LOG=1 prints the
 * message to the server console (ignored in production).
 */

const fromAddress = () => (process.env.MAIL_FROM || process.env.SMTP_FROM || "").trim();
const devLog = () => process.env.NODE_ENV !== "production" && process.env.MAIL_DEV_LOG === "1";

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && fromAddress()) || devLog();
}

export type MailResult = { ok: true } | { ok: false; error: string };

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = fromAddress();

  if (!key || !from) {
    if (devLog()) {
      console.log(`[mail:dev] to=${to}\n[mail:dev] subject=${subject}\n${text}\n[mail:dev] end`);
      return { ok: true };
    }
    return { ok: false, error: "Mail is not configured (RESEND_API_KEY and MAIL_FROM)." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return { ok: false, error: `The mail service refused the message (${res.status}). ${detail}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Could not reach the mail service: ${(e as Error).message}` };
  }
}
