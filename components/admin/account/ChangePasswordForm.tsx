"use client";
import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { changePasswordAction } from "@/app/admin/(dashboard)/account/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

function PasswordField({ id, label, value, onChange, autoComplete, hint, show }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: string; show: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="a-label mb-1">{label}</label>
      <input id={id} name={id} type={show ? "text" : "password"} className="a-input" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required spellCheck={false} autoCapitalize="none" />
      {hint && <p className="mt-1 text-[0.75rem]" style={{ color: "var(--a-faint)" }}>{hint}</p>}
    </div>
  );
}

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || done) return;
    setError("");
    start(async () => {
      try {
        const r = await changePasswordAction({ current, next, confirm });
        if (!r.ok) { setError(r.error); return; }
        setDone(true);
        // The change ended this session along with every other one, so sign out cleanly rather than leave a dead page.
        window.setTimeout(() => void signOut({ redirectTo: "/admin/login?changed=1" }), 1400);
      } catch {
        setError("Could not change the password. Check your connection and try again.");
      }
    });
  };

  if (done) {
    return (
      <div role="status" className="rounded-[12px] p-4 text-[0.9375rem]" style={{ background: "var(--a-positive-soft)", color: "var(--a-positive)" }}>
        <p className="font-semibold">Password changed.</p>
        <p className="mt-1">Every device is being signed out. Taking you to the sign-in page…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <PasswordField id="current-password" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" show={show} />
      <PasswordField id="new-password" label="New password" value={next} onChange={setNext} autoComplete="new-password" show={show} hint={`At least ${MIN_PASSWORD_LENGTH} characters. A few ordinary words strung together works well and is easy to remember.`} />
      <PasswordField id="confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" show={show} />

      <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 text-[0.875rem]" style={{ color: "var(--a-muted)" }}>
        <input type="checkbox" className="size-4" style={{ accentColor: "var(--a-brand)" }} checked={show} onChange={(e) => setShow(e.target.checked)} />
        {show ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />} Show passwords
      </label>

      {error && <p role="alert" className="rounded-[10px] p-3 text-[0.875rem]" style={{ background: "var(--a-danger-soft)", color: "var(--a-danger)" }}>{error}</p>}

      <div>
        <button type="submit" className="a-btn a-btn-primary" disabled={pending || !current || !next || !confirm}>{pending ? "Changing…" : "Change password"}</button>
        <p className="mt-2 text-[0.75rem]" style={{ color: "var(--a-faint)" }}>Changing it signs you out everywhere, including this device.</p>
      </div>
    </form>
  );
}
