import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInvoice, getInvoiceConfig, invoiceEditLog } from "@/lib/invoice-management";
import { calcInvoiceTotals, formatINR, overdueBy, whatIsMissing, type InvoiceStatus } from "@/components/invoice/invoice-model";
import { formatInvoiceNumber } from "@/lib/invoice-numbering";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pill } from "@/components/admin/shell/ui";
import { Button } from "@/components/ui/button";
import {
  cancelInvoiceAction, deletePaymentAction, duplicateInvoiceAction, issueInvoiceAction, recordPaymentAction,
} from "../actions";

export const dynamic = "force-dynamic";

const LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Draft", ISSUED: "Issued", PARTLY_PAID: "Part paid", PAID: "Paid", CANCELLED: "Cancelled",
};
const TONE: Record<InvoiceStatus, "neutral" | "positive" | "warn" | "brand"> = {
  DRAFT: "warn", ISSUED: "brand", PARTLY_PAID: "warn", PAID: "positive", CANCELLED: "neutral",
};
const day = (v: string) => (v ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const { settings, business } = await getInvoiceConfig();
  const totals = calcInvoiceTotals(invoice, settings);
  const missing = whatIsMissing(invoice, settings);
  const late = overdueBy(invoice);
  const edits = invoice.status === "DRAFT" ? [] : await invoiceEditLog(id);
  const canTakePayment = invoice.status !== "DRAFT" && invoice.status !== "CANCELLED" && totals.balance > 0;

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Invoice"
        title={invoice.number ? `Invoice ${formatInvoiceNumber(invoice.number)}` : "Draft invoice"}
        description={invoice.client.companyName || "No client yet"}
        action={
          <span className="hidden items-center gap-2 lg:flex">
            <Link href="/admin/invoices" className="a-btn">All invoices</Link>
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={TONE[invoice.status]}>{LABEL[invoice.status]}</Pill>
        {late > 0 && <Pill tone="warn">{late} day{late === 1 ? "" : "s"} overdue</Pill>}
        {invoice.quotationReference && (
          <span className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
            Raised against quotation {invoice.quotationReference}
          </span>
        )}
      </div>

      {/* A draft cannot be issued until it is complete; say exactly what is missing rather than disabling silently. */}
      {invoice.status === "DRAFT" && missing.length > 0 && (
        <div className="a-card p-4">
          <p className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Before this can be issued</p>
          <ul className="mt-2 list-disc pl-5 text-[0.875rem]" style={{ color: "var(--a-body)" }}>
            {missing.map((m) => <li key={m}>Add {m}.</li>)}
          </ul>
        </div>
      )}

      <div className="a-card flex flex-wrap items-center gap-2 p-4">
        {invoice.status === "DRAFT" && (
          <form action={issueInvoiceAction.bind(null, id)}>
            <Button type="submit" disabled={missing.length > 0}>
              Issue and take the next number
            </Button>
          </form>
        )}
        {invoice.number && (
          <Button asChild variant="secondary">
            <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer">Download PDF</a>
          </Button>
        )}
        <form action={duplicateInvoiceAction.bind(null, id)}>
          <Button type="submit" variant="secondary">Duplicate</Button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="a-card overflow-hidden p-0">
          <div className="inv-stage" style={{ minHeight: 0, padding: "20px 0" }}>
            <InvoiceDocument invoice={invoice} settings={settings} business={business} isEditorPreview />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="a-card p-4">
            <h2 className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Money</h2>
            <dl className="a-num mt-2 grid grid-cols-2 gap-y-1 text-[0.875rem]">
              <dt style={{ color: "var(--a-faint)" }}>Total</dt>
              <dd className="text-right" style={{ color: "var(--a-ink)" }}>{formatINR(totals.grandTotal)}</dd>
              <dt style={{ color: "var(--a-faint)" }}>Received</dt>
              <dd className="text-right">{formatINR(totals.paid)}</dd>
              <dt style={{ color: "var(--a-faint)" }}>Balance</dt>
              <dd className="text-right font-semibold" style={{ color: "var(--a-ink)" }}>{formatINR(totals.balance)}</dd>
              <dt style={{ color: "var(--a-faint)" }}>Due</dt>
              <dd className="text-right">{day(invoice.dueDate ?? "")}</dd>
            </dl>
          </div>

          {(invoice.payments ?? []).length > 0 && (
            <div className="a-card p-4">
              <h2 className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Payments</h2>
              <ul className="a-divide mt-2">
                {(invoice.payments ?? []).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-[0.875rem]">
                    <span style={{ color: "var(--a-body)" }}>{day(p.date)}{p.method ? ` · ${p.method}` : ""}</span>
                    <span className="a-num" style={{ color: "var(--a-ink)" }}>{formatINR(p.amount)}</span>
                    <form action={deletePaymentAction.bind(null, p.id, id)}>
                      <button type="submit" className="a-link text-[0.8125rem]">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canTakePayment && (
            <form action={recordPaymentAction.bind(null, id)} className="a-card flex flex-col gap-2 p-4">
              <h2 className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Record a payment</h2>
              <label className="a-label">Date
                <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} className="a-input mt-1" required />
              </label>
              <label className="a-label">Amount
                <input type="number" name="amount" step="0.01" min="0.01" max={totals.balance} defaultValue={totals.balance} className="a-input mt-1" required />
              </label>
              <label className="a-label">Method
                <input type="text" name="method" placeholder="NEFT, UPI, cheque, cash" className="a-input mt-1" />
              </label>
              <Button type="submit" size="sm">Record</Button>
            </form>
          )}

          {invoice.status !== "DRAFT" && invoice.status !== "CANCELLED" && (
            <form action={cancelInvoiceAction.bind(null, id)} className="a-card flex flex-col gap-2 p-4">
              <h2 className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Cancel this invoice</h2>
              <p className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                The number stays used, so the series keeps no gap. Give a reason for the record.
              </p>
              <input type="text" name="reason" placeholder="Reason" className="a-input" required />
              <Button type="submit" size="sm" variant="secondary">Cancel invoice</Button>
            </form>
          )}

          {edits.length > 0 && (
            <div className="a-card p-4">
              <h2 className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Edit history</h2>
              <p className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                Changes made after this invoice was issued.
              </p>
              <ul className="a-divide mt-2">
                {edits.map((e) => (
                  <li key={e.id} className="py-2 text-[0.8125rem]" style={{ color: "var(--a-body)" }}>
                    <span style={{ color: "var(--a-faint)" }}>{day(e.at.slice(0, 10))}</span> — {e.field}:{" "}
                    <span className="a-num">{e.oldValue ?? "empty"} → {e.newValue ?? "empty"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
