"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function AdminLogoutButton() {
  const [loading, setLoading] = useState(false);
  return <button type="button" disabled={loading} onClick={() => { setLoading(true); void signOut({ callbackUrl: "/admin/login" }); }} className="border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/65 transition hover:border-signal hover:text-signal disabled:opacity-50">{loading ? "Signing out…" : "Log out"}</button>;
}
