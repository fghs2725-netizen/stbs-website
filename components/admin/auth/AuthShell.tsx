import type { ReactNode } from "react";
import "@/app/admin/admin.css";

/** The centred card the sign-in, forgot-password and reset-password pages share. */
export function AuthShell({ eyebrow = "Secure access", title, description, children }: { eyebrow?: string; title: string; description?: string; children: ReactNode }) {
  return (
    <main className="theme-admin grid min-h-[100dvh] place-items-center px-5 py-16">
      <div className="a-card w-full max-w-[400px] p-8">
        <p className="a-eyebrow">{eyebrow}</p>
        <h1 className="a-title mt-2">{title}</h1>
        {description && <p className="a-sub mt-2">{description}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
