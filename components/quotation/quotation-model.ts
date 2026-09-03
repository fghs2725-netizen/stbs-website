export type QuotationItem = { id: string; description: string; unit: string; quantity: number; rate: number };
export type ClientDetails = { companyName: string; contactPerson: string; addressLine1: string; addressLine2: string; city: string; state: string; pinCode: string; phone: string; email: string };
export type QuotationState = { id?: string; clientId?: string; saveClientForFuture?: boolean; quotationReference: string; quotationDate: string; validity: string; client: ClientDetails; serviceType: string; customServiceType: string; subject: string; items: QuotationItem[]; status?: "DRAFT" | "FINAL" };
export const serviceOptions = ["Borewell Construction", "Rainwater Harvesting Borewell System", "Rainwater Harvesting", "Tubewell Boring", "Borewell Cleaning", "Borewell Material Supply", "Custom"];
export const serviceLabel = (q: QuotationState) => q.serviceType === "Custom" ? q.customServiceType || "Custom Service" : q.serviceType;
export const defaultSubject = (q: QuotationState) => `Price Offer for ${serviceLabel(q)}`;

// Start with ZERO items — no fake empty row
export const initialQuotation: QuotationState = { quotationReference: "", quotationDate: "", validity: "15 days from date of submission", client: { companyName: "", contactPerson: "", addressLine1: "", addressLine2: "", city: "", state: "", pinCode: "", phone: "", email: "" }, serviceType: serviceOptions[0], customServiceType: "", subject: "", items: [], status: "DRAFT" };

// Build a fresh draft quotation whose subject is committed to state as the
// derived default whenever it is not explicitly provided. The editor displays
// and the renderer prints the effective subject, so the stored field must never
// silently diverge from what the user actually sees (default subject shown but
// state.subject left empty). This keeps validation strict: a subject the user
// explicitly clears stays empty and is rejected.
export function buildDraft(overrides: Partial<QuotationState> = {}): QuotationState {
  const q: QuotationState = { ...initialQuotation, ...overrides };
  if (!(q.subject || "").trim()) q.subject = defaultSubject(q).trim();
  return q;
}

// --- Item validation ---
export type ItemValidation = { description?: string; unit?: string; quantity?: string; rate?: string };

// Normalize a raw form/serialized value into a finite number. Numeric strings
// from inputs become numbers; empty/invalid values yield NaN so "0"/""/NaN
// are never accidentally treated as valid quantities.
function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isItemValid(item: QuotationItem): boolean {
  const quantity = toNumber(item.quantity);
  const rate = toNumber(item.rate);
  return (
    toTrimmedString(item.description) !== "" &&
    toTrimmedString(item.unit) !== "" &&
    Number.isFinite(quantity) &&
    quantity > 0 &&
    Number.isFinite(rate) &&
    rate >= 0
  );
}

export function validateItem(item: QuotationItem): ItemValidation {
  const errors: ItemValidation = {};
  const quantity = toNumber(item.quantity);
  const rate = toNumber(item.rate);
  if (!toTrimmedString(item.description)) errors.description = "Description is required";
  if (!toTrimmedString(item.unit)) errors.unit = "Unit is required";
  if (!Number.isFinite(quantity) || quantity <= 0) errors.quantity = "Quantity must be greater than 0";
  if (!Number.isFinite(rate) || rate < 0) errors.rate = "Rate must be 0 or greater";
  return errors;
}

export function getValidItems(items: unknown): QuotationItem[] {
  if (!Array.isArray(items)) return [];
  return (items as QuotationItem[]).filter(isItemValid);
}

// Canonical gate: a quotation may reach PDF generation only when it contains a
// client name, service, subject, and at least one valid priced item. Every layer
// (editor, saved view, finalize, PDF API) must use this single definition so
// validation cannot drift between representations.
export function isQuotationPdfReady(q: unknown): boolean {
  const state = (q ?? {}) as Partial<QuotationState>;
  const client = state.client as Partial<ClientDetails> | undefined;
  return Boolean(
    toTrimmedString(client?.companyName) &&
    toTrimmedString(state.serviceType) &&
    toTrimmedString(state.subject) &&
    getValidItems(state.items).length > 0
  );
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
