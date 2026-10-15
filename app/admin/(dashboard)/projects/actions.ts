"use server";

import { revalidatePath } from "next/cache";
import { deleteProject, moveProject, ProjectInputError, saveProject, setProjectFeatured, setProjectPublished, type ProjectInput } from "@/lib/website-projects";

type Result = { ok: true; id?: string } | { ok: false; error: string };

/** Projects go live the moment they are saved, so the public pages must be rebuilt on every change. */
function refresh() {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
}

async function run(fn: () => Promise<string | void>): Promise<Result> {
  try {
    const id = await fn();
    refresh();
    return id ? { ok: true, id } : { ok: true };
  } catch (e) {
    if (e instanceof ProjectInputError) return { ok: false, error: e.message };
    if (e instanceof Error && e.message === "UNAUTHORIZED") return { ok: false, error: "Please sign in again." };
    console.error("[projects] action failed:", e);
    return { ok: false, error: "That could not be saved. Check your connection and try again." };
  }
}

export async function saveProjectAction(input: ProjectInput) {
  return run(() => saveProject(input));
}
export async function setProjectPublishedAction(id: string, published: boolean) {
  return run(() => setProjectPublished(id, published));
}
export async function deleteProjectAction(id: string) {
  return run(() => deleteProject(id));
}
export async function moveProjectAction(id: string, direction: -1 | 1) {
  return run(() => moveProject(id, direction));
}
export async function setProjectFeaturedAction(id: string, featured: boolean) {
  return run(() => setProjectFeatured(id, featured));
}
