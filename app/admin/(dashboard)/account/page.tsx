import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { KNOWN_DEFAULT_PASSWORDS } from "@/lib/password-policy";
import { PageHeader } from "@/components/admin/PageHeader";
import { ChangePasswordForm } from "@/components/admin/account/ChangePasswordForm";
import { PhoneAppSettings } from "@/components/admin/app/PhoneAppSettings";

export const dynamic = "force-dynamic";

const when = (d: Date | null) => (d ? d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const user = await prisma.user.findFirst({ where: { id: session.user.id, deletedAt: null }, select: { name: true, email: true, password: true, lastLoginAt: true, passkeys: { orderBy: { createdAt: "desc" }, select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true } } } });
  if (!user) redirect("/admin/login");

  // Only this page pays for the check (bcrypt is deliberately slow): is the account still on a password that
  // is written in the project's own files? If so it is effectively public, and this says so plainly.
  let onDefault = false;
  if (user.password) {
    const results = await Promise.all(KNOWN_DEFAULT_PASSWORDS.map((d) => bcrypt.compare(d, user.password!).catch(() => false)));
    onDefault = results.some(Boolean);
  }

  return (
    <div className="a-page">
      <PageHeader eyebrow="Setup" title="Account & password" description="Who you are signed in as, the password that protects this admin, and the phone app's notifications and Face ID." />

      {onDefault && (
        <div role="alert" className="a-card flex gap-3 p-4 sm:p-5" style={{ background: "var(--a-danger-soft)" }}>
          <ShieldAlert size={22} aria-hidden className="mt-[2px] shrink-0" style={{ color: "var(--a-danger)" }} />
          <div>
            <p className="font-semibold" style={{ color: "var(--a-danger)" }}>You are still using the default password</p>
            <p className="mt-1 text-[0.9375rem]" style={{ color: "var(--a-ink)" }}>
              It is written in this project&apos;s files, so anyone who can read them can sign in as you. Change it below now.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <section className="a-card self-start p-4 sm:p-5" aria-labelledby="who-heading">
          <h2 id="who-heading" className="a-h2">Signed in as</h2>
          <dl className="mt-4 space-y-3 text-[0.9375rem]">
            <div><dt className="a-label">Name</dt><dd className="mt-[2px]" style={{ color: "var(--a-ink)" }}>{user.name || "—"}</dd></div>
            <div><dt className="a-label">Email or username</dt><dd className="mt-[2px] break-all" style={{ color: "var(--a-ink)" }}>{user.email || "—"}</dd></div>
            <div><dt className="a-label">Last sign-in</dt><dd className="a-num mt-[2px]" style={{ color: "var(--a-ink)" }}>{when(user.lastLoginAt)}</dd></div>
          </dl>
        </section>

        <section className="a-card p-4 sm:p-5" aria-labelledby="pw-heading">
          <h2 id="pw-heading" className="a-h2">Change password</h2>
          <p className="a-sub mb-4 mt-1">You will be asked for the current password, and every device is signed out afterwards.</p>
          <div className="max-w-[440px]"><ChangePasswordForm /></div>
        </section>
      </div>

      <PhoneAppSettings
        passkeys={user.passkeys.map((p) => ({ id: p.id, deviceName: p.deviceName, createdAt: p.createdAt.toISOString(), lastUsedAt: p.lastUsedAt?.toISOString() ?? null }))}
      />
    </div>
  );
}
