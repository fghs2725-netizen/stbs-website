"use server";

import { revalidatePath } from "next/cache";
import { AreaClientInputError, setInvoiceClientArea } from "@/lib/website/area-clients";
import { AREAS } from "@/lib/website/areas";

type Result = { ok: true } | { ok: false; error: string };

/** A switched client is live as soon as it is saved, so every town page is rebuilt. */
export async function setInvoiceClientAreaAction(input: { key: string; area: string; name: string; locality: string }): Promise<Result> {
  try {
    await setInvoiceClientArea(input);
    for (const a of AREAS) revalidatePath(`/areas/${a.slug}`);
    revalidatePath("/admin/areas");
    return { ok: true };
  } catch (e) {
    if (e instanceof AreaClientInputError) return { ok: false, error: e.message };
    if (e instanceof Error && e.message === "UNAUTHORIZED") return { ok: false, error: "Please sign in again." };
    console.error("[areas] action failed:", e);
    return { ok: false, error: "That could not be saved. Check your connection and try again." };
  }
}
