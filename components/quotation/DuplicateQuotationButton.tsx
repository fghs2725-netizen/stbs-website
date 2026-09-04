"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

export function DuplicateQuotationButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending} aria-disabled={pending}>
      {pending ? (
        "Duplicating…"
      ) : (
        <>
          <Copy className="size-4" />
          Duplicate
        </>
      )}
    </Button>
  );
}
