"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { platformAuthenticatorIsAvailable, startAuthentication } from "@simplewebauthn/browser";
import { ScanFace } from "lucide-react";
import { passkeyLoginOptionsAction } from "@/app/admin/(auth)/login/actions";
import { biometricName } from "./device";

/** "Sign in with Face ID" on the login page. Shown only on devices that can do it. */
export function PasskeySignIn({ callbackUrl }: { callbackUrl: string }) {
  const [label, setLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    platformAuthenticatorIsAvailable().then((ok) => setLabel(ok ? biometricName() : null)).catch(() => setLabel(null));
  }, []);

  if (!label) return null;

  async function go() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const start = await passkeyLoginOptionsAction();
      if (!start.ok) throw new Error(start.error);
      const response = await startAuthentication(start.options);
      const result = await signIn("passkey", { response: JSON.stringify(response), redirect: false, callbackUrl });
      if (result?.error) throw new Error(`${label} sign-in didn't work. Use your password, then set ${label} up again from Account.`);
      window.location.assign(result?.url || "/admin");
    } catch (e) {
      const name = (e as Error).name;
      setError(name === "NotAllowedError" || name === "AbortError" ? "" : (e as Error).message || "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3 text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
        <span className="h-px flex-1" style={{ background: "var(--a-hairline)" }} /> or <span className="h-px flex-1" style={{ background: "var(--a-hairline)" }} />
      </div>
      <button type="button" onClick={go} disabled={busy} className="a-btn a-btn-secondary w-full">
        <ScanFace className="size-5" aria-hidden />
        {busy ? "Waiting for " + label + "…" : `Sign in with ${label}`}
      </button>
      {error && <p role="alert" className="rounded-[10px] p-3 text-sm" style={{ background: "var(--a-danger-soft)", color: "var(--a-danger)" }}>{error}</p>}
    </div>
  );
}
