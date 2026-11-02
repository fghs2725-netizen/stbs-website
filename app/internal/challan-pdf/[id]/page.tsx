import { notFound } from "next/navigation";
import { ChallanPrintRoot } from "@/components/challan/ChallanPrintRoot";
import { getChallanForPdfRender } from "@/lib/challan-management";
import { getInvoiceConfig } from "@/lib/invoice-management";
import { verifyQuotationRenderToken } from "@/lib/quotation-render-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reached only by the PDF renderer, holding a short-lived token bound to this challan id.
export default async function ChallanPdfRenderPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!verifyQuotationRenderToken(token, id)) notFound();
  const challan = await getChallanForPdfRender(id);
  if (!challan) notFound();
  const { business } = await getInvoiceConfig();
  return <ChallanPrintRoot challan={challan} business={business} />;
}
