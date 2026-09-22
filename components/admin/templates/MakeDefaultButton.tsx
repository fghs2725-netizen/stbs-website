"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDefaultTemplateAction } from "@/app/admin/(dashboard)/quotations/templates/actions";

/** "Make default" from the list. Refreshes in place; a refusal (e.g. an archived template) is shown, not swallowed. */
export function MakeDefaultButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="a-btn a-btn-secondary a-btn-sm"
        disabled={pending}
        aria-label={`Make ${name} the default template`}
        onClick={() => start(async () => {
          setError("");
          const r = await setDefaultTemplateAction(id);
          if (!r.ok) setError(r.errors[0]); else router.refresh();
        })}
      >
        {pending ? "Setting…" : "Make default"}
      </button>
      {error && <span role="alert" className="text-[0.75rem]" style={{ color: "var(--a-danger)" }}>{error}</span>}
    </>
  );
}
