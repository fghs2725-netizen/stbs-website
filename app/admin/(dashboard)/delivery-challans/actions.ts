"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cancelChallan, deleteChallan, duplicateChallan, issueChallan, saveChallan } from "@/lib/challan-management";
import type { ChallanState } from "@/lib/challan";

const refresh = (id?: string, invoiceId?: string) => {
  revalidatePath("/admin/delivery-challans");
  if (id) revalidatePath(`/admin/delivery-challans/${id}`);
  if (invoiceId) revalidatePath(`/admin/invoices/${invoiceId}`);
};

export async function saveChallanAction(c: ChallanState) {
  const session = await auth();
  const saved = await saveChallan(c, session?.user?.id);
  refresh(saved.id, saved.invoiceId);
  return saved;
}

export async function issueChallanAction(id: string) {
  await issueChallan(id);
  refresh(id);
}

export async function cancelChallanAction(id: string, formData: FormData) {
  await cancelChallan(id, String(formData.get("reason") ?? ""));
  refresh(id);
}

export async function deleteChallanAction(id: string) {
  await deleteChallan(id);
  refresh(id);
  redirect("/admin/delivery-challans");
}

export async function duplicateChallanAction(id: string) {
  const session = await auth();
  const copy = await duplicateChallan(id, session?.user?.id);
  refresh(copy.id);
  redirect(`/admin/delivery-challans/${copy.id}/edit`);
}
