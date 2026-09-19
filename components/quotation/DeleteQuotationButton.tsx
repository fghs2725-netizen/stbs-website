"use client";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Toaster, useToasts } from "./feedback";
import { deleteAction } from "@/app/admin/(dashboard)/quotations/actions";

export function DeleteQuotationButton({ id, reference, status }: { id: string; reference: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { toasts, push, dismiss } = useToasts();
  const run = () => start(async () => {
    try { await deleteAction(id); push("success", `${reference} deleted.`); }
    catch { push("error", "Could not delete the quotation. Nothing was changed."); }
    finally { setOpen(false); }
  });
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)} aria-label={`Delete ${reference}`}><Trash2 className="size-4" />Delete</Button>
      {open && (
        <ConfirmDialog
          title={`Delete ${reference}?`}
          body={status === "FINAL" ? "This is a finalized quotation. It will be removed from the list; the record is kept in the database." : "This draft will be removed from the list; the record is kept in the database."}
          confirmLabel="Delete quotation"
          destructive
          busy={pending}
          onConfirm={run}
          onCancel={() => setOpen(false)}
        />
      )}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
