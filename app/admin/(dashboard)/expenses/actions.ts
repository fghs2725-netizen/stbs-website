"use server";
import { revalidatePath } from "next/cache";
import { addExpense, deleteExpense, InputError, updateExpense, type ExpenseInput } from "@/lib/worker-management";
import type { ActionResult } from "../workers/actions";

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    revalidatePath("/admin/expenses");
    revalidatePath("/admin/workers");
    return { ok: true };
  } catch (e) {
    if (e instanceof InputError) return { ok: false, error: e.message };
    console.error("[expenses] action failed:", e);
    return { ok: false, error: "That could not be saved. Check your connection and try again." };
  }
}

export async function addExpenseAction(input: ExpenseInput) {
  return run(() => addExpense(input));
}

export async function updateExpenseAction(id: string, input: ExpenseInput) {
  return run(() => updateExpense(id, input));
}

export async function deleteExpenseAction(id: string) {
  return run(() => deleteExpense(id));
}
