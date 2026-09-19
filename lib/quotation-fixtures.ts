import { buildDraft, type QuotationItem, type QuotationState } from "@/components/quotation/quotation-model";

// Fixed, fictional data for the template regression test. Never persisted anywhere.
const item = (n: number, description: string, unit: string, quantity: number, rate: number): QuotationItem => ({ id: `fx-${n}`, description, unit, quantity, rate });

const baseClient = {
  companyName: "Sample Client Pvt. Ltd.",
  contactPerson: "Mr. A. Sample",
  addressLine1: "Plot 12, Sample Industrial Area",
  addressLine2: "Phase 2",
  city: "Sonipat",
  state: "Haryana",
  pinCode: "131001",
  phone: "9000000000",
  email: "sample@example.com",
};

export const QUOTATION_FIXTURES: Record<string, QuotationState> = {
  "single-item": buildDraft({
    quotationReference: "FIXTURE/SINGLE/001",
    quotationDate: "01 January 2026",
    validity: "15 days from date of submission",
    client: baseClient,
    serviceType: "Borewell Construction",
    items: [item(1, "Drilling of 8 inch borewell", "Meter", 100, 1250)],
  }),
  "many-items": buildDraft({
    quotationReference: "FIXTURE/MANY/002",
    quotationDate: "01 January 2026",
    validity: "15 days from date of submission",
    client: baseClient,
    serviceType: "Rainwater Harvesting Borewell System",
    items: Array.from({ length: 14 }, (_, i) => item(i + 1, `Line item ${i + 1} — supply and fitting of assorted material`, i % 2 ? "Nos" : "Meter", i + 1, 1234.5 * (i + 1))),
  }),
  "long-text": buildDraft({
    quotationReference: "FIXTURE/LONG/003",
    quotationDate: "01 January 2026",
    validity: "30 days from date of submission",
    client: {
      ...baseClient,
      companyName: "The Extraordinarily Long Named Sample Industrial Manufacturing and Trading Company Private Limited",
      addressLine1: "Unit 4, Block C, Sample Logistics and Warehousing Park, Near Sample Toll Plaza, National Highway",
      addressLine2: "Opposite the Sample Government Higher Secondary School and Community Centre",
    },
    serviceType: "Custom",
    customServiceType: "Supply, Installation, Testing and Commissioning of Submersible Pump Sets with Allied Works",
    subject: "Price Offer for Supply, Installation, Testing and Commissioning of Submersible Pump Sets with Allied Works at the Client Premises",
    items: [
      item(1, "Supply of 10 HP submersible pump set including control panel, starter, cable of 100 metre length, and all fittings required for a complete working installation as per the site requirement", "Set", 2, 185000.75),
      item(2, "Labour and transport charges for installation, testing and commissioning at site including lowering of column pipe", "Lot", 1, 42500),
      item(3, "Short item", "Nos", 3, 999.99),
    ],
  }),
};
