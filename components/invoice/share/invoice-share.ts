/**
 * Sharing an invoice. The sheet, the WhatsApp and mail links and the file-name handling are the
 * quotation's — only the subject differs, so there is one share experience, not two that drift.
 *
 * Pure (no browser, no network).
 */
import { calcInvoiceTotals, type InvoiceState } from "../invoice-model";
import type { InvoiceSettings } from "../invoice-settings";
import { formatInvoiceNumber } from "@/lib/invoice-numbering";
import { friendlyCompany, type ShareSubject } from "@/components/quotation/share/share-model";
import { company } from "@/lib/company";

const DATE = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const showDate = (value?: string) => {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : DATE.format(d);
};

/**
 * Builds the share subject for an invoice. `totals` may be passed when they are already to hand
 * (a list row), so the figures are not computed twice.
 */
export function shareSubjectFromInvoice(
  inv: Pick<InvoiceState, "number" | "client" | "dueDate" | "subject" | "items" | "discountType" | "discountValue" | "gstEnabled" | "gstMode" | "gstRate" | "payments">,
  settings: InvoiceSettings,
  totals?: { grandTotal: number; balance: number },
): ShareSubject {
  const t = totals ?? calcInvoiceTotals(inv as InvoiceState, settings);
  return {
    kind: "invoice",
    reference: inv.number ? formatInvoiceNumber(inv.number) : "",
    clientName: inv.client.companyName?.trim() ?? "",
    contact: inv.client.contactPerson?.trim() || undefined,
    phone: inv.client.phone?.trim() || undefined,
    email: inv.client.email?.trim() || undefined,
    service: inv.subject?.trim() || undefined,
    total: t.grandTotal,
    balance: t.balance,
    dueDate: showDate(inv.dueDate),
    company: friendlyCompany(company.name),
    signatory: company.managingDirector,
    signatoryTitle: "Managing Director",
    phones: company.phones.join(", "),
  };
}
