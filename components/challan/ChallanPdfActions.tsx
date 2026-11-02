"use client";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareQuotation } from "@/components/quotation/share/ShareQuotation";
import type { ShareSubject } from "@/components/quotation/share/share-model";

/** "PDF" and "Share" for a saved challan, through the same sheet quotations and invoices use. */
export function ChallanPdfActions({ id, subject, beforePdf }: { id: string; subject: ShareSubject; beforePdf?: () => Promise<void> }) {
  const getPdf = async () => {
    if (beforePdf) await beforePdf();
    const response = await fetch(`/api/challans/${encodeURIComponent(id)}/pdf`);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      throw new Error(typeof body?.error === "string" ? body.error.slice(0, 180) : "Delivery challan PDF generation failed. Please try again.");
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
