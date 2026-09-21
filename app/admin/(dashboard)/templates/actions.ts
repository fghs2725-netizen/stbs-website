"use server";
import { revalidatePath } from "next/cache";
import {
  archiveTemplate,
  duplicateTemplate,
  restoreTemplate,
  saveTemplate,
  setDefaultTemplate,
  type ActionResult,
  type TemplateRow,
} from "@/lib/quotation-templates";

// Templates change what future quotations print, so every screen that shows one is refreshed.
const refresh = () => {
  revalidatePath("/admin/templates");
  revalidatePath("/admin/quotations", "layout");
};

export async function saveTemplateAction(id: string, input: { name: string; content: unknown }): Promise<ActionResult<TemplateRow>> {
  const r = await saveTemplate(id, input);
  if (r.ok) refresh();
  return r;
}
export async function duplicateTemplateAction(id: string): Promise<ActionResult<{ id: string }>> {
  const r = await duplicateTemplate(id);
  if (r.ok) refresh();
  return r;
}
export async function setDefaultTemplateAction(id: string): Promise<ActionResult> {
  const r = await setDefaultTemplate(id);
  if (r.ok) refresh();
  return r;
}
export async function archiveTemplateAction(id: string): Promise<ActionResult> {
  const r = await archiveTemplate(id);
  if (r.ok) refresh();
  return r;
}
export async function restoreTemplateAction(id: string): Promise<ActionResult> {
  const r = await restoreTemplate(id);
  if (r.ok) refresh();
  return r;
}
