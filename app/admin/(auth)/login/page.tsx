import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import "../../admin.css";

export const metadata: Metadata = { title: "Admin Login", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // A visitor who really is signed in goes straight to the admin. auth() also checks the session has not
  // been revoked, which the edge middleware cannot; a stale cookie just sees the form and signs in again.
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <main className="theme-admin grid min-h-[100dvh] place-items-center px-5 py-16">
      <div className="a-card w-full max-w-[400px] p-8">
        <p className="a-eyebrow">Secure access</p>
        <h1 className="a-title mt-2">Admin sign in</h1>
        <p className="a-sub mt-2">Manage quotations, clients and the site gallery.</p>
        <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-[10px]" style={{ background: "rgba(0,0,0,.05)" }} />}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </main>
  );
}
