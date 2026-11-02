import { ChallanDocument } from "./ChallanDocument";
import type { ChallanState } from "@/lib/challan";
import type { InvoiceBusiness } from "@/components/invoice/InvoiceDocument";

/** The page the PDF renderer prints: A4 pages edge to edge, nothing around them. Same rules as the invoice's. */
const PRINT_CSS = `*{box-sizing:border-box}html,body{margin:0!important;padding:0!important;width:210mm!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.invoice-pdf-root{display:block!important;width:210mm!important;margin:0!important;padding:0!important;background:#fff!important}.invoice-pdf-root .inv-document{display:block!important;width:210mm!important;margin:0!important;padding:0!important;gap:0!important}.invoice-pdf-root .inv-page{display:flex!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;overflow:hidden!important;break-inside:avoid!important;break-after:page!important;background:#fff!important;box-shadow:none!important}.invoice-pdf-root .inv-page:last-child{break-after:auto!important}@page{size:A4 portrait;margin:0}`;

export function ChallanPrintRoot({ challan, business }: { challan: ChallanState; business?: InvoiceBusiness }) {
  // data-pdf-ready is rendered directly so the renderer can observe it without any client script.
  return (
    <main id="challan-pdf-document" className="invoice-pdf-root" data-pdf-ready="true">
      <style>{PRINT_CSS}</style>
      <ChallanDocument challan={challan} business={business} />
    </main>
  );
}
