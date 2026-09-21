import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getInvoiceConfig, saveInvoiceConfig } from "@/lib/invoice-management";
import { DEFAULT_INVOICE_SETTINGS, type InvoiceBlocks, type InvoiceColumns } from "@/components/invoice/invoice-settings";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const COLUMNS: Array<{ key: keyof InvoiceColumns; label: string; help?: string }> = [
  { key: "srNo", label: "Serial number" },
  { key: "hsn", label: "HSN / SAC code", help: "Independent of GST — you can charge GST without it, or print it without GST" },
  { key: "unit", label: "Unit" },
  { key: "details", label: "Details under the item name", help: "Brand, model, size — as on your quotations" },
  { key: "lineDiscount", label: "Discount on each line" },
  { key: "lineGst", label: "GST rate on each line", help: "Switch on when rates vary by item" },
];

const BLOCKS: Array<{ key: keyof InvoiceBlocks; label: string; help?: string }> = [
  { key: "shipTo", label: "Ship To / site address", help: "Hidden automatically when it matches the billing address" },
  { key: "placeOfSupply", label: "Place of supply", help: "Required on a GST invoice" },
  { key: "reverseCharge", label: "Reverse charge line" },
  { key: "dueDate", label: "Due date" },
  { key: "originalMarker", label: "“Original for recipient”" },
  { key: "quotationRef", label: "Quotation it came from" },
  { key: "amountWords", label: "Amount in words" },
  { key: "advanceBalance", label: "Advance received and balance due" },
  { key: "roundOff", label: "Round off to the rupee" },
  { key: "bankDetails", label: "Payment and bank details" },
  { key: "upiQr", label: "UPI QR code" },
  { key: "signature", label: "Signature and stamp" },
  { key: "terms", label: "Terms and conditions" },
  { key: "declaration", label: "Declaration" },
  { key: "statusStamp", label: "PAID / OVERDUE stamp across the page" },
];

async function saveAction(formData: FormData) {
  "use server";
  const on = (name: string) => formData.get(name) === "on";
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  await saveInvoiceConfig({
    settings: {
      ...DEFAULT_INVOICE_SETTINGS,
      columns: COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: on(`col_${c.key}`) }), {} as InvoiceColumns),
      blocks: BLOCKS.reduce((acc, b) => ({ ...acc, [b.key]: on(`blk_${b.key}`) }), {} as InvoiceBlocks),
      gstEnabled: on("gstEnabled"),
      gstRate: Number(formData.get("gstRate")) || 18,
      gstModeAuto: on("gstModeAuto"),
      creditDays: Number(formData.get("creditDays")) || 0,
      signatureName: text("signatureName"),
      lockIssued: on("lockIssued"),
      auditIssuedEdits: on("auditIssuedEdits"),
    },
    business: {
      bank: {
        accountName: text("accountName"),
        accountNumber: text("accountNumber"),
        ifsc: text("ifsc"),
        bank: text("bank"),
        upi: text("upi"),
      },
      upiQrUrl: text("upiQrUrl") || undefined,
      signatureUrl: text("signatureUrl") || undefined,
    },
  });
  revalidatePath("/admin/invoices/settings");
}

export default async function InvoiceSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { settings, business } = await getInvoiceConfig();
  const bank = business.bank ?? {};

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Invoices"
        title="Invoice settings"
        description="What every invoice shows, and the details printed on it."
        action={
          <span className="hidden items-center gap-2 lg:flex">
            <Link href="/admin/invoices/templates" className="a-btn">Templates</Link>
            <Link href="/admin/invoices/settings/item-codes" className="a-btn">HSN codes</Link>
            <Link href="/admin/invoices" className="a-btn">All invoices</Link>
          </span>
        }
      />

      <form action={saveAction} className="flex flex-col gap-4">
        <section className="a-card p-4">
          <h2 className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Columns in the item table</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {COLUMNS.map((c) => (
              <label key={c.key} className="flex items-start gap-3 rounded-lg p-2" style={{ background: "var(--a-sunk, transparent)" }}>
                <input type="checkbox" name={`col_${c.key}`} defaultChecked={settings.columns[c.key]} className="mt-1" />
                <span>
                  <span className="block text-[0.875rem]" style={{ color: "var(--a-ink)" }}>{c.label}</span>
                  {c.help && <span className="block text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>{c.help}</span>}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="a-card p-4">
          <h2 className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Blocks on the page</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {BLOCKS.map((b) => (
              <label key={b.key} className="flex items-start gap-3 rounded-lg p-2">
                <input type="checkbox" name={`blk_${b.key}`} defaultChecked={settings.blocks[b.key]} className="mt-1" />
                <span>
                  <span className="block text-[0.875rem]" style={{ color: "var(--a-ink)" }}>{b.label}</span>
                  {b.help && <span className="block text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>{b.help}</span>}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="a-card p-4">
          <h2 className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>GST and terms</h2>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-[0.875rem]" style={{ color: "var(--a-ink)" }}>
              <input type="checkbox" name="gstEnabled" defaultChecked={settings.gstEnabled} /> GST on by default
            </label>
            <label className="a-label">Default rate (%)
              <input type="number" name="gstRate" step="0.01" min="0" max="100" defaultValue={settings.gstRate} className="a-input mt-1 w-28" />
            </label>
            <label className="flex items-center gap-2 text-[0.875rem]" style={{ color: "var(--a-ink)" }}>
              <input type="checkbox" name="gstModeAuto" defaultChecked={settings.gstModeAuto} /> Choose CGST/SGST or IGST from the client’s state
            </label>
            <label className="a-label">Credit period (days)
              <input type="number" name="creditDays" min="0" max="365" defaultValue={settings.creditDays} className="a-input mt-1 w-28" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-[0.875rem]" style={{ color: "var(--a-ink)" }}>
              <input type="checkbox" name="lockIssued" defaultChecked={settings.lockIssued} /> Lock an issued invoice from editing
            </label>
            <label className="flex items-center gap-2 text-[0.875rem]" style={{ color: "var(--a-ink)" }}>
              <input type="checkbox" name="auditIssuedEdits" defaultChecked={settings.auditIssuedEdits} /> Record every edit made after issue
            </label>
          </div>
        </section>

        <section className="a-card p-4">
          <h2 className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Payment details</h2>
          <p className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
            Printed on the invoice exactly as entered. Give the account name as your bank holds it.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="a-label">Account name
              <input type="text" name="accountName" defaultValue={bank.accountName ?? ""} className="a-input mt-1" />
            </label>
            <label className="a-label">Account number
              <input type="text" name="accountNumber" defaultValue={bank.accountNumber ?? ""} className="a-input mt-1" />
            </label>
            <label className="a-label">IFSC
              <input type="text" name="ifsc" defaultValue={bank.ifsc ?? ""} className="a-input mt-1" />
            </label>
            <label className="a-label">Bank and branch
              <input type="text" name="bank" defaultValue={bank.bank ?? ""} className="a-input mt-1" />
            </label>
            <label className="a-label">UPI ID
              <input type="text" name="upi" defaultValue={bank.upi ?? ""} className="a-input mt-1" />
            </label>
            <label className="a-label">Signature line
              <input type="text" name="signatureName" defaultValue={settings.signatureName} className="a-input mt-1" />
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="a-label">UPI QR image URL
              <input type="text" name="upiQrUrl" defaultValue={business.upiQrUrl ?? ""} placeholder="Upload to Storage, then paste the URL" className="a-input mt-1" />
            </label>
            <label className="a-label">Signature image URL
              <input type="text" name="signatureUrl" defaultValue={business.signatureUrl ?? ""} placeholder="Leave empty to sign by hand" className="a-input mt-1" />
            </label>
          </div>
        </section>

        <div className="flex gap-2">
          <Button type="submit">Save settings</Button>
          <Link href="/admin/invoices" className="a-btn">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
