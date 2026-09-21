"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  cancelInvoice, convertQuotationToInvoice, deleteInvoice, deletePayment,
  duplicateInvoice, issueInvoice, recordPayment, saveInvoice, saveInvoiceConfig,
  type InvoiceConfig,
} from "@/lib/invoice-management";
import type { InvoiceState } from "@/components/invoice/invoice-model";

const refresh = (id?: string) => {
  revalidatePath("/admin/invoices");
  if (id) revalidatePath(`/admin/invoices/${id}`);
};

export async function saveInvoiceAction(inv: InvoiceState) {
  const saved = await saveInvoice(inv);
  refresh(saved.id);
  return saved;
}

/**
 * Raising an invoice from a quotation lands on the draft so the owner can check it before a number
 * is taken. The owner chose one invoice per quotation, so a second attempt is refused by the data
 * layer and surfaced here rather than silently creating a duplicate.
 */
export async function convertQuotationAction(quotationId: string) {
  const invoice = await convertQuotationToInvoice(quotationId);
  revalidatePath("/admin/quotations");
  revalidatePath(`/admin/quotations/${quotationId}`);
  refresh(invoice.id);
  redirect(`/admin/invoices/${invoice.id}`);
}

export async function issueInvoiceAction(id: string) {
  await issueInvoice(id);
  refresh(id);
}

export async function cancelInvoiceAction(id: string, formData: FormData) {
  await cancelInvoice(id, String(formData.get("reason") ?? ""));
  refresh(id);
}

export async function recordPaymentAction(id: string, formData: FormData) {
  const amount = Number(formData.get("amount"));
  await recordPayment(id, {
    date: String(formData.get("date") || new Date().toISOString().slice(0, 10)),
    amount,
    method: String(formData.get("method") ?? "") || undefined,
    note: String(formData.get("note") ?? "") || undefined,
  });
  refresh(id);
}

export async function deletePaymentAction(paymentId: string, invoiceId: string) {
  await deletePayment(paymentId);
  refresh(invoiceId);
}

export async function duplicateInvoiceAction(id: string) {
  const copy = await duplicateInvoice(id);
  refresh(copy.id);
  redirect(`/admin/invoices/${copy.id}`);
}

export async function deleteInvoiceAction(id: string) {
  await deleteInvoice(id);
  revalidatePath("/admin/invoices");
}

export async function saveInvoiceConfigAction(config: Partial<InvoiceConfig>) {
  const saved = await saveInvoiceConfig(config);
  revalidatePath("/admin/invoices/settings");
  revalidatePath("/admin/invoices");
  return saved;
}
