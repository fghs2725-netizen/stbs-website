"use server";
import { revalidatePath } from "next/cache";
import {
  addPresetItem, deletePresetItem, movePresetItem, updatePresetField, updatePresetItem,
} from "@/lib/quotation-preset-store";

const refresh = (presetId: string) => {
  revalidatePath("/admin/quotations/presets");
  revalidatePath(`/admin/quotations/presets/${presetId}`);
};

export async function saveItemAction(presetId: string, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await updatePresetItem(id, {
    description: String(formData.get("description") ?? ""),
    unit: String(formData.get("unit") ?? ""),
  });
  refresh(presetId);
}

export async function addItemAction(presetId: string) {
  await addPresetItem(presetId);
  refresh(presetId);
}

export async function deleteItemAction(presetId: string, id: string) {
  await deletePresetItem(id);
  refresh(presetId);
}

export async function moveItemAction(presetId: string, id: string, by: -1 | 1) {
  await movePresetItem(id, by);
  refresh(presetId);
}

export async function saveFieldAction(presetId: string, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await updatePresetField(id, {
    label: String(formData.get("label") ?? ""),
    // One choice per line is the shape that survives being edited on a phone.
    options: String(formData.get("options") ?? "").split("\n").map((o) => o.trim()).filter(Boolean),
    allowCustom: formData.get("allowCustom") === "on",
  });
  refresh(presetId);
}
