"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { requestResetAction, type ForgotState } from "@/app/admin/(auth)/forgot-password/actions";

export function ForgotPasswordForm({ available }: { available: boolean }) {
  const [identifier, setIdentifier] = useState("");
  const [state, setState] = useState<ForgotState | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  if (!available || state === "unavailable") {
    return (
      <div>
        <p role="status" className="rounded-[10px] p-3 text-[0.9375rem]" style={{ background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
          Resetting a password by email is not set up on this site yet. Please contact the person who manages the site.
        </p>
        <p className="mt-6"><Link href="/admin/login" className="a-link text-[0.9375rem]">Back to sign in</Link></p>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div>
        <p role="status" className="rounded-[10px] p-3 text-[0.9375rem]" style={{ background: "var(--a-positive-soft)", color: "var(--a-positive)" }}>
          If that account exists, a reset link is on its way to the recovery email for this site. It works once and expires in 30 minutes.
        </p>
        <p className="mt-3 text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>Nothing arrived? Check spam, and wait a few minutes before asking again.</p>
        <p className="mt-6"><Link href="/admin/login" className="a-link text-[0.9375rem]">Back to sign in</Link></p>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        setFailed(false);
        start(async () => {
          try { setState(await requestResetAction(identifier)); } catch { setFailed(true); }
        });
      }}
    >
      <div>
        <label htmlFor="forgot-identifier" className="a-label mb-1">Email or username</label>
        <input id="forgot-identifier" name="identifier" type="text" autoComplete="username" required className="a-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoCapitalize="none" spellCheck={false} />
      </div>
      {state === "invalid" && <p role="alert" className="text-[0.875rem]" style={{ color: "var(--a-danger)" }}>Enter the email or username you sign in with.</p>}
      {state === "limited" && <p role="alert" className="text-[0.875rem]" style={{ color: "var(--a-danger)" }}>Too many requests. Wait 15 minutes and try again.</p>}
      {failed && <p role="alert" className="text-[0.875rem]" style={{ color: "var(--a-danger)" }}>Could not send the request. Check your connection and try again.</p>}
      <button type="submit" className="a-btn a-btn-primary w-full" disabled={pending || !identifier.trim()}>{pending ? "Sending…" : "Email me a reset link"}</button>
      <p className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>The link is sent to the recovery email set up for this site, not to an address you type here.</p>
      <p><Link href="/admin/login" className="a-link text-[0.9375rem]">Back to sign in</Link></p>
    </form>
  );
}
