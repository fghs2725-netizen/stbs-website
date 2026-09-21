import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/admin/auth/AuthShell";
import { ResetPasswordForm } from "@/components/admin/auth/ResetPasswordForm";
import { findResetToken } from "@/lib/password-reset";
import { looksLikeToken } from "@/lib/password-reset-core";

// The link carries a secret in its query string, so it must never travel onward in a Referer header.
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valid = looksLikeToken(token) && (await findResetToken(token)) !== null;

  if (!valid) {
    return (
      <AuthShell title="This link no longer works">
        <p className="rounded-[10px] p-3 text-[0.9375rem]" style={{ background: "var(--a-danger-soft)", color: "var(--a-danger)" }}>
          It has expired, was already used, or is not complete. Links work once and last 30 minutes.
        </p>
        <p className="mt-6"><Link href="/admin/forgot-password" className="a-link text-[0.9375rem]">Ask for a new link</Link></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" description="Pick something you have not used elsewhere.">
      <ResetPasswordForm token={token!} />
    </AuthShell>
  );
}
