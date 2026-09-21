"use client";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareQuotation } from "@/components/quotation/share/ShareQuotation";
import type { ShareSubject } from "@/components/quotation/share/share-model";

/**
 * "PDF" and "Share" for an issued invoice. The sheet is the quotation's — it takes a subject and a
 * way to fetch the file, and neither is quotation-specific — so both documents behave the same way.
 */
export function InvoicePdfActions({ id, subject }: { id: string; subject: ShareSubject }) {
  // The PDF route reads the saved invoice by id, so nothing else travels with the request.
  const getPdf = async () => {
    const response = await fetch(`/api/invoices/${encodeURIComponent(id)}/pdf`);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      throw new Error(typeof body?.error === "string" ? body.error.slice(0, 180) : "Invoice PDF generation failed. Please try again.");
    }
    return response.blob();
  };

  return (
    <>
      <ShareQuotation intent="save" subject={subject} getPdf={getPdf} render={({ open }) => (
        <Button type="button" variant="secondary" size="sm" onClick={open}><Download className="size-4" />PDF</Button>
      )} />
      <ShareQuotation intent="share" subject={subject} getPdf={getPdf} render={({ open }) => (
        <Button type="button" variant="secondary" size="sm" onClick={open}><Share2 className="size-4" />Share</Button>
      )} />
    </>
  );
}
