import type { QuotationState } from "@/components/quotation/quotation-model";
import type { TemplateContent } from "@/components/quotation/template/template-model";

/**
 * A made-up quotation used only to show a template. It is never saved and its numbers are not real.
 * GST can be switched on to check how the tax line behaves.
 */
export function sampleQuotation(content: TemplateContent, layout: string, withGst: boolean): QuotationState {
  return {
    quotationReference: "STBS/SAMPLE/001",
    quotationDate: "01/01/2026",
    validity: content.validity,
    client: {
      gstin: "",
      companyName: "Sample Client Pvt. Ltd.",
      contactPerson: "Mr. A. Sample",
      addressLine1: "Plot 12, Sample Industrial Area",
      addressLine2: "",
      city: "Sonipat",
      state: "Haryana",
      pinCode: "131001",
      phone: "9000000000",
      email: "sample@example.com",
    },
    serviceType: "Borewell Construction",
    customServiceType: "",
    subject: "Price Offer for Borewell Construction",
    items: [
      { id: "s1", description: "Drilling of 8 inch borewell up to 300 ft", unit: "Meter", quantity: 90, rate: 1250 },
      { id: "s2", description: "Supply and fitting of PVC casing pipe", unit: "Meter", quantity: 60, rate: 480 },
      { id: "s3", description: "Development and flushing of borewell", unit: "Job", quantity: 1, rate: 15000 },
    ],
    status: "DRAFT",
    discountType: null,
    discountValue: 0,
    gstEnabled: withGst,
    gstMode: "CGST_SGST",
    gstRate: 18,
    template: { id: "preview", name: "Preview", layout, content },
  };
}
