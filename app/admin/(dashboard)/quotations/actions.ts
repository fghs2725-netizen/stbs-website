"use server";
import { saveQuotation, finalizeQuotation, duplicateQuotation } from "@/lib/quotation-management";
import type { QuotationState } from "@/components/quotation/quotation-model";
export async function saveDraftAction(q: QuotationState){ return saveQuotation(q); }
export async function finalizeAction(id:string){ return finalizeQuotation(id); }
export async function duplicateAction(id:string){ await duplicateQuotation(id); }
