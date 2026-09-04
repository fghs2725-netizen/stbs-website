"use server";
import { saveQuotation, finalizeQuotation, duplicateQuotation } from "@/lib/quotation-management";
import type { QuotationState } from "@/components/quotation/quotation-model";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
export async function saveDraftAction(q: QuotationState){ return saveQuotation(q); }
export async function finalizeAction(id:string){ return finalizeQuotation(id); }
export async function duplicateAction(id:string){
  const duplicate = await duplicateQuotation(id);
  revalidatePath("/admin/quotations");
  redirect(`/admin/quotations/${duplicate.id}/edit`);
}
