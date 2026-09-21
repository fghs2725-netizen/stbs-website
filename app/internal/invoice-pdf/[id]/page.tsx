import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { getInvoiceConfig, getInvoiceForPdfRender } from "@/lib/invoice-management";
import { verifyQuotationRenderToken } from "@/lib/quotation-render-auth";
import { resolveSettings } from "@/components/invoice/invoice-settings";
import { resolveInvoiceTemplate } from "@/lib/invoice-templates";
import { prisma } from "@/lib/prisma";
import "@/components/invoice/invoice.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reached only by the PDF renderer, holding a short-lived token bound to this invoice id.
export default async function InvoicePdfRenderPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!verifyQuotationRenderToken(token, id)) notFound();
  const invoice = await getInvoiceForPdfRender(id);
  if (!invoice) notFound();
  const config = await getInvoiceConfig();
  const head = await prisma.invoice.findUnique({ where: { id }, select: { status: true, templateId: true, templateSnapshot: true } });
  const template = head ? await resolveInvoiceTemplate(head) : null;
  // An issued invoice prints with the switches it was issued under, not today's.
  const settings = resolveSettings((invoice as { settingsSnapshot?: unknown }).settingsSnapshot ?? config.settings);

  // data-pdf-ready is rendered directly so the renderer can observe it without any client script.
  return (
    <main id="invoice-pdf-document" className="invoice-pdf-root" data-pdf-ready="true">
      <style>{`*{box-sizing:border-box}html,body{margin:0!important;padding:0!important;width:210mm!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.invoice-pdf-root{display:block!important;width:210mm!important;margin:0!important;padding:0!important;background:#fff!important}.invoice-pdf-root .inv-document{display:block!important;width:210mm!important;margin:0!important;padding:0!important;gap:0!important}.invoice-pdf-root .inv-page{display:flex!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;overflow:hidden!important;break-inside:avoid!important;break-after:page!important;background:#fff!important;box-shadow:none!important}.invoice-pdf-root .inv-page:last-child{break-after:auto!important}@page{size:A4 portrait;margin:0}`}</style>
      <InvoiceDocument invoice={invoice} settings={settings} business={config.business} template={template} />
    </main>
  );
}
