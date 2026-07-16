import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminLogoutButton } from "@/components/admin-logout-button";

export const metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return <main className="min-h-screen bg-black px-5 py-8 text-white lg:px-8"><div className="mx-auto max-w-7xl"><header className="flex items-center justify-between border-b border-white/10 pb-6"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-signal">STBS / Administration</p><h1 className="mt-3 font-display text-4xl font-bold uppercase">Dashboard</h1></div><AdminLogoutButton /></header><section className="grid gap-5 py-12 md:grid-cols-3"><div className="border border-white/10 bg-white/[.035] p-6"><p className="text-xs font-bold uppercase tracking-wider text-white/45">Signed in as</p><p className="mt-3 font-semibold">{session.user.email}</p></div><div className="border border-white/10 bg-white/[.035] p-6"><p className="text-xs font-bold uppercase tracking-wider text-white/45">Session</p><p className="mt-3 font-semibold text-signal">Active</p></div><div className="border border-white/10 bg-white/[.035] p-6"><p className="text-xs font-bold uppercase tracking-wider text-white/45">Next step</p><p className="mt-3 text-sm leading-6 text-white/65">Admin modules can be added behind this protected shell.</p></div></section></div></main>;
}
