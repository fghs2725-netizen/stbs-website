"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/admin/(auth)/reset-password/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

export function ResetPasswordForm({ token }: { token: string }) {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p role="status" className="rounded-[10px] p-3 text-[0.9375rem]" style={{ background: "var(--a-positive-soft)", color: "var(--a-positive)" }}>
        Password changed. Taking you to sign in…
      </p>
    );
  }
  if (expired) {
    return (
      <div>
        <p role="alert" className="rounded-[10px] p-3 text-[0.9375rem]" style={{ background: "var(--a-danger-soft)", color: "var(--a-danger)" }}>{error}</p>
        <p className="mt-6"><Link href="/admin/forgot-password" className="a-link text-[0.9375rem]">Ask for a new link</Link></p>
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
        setError("");
        start(async () => {
          try {
            const r = await resetPasswordAction({ token, next, confirm });
            if (r.ok) { setDone(true); window.setTimeout(() => window.location.assign("/admin/login?changed=1"), 1200); return; }
            setError(r.error);
            if (r.expired) setExpired(true);
          } catch { setError("Could not change the password. Check your connection and try again."); }
        });
      }}
    >
      <div>
        <label htmlFor="reset-new" className="a-label mb-1">New password</label>
        <input id="reset-new" type={show ? "text" : "password"} className="a-input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required spellCheck={false} autoCapitalize="none" />
        <p className="mt-1 text-[0.75rem]" style={{ color: "var(--a-faint)" }}>At least {MIN_PASSWORD_LENGTH} characters. A few ordinary words strung together works well.</p>
      </div>
      <div>
        <label htmlFor="reset-confirm" className="a-label mb-1">Confirm new password</label>
        <input id="reset-confirm" type={show ? "text" : "password"} className="a-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required spellCheck={false} autoCapitalize="none" />
      </div>
      <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 text-[0.875rem]" style={{ color: "var(--a-muted)" }}>
        <input type="checkbox" className="size-4" style={{ accentColor: "var(--a-brand)" }} checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
      </label>
      {error && <p role="alert" className="rounded-[10px] p-3 text-[0.875rem]" style={{ background: "var(--a-danger-soft)", color: "var(--a-danger)" }}>{error}</p>}
      <button type="submit" className="a-btn a-btn-primary w-full" disabled={pending || !next || !confirm}>{pending ? "Changing…" : "Set new password"}</button>
      <p className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>This signs you out on every device.</p>
    </form>
  );
}
