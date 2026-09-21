"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false, callbackUrl: searchParams.get("callbackUrl") || "/admin" });
    if (result?.error) {
      setError("Invalid login details. Please check your credentials and try again.");
      setLoading(false);
      return;
    }
    window.location.assign(result?.url || "/admin");
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
      {searchParams.get("changed") === "1" && (
        <p role="status" className="rounded-[10px] p-3 text-sm" style={{ background: "var(--a-positive-soft)", color: "var(--a-positive)" }}>Password changed. Sign in with the new one.</p>
      )}
      <div>
        <label htmlFor="admin-email" className="a-label mb-1">Email or username</label>
        <input id="admin-email" name="email" type="text" autoComplete="username" required className="a-input" />
      </div>
      <div>
        <label htmlFor="admin-password" className="a-label mb-1">Password</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required className="a-input" />
      </div>
      {error && (
        <p role="alert" className="rounded-[10px] p-3 text-sm" style={{ background: "var(--a-danger-soft)", color: "var(--a-danger)" }}>{error}</p>
      )}
      <button type="submit" disabled={loading} className="a-btn a-btn-primary w-full">
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
