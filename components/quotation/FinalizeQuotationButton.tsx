"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Toaster, useToasts } from "./feedback";
import { finalizeAction } from "@/app/admin/(dashboard)/quotations/actions";

/**
 * Finalize from the quotation's own page, so it can be done on a phone: the editor's desktop rail,
 * which also has the button, is not shown on narrow screens.
 */
export function FinalizeQuotationButton({ id, ready }: { id: string; ready: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { toasts, push, dismiss } = useToasts();
  const run = () => start(async () => {
    try {
      await finalizeAction(id);
      setOpen(false);
      router.refresh();
    } catch {
      setOpen(false);
      push("error", "Could not finalize the quotation. Nothing was locked; try again.");
    }
  });
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} disabled={!ready} title={ready ? "Lock this quotation so an invoice can be raised from it" : "Complete the quotation first"}>
        <Lock className="size-4" /> Finalize
      </Button>
      {open && (
        <ConfirmDialog
          title="Finalize this quotation?"
          body="This locks it permanently and it cannot be edited afterwards. Need changes later? Duplicate it from the quotations list."
          confirmLabel="Finalize"
          busy={pending}
          onConfirm={run}
          onCancel={() => setOpen(false)}
        />
      )}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
