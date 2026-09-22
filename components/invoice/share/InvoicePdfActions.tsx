"use client";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareQuotation } from "@/components/quotation/share/ShareQuotation";
import type { ShareSubject } from "@/components/quotation/share/share-model";

type Props = {
  id: string;
  subject: ShareSubject;
  /**
   * Run before the file is fetched. The editor passes its save here, because the PDF route reads the
   * stored invoice: without this, exporting from the preview would quietly return the last save
   * rather than what is on screen.
   */
  beforePdf?: () => Promise<void>;
  /** Shown but inert — a draft has no number, and the PDF route refuses one. */
  disabled?: boolean;
  /** Why the buttons are inert, as their tooltip. */
  disabledReason?: string;
  /** "PDF" on its own reads oddly next to Share outside the document toolbar. */
  saveLabel?: string;
};

/**
 * "PDF" and "Share" for an issued invoice. The sheet is the quotation's — it takes a subject and a
 * way to fetch the file, and neither is quotation-specific — so both documents behave the same way.
 */
export function InvoicePdfActions({ id, subject, beforePdf, disabled, disabledReason, saveLabel = "PDF" }: Props) {
  // The PDF route reads the saved invoice by id, so nothing else travels with the request.
  const getPdf = async () => {
    if (beforePdf) await beforePdf();
    const response = await fetch(`/api/invoices/${encodeURIComponent(id)}/pdf`);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      throw new Error(typeof body?.error === "string" ? body.error.slice(0, 180) : "Invoice PDF generation failed. Please try again.");
    }
    return response.blob();
  };

  if (disabled) {
    return (
      <>
        <Button type="button" variant="secondary" size="sm" disabled title={disabledReason}><Download className="size-4" />{saveLabel}</Button>
        <Button type="button" variant="secondary" size="sm" disabled title={disabledReason}><Share2 className="size-4" />Share</Button>
      </>
    );
  }

  return (
    <>
      <ShareQuotation intent="save" subject={subject} getPdf={getPdf} render={({ open }) => (
        <Button type="button" variant="secondary" size="sm" onClick={open}><Download className="size-4" />{saveLabel}</Button>
      )} />
      <ShareQuotation intent="share" subject={subject} getPdf={getPdf} render={({ open }) => (
        <Button type="button" variant="secondary" size="sm" onClick={open}><Share2 className="size-4" />Share</Button>
      )} />
    </>
  );
}
