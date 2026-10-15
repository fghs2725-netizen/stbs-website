/**
 * Download filenames: STBS-Invoice-{number}-{clientSlug}.pdf
 *
 * Matches the quotation's convention (STBS-Quotation-2026-27-0142-acme-pvt-ltd.pdf), which the owner
 * asked for, and reuses its slug so both documents name the same client the same way.
 */
import { clientSlug } from "@/lib/quotation-filename";
import { formatInvoiceNumber } from "@/lib/invoice-numbering";

export function invoiceFilename(
  invoice: { number?: number; isCash?: boolean; status?: string; date?: string; client: { companyName: string } },
  ext: "pdf" = "pdf",
): string {
  const number = invoice.number ? formatInvoiceNumber(invoice.number)
    : invoice.isCash && invoice.status !== "DRAFT" ? `cash-${invoice.date ?? ""}`.replace(/-$/, "")
    : "draft";
  return `STBS-Invoice-${number}-${clientSlug(invoice.client.companyName)}.${ext}`;
}
