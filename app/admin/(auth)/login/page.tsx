import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = { title: "Admin Login", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return <main className="grid min-h-screen place-items-center bg-black px-5 py-24 text-white"><div className="w-full max-w-md border border-white/10 bg-white/[.035] p-8 shadow-2xl sm:p-10"><div className="mb-10"><p className="text-xs font-bold uppercase tracking-[.25em] text-signal">STBS / Secure access</p><h1 className="mt-5 font-display text-5xl font-bold uppercase leading-none">Admin login</h1><p className="mt-4 text-sm leading-7 text-white/50">Sign in to manage the STBS administration area.</p></div><Suspense fallback={<div className="h-48 animate-pulse bg-white/5" />}><AdminLoginForm /></Suspense></div></main>;
}
