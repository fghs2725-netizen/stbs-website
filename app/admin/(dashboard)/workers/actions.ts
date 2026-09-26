"use server";
import { revalidatePath } from "next/cache";
import {
  addEntry, createWorker, deleteEntry, InputError, setWorkerActive, updateEntry, updateWorker,
  type EntryInput, type WorkerInput,
} from "@/lib/worker-management";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** A bad entry becomes a message for the form; anything unexpected is logged and reported plainly. */
async function run(fn: () => Promise<string | void>, paths: string[]): Promise<ActionResult> {
  try {
    const id = await fn();
    for (const p of paths) revalidatePath(p);
    return id ? { ok: true, id } : { ok: true };
  } catch (e) {
    if (e instanceof InputError) return { ok: false, error: e.message };
    console.error("[workers] action failed:", e);
    return { ok: false, error: "That could not be saved. Check your connection and try again." };
  }
}

export async function createWorkerAction(input: WorkerInput) {
  return run(() => createWorker(input), ["/admin/workers"]);
}

export async function updateWorkerAction(id: string, input: WorkerInput) {
  return run(() => updateWorker(id, input), ["/admin/workers", `/admin/workers/${id}`]);
}

export async function setWorkerActiveAction(id: string, active: boolean) {
  return run(() => setWorkerActive(id, active), ["/admin/workers", `/admin/workers/${id}`]);
}

export async function addEntryAction(workerId: string, input: EntryInput) {
  return run(() => addEntry(workerId, input), ["/admin/workers", `/admin/workers/${workerId}`]);
}

export async function updateEntryAction(entryId: string, workerId: string, input: EntryInput) {
  return run(async () => { await updateEntry(entryId, input); }, ["/admin/workers", `/admin/workers/${workerId}`]);
}

export async function deleteEntryAction(entryId: string, workerId: string) {
  return run(async () => { await deleteEntry(entryId); }, ["/admin/workers", `/admin/workers/${workerId}`]);
}
