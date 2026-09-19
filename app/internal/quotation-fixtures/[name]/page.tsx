import { notFound } from "next/navigation";
import { QuotationDocument } from "@/components/quotation/QuotationDocument";
import { QUOTATION_FIXTURES } from "@/lib/quotation-fixtures";
import "@/components/quotation/quotation.css";
import "@/components/quotation/quotation-refinement.css";
import "@/components/quotation/responsive-print.css";

export const dynamic = "force-dynamic";

// Test-only: renders a fixture through the same template and wrapper styles as the PDF route, with no database access.
export default async function QuotationFixturePage({ params }: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { name } = await params;
  const quotation = QUOTATION_FIXTURES[name];
  if (!quotation) notFound();
  return <main id="quotation-pdf-document" className="quotation-pdf-root" data-pdf-ready="true">
    <style>{`*{box-sizing:border-box}html,body{margin:0!important;padding:0!important;width:210mm!important;background:#f5f0e7!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.quotation-pdf-root{display:block!important;width:210mm!important;margin:0!important;padding:0!important;background:#f5f0e7!important}.quotation-pdf-root .q-document{display:block!important;width:210mm!important;margin:0!important;padding:0!important;gap:0!important}.quotation-pdf-root .q-page{display:block!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;padding:0!important;overflow:hidden!important;break-inside:avoid!important;break-after:page!important;background:#f5f0e7!important;box-shadow:none!important}.quotation-pdf-root .q-page:last-child{break-after:auto!important}@page{size:A4 portrait;margin:0}`}</style>
    <QuotationDocument quotation={quotation} />
  </main>;
}
