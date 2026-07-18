import { notFound } from "next/navigation";
import { QuotationDocument } from "@/components/quotation/QuotationDocument";
import { getQuotationForPdfRender } from "@/lib/quotation-management";
import { verifyQuotationRenderToken } from "@/lib/quotation-render-auth";
import "@/components/quotation/quotation.css";
import "@/components/quotation/quotation-refinement.css";
import "@/components/quotation/responsive-print.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function QuotationPdfRenderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!verifyQuotationRenderToken(token, id)) notFound();
  const quotation = await getQuotationForPdfRender(id);
  if (!quotation) notFound();
  return <main className="quotation-pdf-root">
    <style>{`*{box-sizing:border-box}html,body{margin:0!important;padding:0!important;width:210mm!important;background:#f5f0e7!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.quotation-pdf-root{display:block!important;width:210mm!important;margin:0!important;padding:0!important;background:#f5f0e7!important}.quotation-pdf-root .q-document{display:block!important;width:210mm!important;margin:0!important;padding:0!important;gap:0!important}.quotation-pdf-root .q-page{display:block!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;padding:0!important;overflow:hidden!important;break-inside:avoid!important;break-after:page!important;background:#f5f0e7!important;box-shadow:none!important}.quotation-pdf-root .q-page:last-child{break-after:auto!important}@page{size:A4 portrait;margin:0}`}</style>
    <QuotationDocument quotation={quotation} />
    <script dangerouslySetInnerHTML={{ __html: "document.documentElement.dataset.pdfReady='true'" }} />
  </main>;
}
