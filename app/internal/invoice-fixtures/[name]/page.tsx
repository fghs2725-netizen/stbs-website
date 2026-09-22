import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { INVOICE_FIXTURES } from "@/lib/invoice-fixtures";
import { effectiveInvoiceSettings } from "@/components/invoice/invoice-settings";
import "@/components/invoice/invoice.css";

export const dynamic = "force-dynamic";

// Test-only: renders a fixture through the real invoice template, with no database access.
export default async function InvoiceFixturePage({ params }: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { name } = await params;
  const fixture = INVOICE_FIXTURES[name];
  if (!fixture) notFound();
  return (
    <main id="invoice-pdf-document" className="invoice-pdf-root" data-pdf-ready="true">
      <style>{`*{box-sizing:border-box}html,body{margin:0!important;padding:0!important;width:210mm!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.invoice-pdf-root{display:block!important;width:210mm!important;margin:0!important;padding:0!important;background:#fff!important}.invoice-pdf-root .inv-document{display:block!important;width:210mm!important;margin:0!important;padding:0!important;gap:0!important}.invoice-pdf-root .inv-page{display:flex!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;overflow:hidden!important;break-inside:avoid!important;break-after:page!important;background:#fff!important;box-shadow:none!important}.invoice-pdf-root .inv-page:last-child{break-after:auto!important}@page{size:A4 portrait;margin:0}`}</style>
      <InvoiceDocument
        invoice={fixture.invoice}
        settings={effectiveInvoiceSettings(fixture.settings, fixture.invoice.settingsOverride)}
        business={fixture.business}
      />
    </main>
  );
}
