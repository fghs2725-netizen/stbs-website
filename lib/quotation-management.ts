import type { ClientDetails, QuotationItem } from "@/components/quotation/quotation-model";

export type QuotationStatus = "Draft" | "Final";
export type ManagedQuotation = {
  id: string;
  reference: string;
  date: string;
  validity: string;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
  client: ClientDetails;
  serviceType: string;
  customServiceType: string;
  subject: string;
  items: QuotationItem[];
  finalTotal: number;
};

// Repository boundary for Phase 2. A database adapter can implement this later
// without changing the builder, history, view, or duplicate screens.
export type QuotationRepository = {
  list(): Promise<ManagedQuotation[]>;
  get(id: string): Promise<ManagedQuotation | null>;
  save(quotation: ManagedQuotation): Promise<ManagedQuotation>;
  duplicate(id: string): Promise<ManagedQuotation>;
};

