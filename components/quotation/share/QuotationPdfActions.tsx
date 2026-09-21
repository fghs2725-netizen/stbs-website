"use client";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestQuotationPdf } from "../requestQuotationPdf";
import type { QuotationState } from "../quotation-model";
import { ShareQuotation } from "./ShareQuotation";
import type { ShareSubject } from "./share-model";

/**
 * "PDF" and "Share" for a saved quotation, for pages that only have its id (the list and the detail page).
 * Both open the same sheet, where the file can be renamed first.
 */
export function QuotationPdfActions({ id, subject }: { id: string; subject: ShareSubject }) {
  // The PDF route reads the saved quotation by id, so nothing else needs to travel with the request.
  const getPdf = () => requestQuotationPdf({ id } as QuotationState);
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
