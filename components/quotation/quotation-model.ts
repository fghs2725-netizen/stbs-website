export type QuotationItem = { id: string; description: string; unit: string; quantity: number; rate: number };
export type ClientDetails = { companyName: string; contactPerson: string; addressLine1: string; addressLine2: string; city: string; state: string; pinCode: string; phone: string; email: string };
export type QuotationState = { id?: string; clientId?: string; saveClientForFuture?: boolean; quotationReference: string; quotationDate: string; validity: string; client: ClientDetails; serviceType: string; customServiceType: string; subject: string; items: QuotationItem[]; status?: "DRAFT" | "FINAL" };
export const serviceOptions = ["Borewell Construction", "Rainwater Harvesting Borewell System", "Rainwater Harvesting", "Tubewell Boring", "Borewell Cleaning", "Borewell Material Supply", "Custom"];
export const serviceLabel = (q: QuotationState) => q.serviceType === "Custom" ? q.customServiceType || "Custom Service" : q.serviceType;
export const defaultSubject = (q: QuotationState) => `Price Offer for ${serviceLabel(q)}`;

// Start with ZERO items — no fake empty row
export const initialQuotation: QuotationState = { quotationReference: "", quotationDate: "", validity: "15 days from date of submission", client: { companyName: "", contactPerson: "", addressLine1: "", addressLine2: "", city: "", state: "", pinCode: "", phone: "", email: "" }, serviceType: serviceOptions[0], customServiceType: "", subject: "", items: [], status: "DRAFT" };

// --- Item validation ---
export type ItemValidation = { description?: string; unit?: string; quantity?: string; rate?: string };

export function isItemValid(item: QuotationItem): boolean {
  return item.description.trim() !== "" && item.unit.trim() !== "" && item.quantity > 0 && item.rate >= 0;
}

export function validateItem(item: QuotationItem): ItemValidation {
  const errors: ItemValidation = {};
  if (!item.description.trim()) errors.description = "Description is required";
  if (!item.unit.trim()) errors.unit = "Unit is required";
  if (item.quantity <= 0) errors.quantity = "Quantity must be greater than 0";
  if (item.rate < 0) errors.rate = "Rate must be 0 or greater";
  return errors;
}

export function getValidItems(items: QuotationItem[]): QuotationItem[] {
  return items.filter(isItemValid);
}

// --- Decimal-safe calculation ---
export function calcAmount(quantity: number, rate: number): number {
  // Multiply in integer cents to avoid floating-point issues
  return Math.round(quantity * rate * 100) / 100;
}

export function calcTotal(items: QuotationItem[]): number {
  return items.reduce((sum, item) => {
    const amount = calcAmount(item.quantity, item.rate);
    return Math.round((sum + amount) * 100) / 100;
  }, 0);
}

// --- Indian currency formatting (en-IN) ---
export function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
