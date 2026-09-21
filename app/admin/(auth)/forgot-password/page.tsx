import type { Metadata } from "next";
import { AuthShell } from "@/components/admin/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/admin/auth/ForgotPasswordForm";
import { resetByEmailAvailable } from "@/lib/password-reset";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot your password?" description="We will email a link to choose a new one.">
      <ForgotPasswordForm available={resetByEmailAvailable()} />
    </AuthShell>
  );
}
