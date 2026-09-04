"use client";

import { useFormStatus } from "react-dom";

export function DuplicateQuotationButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="border border-white/20 min-h-[40px] inline-flex items-center px-4 py-2 text-xs uppercase disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Duplicating…" : "Duplicate"}
    </button>
  );
}
