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

  return <form onSubmit={submit} className="space-y-5" noValidate><div><label htmlFor="admin-email" className="text-xs font-bold uppercase tracking-wider text-white/60">Email or username</label><input id="admin-email" name="email" type="text" autoComplete="username" required className="field mt-2" /></div><div><label htmlFor="admin-password" className="text-xs font-bold uppercase tracking-wider text-white/60">Password</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required className="field mt-2" /></div>{error && <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}<button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center bg-signal px-5 text-xs font-extrabold uppercase tracking-wider text-black transition hover:bg-white disabled:cursor-wait disabled:opacity-60">{loading ? "Signing in…" : "Sign in"}</button></form>;
}
