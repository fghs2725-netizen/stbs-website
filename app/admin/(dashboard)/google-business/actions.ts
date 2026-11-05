"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import * as gbp from "@/lib/google-business/api";
import { draftReviewReply } from "@/lib/google-business/ai-reply";
import { clearLocationChoice, disconnect, getConnectionRow, getGbpState, saveLocationChoice } from "@/lib/google-business/connection";
import { GbpError, GbpInputError, errorMessage } from "@/lib/google-business/errors";
import {
  MANAGED_FIELDS, belongsTo, buildLocalPost, buildLocationPatch, cleanReply, isHttpUrl, isPhotoCategory, patchFromSource, splitMask,
  type InfoInput, type PostInput,
} from "@/lib/google-business/model";

export type GbpActionResult = { ok: true; message?: string } | { ok: false; error: string };

const BASE = "/admin/google-business";

/** Every action: signed-in admin, a chosen listing, and errors turned into one line for the form. */
async function run(fn: (ctx: { parent: string; locationName: string }) => Promise<string | void>, paths: string[] = []): Promise<GbpActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Your session has ended. Sign in again." };
  try {
    const state = await getGbpState();
    if (state.kind !== "ready") return { ok: false, error: "Connect your Google Business listing first." };
    const message = await fn({ parent: state.parent, locationName: state.locationName });
    for (const p of [BASE, ...paths]) revalidatePath(p);
    return message ? { ok: true, message } : { ok: true };
  } catch (e) {
    if (!(e instanceof GbpError) && !(e instanceof GbpInputError)) console.error("[google-business] action failed:", e);
    return { ok: false, error: errorMessage(e) };
  }
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export async function replyToReviewAction(reviewName: string, comment: string) {
  return run(async ({ parent }) => {
    if (!belongsTo(reviewName, parent, "reviews")) throw new GbpInputError("That review is not on this listing.");
    await gbp.putReply(reviewName, cleanReply(comment));
    return "Reply posted. Google checks replies before showing them, which can take a few minutes.";
  }, [`${BASE}/reviews`]);
}

export async function deleteReplyAction(reviewName: string) {
  return run(async ({ parent }) => {
    if (!belongsTo(reviewName, parent, "reviews")) throw new GbpInputError("That review is not on this listing.");
    await gbp.deleteReply(reviewName);
    return "Reply removed.";
  }, [`${BASE}/reviews`]);
}

export async function draftReplyAction(stars: number, comment: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Your session has ended. Sign in again." };
  try {
    const text = await draftReviewReply({ stars: Math.min(5, Math.max(0, Math.round(stars))), comment: String(comment ?? "") });
    return text ? { ok: true, text } : { ok: false, error: "The AI could not write a draft right now. Write the reply yourself, or try again in a minute." };
  } catch (e) {
    console.error("[google-business] draft failed:", e);
    return { ok: false, error: "The AI could not write a draft right now." };
  }
}

// ─── Posts ──────────────────────────────────────────────────────────────────

export async function createPostAction(input: PostInput) {
  return run(async ({ parent }) => {
    const post = await gbp.createPost(parent, buildLocalPost(input));
    return post.state === "REJECTED" ? "Google rejected this post. Check the text and photo against Google's content rules." : "Posted. Google checks new posts, so it may show as “Being checked” for a little while.";
  }, [`${BASE}/posts`]);
}

export async function deletePostAction(postName: string) {
  return run(async ({ parent }) => {
    if (!belongsTo(postName, parent, "localPosts")) throw new GbpInputError("That post is not on this listing.");
    await gbp.deletePost(postName);
    return "Post deleted.";
  }, [`${BASE}/posts`]);
}

// ─── Listing info ───────────────────────────────────────────────────────────

export async function saveInfoAction(input: InfoInput) {
  return run(async ({ locationName }) => {
    const current = await gbp.getLocation(locationName);
    const { body, mask } = buildLocationPatch(current, input);
    if (!mask.length) return "Nothing changed.";
    await gbp.patchLocation(locationName, body, mask);
    const names = MANAGED_FIELDS.filter((f) => mask.some((m) => m === f.path || m.startsWith(`${f.path}.`))).map((f) => f.label.toLowerCase());
    return `Saved ${names.join(", ")}. Google may take a few minutes (sometimes longer, if it reviews the change) to show it.`;
  }, [`${BASE}/info`]);
}

/** Google changed some fields. "accept" takes Google's values; "keep" sends the owner's own values back. */
export async function resolveGoogleUpdateAction(choice: "accept" | "keep") {
  return run(async ({ locationName }) => {
    const updated = await gbp.getGoogleUpdated(locationName);
    const paths = splitMask(updated.diffMask).managed.map((f) => f.path);
    if (!paths.length) return "There is nothing from Google to review.";
    const source = choice === "accept" ? updated.location : await gbp.getLocation(locationName);
    if (!source) throw new GbpError("unavailable", "Google did not return its version of the listing. Try again.");
    const { body, mask } = patchFromSource(source, paths);
    await gbp.patchLocation(locationName, body, mask);
    return choice === "accept" ? "Google's changes accepted." : "Your details were sent back to Google.";
  }, [`${BASE}/info`]);
}

// ─── Photos ─────────────────────────────────────────────────────────────────

export async function addPhotoAction(sourceUrl: string, category: string) {
  return run(async ({ parent }) => {
    if (!isHttpUrl(sourceUrl, true)) throw new GbpInputError("The photo did not upload to a public address, so Google cannot fetch it.");
    if (!isPhotoCategory(category)) throw new GbpInputError("Choose what the photo shows.");
    await gbp.createMedia(parent, sourceUrl, category);
    return "Photo added. Google may take a while to show it on the listing.";
  }, [`${BASE}/photos`]);
}

export async function deletePhotoAction(mediaName: string) {
  return run(async ({ parent }) => {
    if (!belongsTo(mediaName, parent, "media")) throw new GbpInputError("That photo is not on this listing.");
    await gbp.deleteMedia(mediaName);
    return "Photo deleted.";
  }, [`${BASE}/photos`]);
}

// ─── Connection ─────────────────────────────────────────────────────────────

export async function chooseLocationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const value = String(formData.get("location") ?? "");
  const state = await getGbpState();
  if (state.kind === "pick-location") {
    const choice = state.choices.find((c) => `${c.accountName}|${c.locationName}` === value);
    if (choice) await saveLocationChoice(choice.accountName, choice.locationName, choice.title);
  }
  revalidatePath(BASE, "layout");
  redirect(BASE);
}

export async function switchLocationAction() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  if (await getConnectionRow()) await clearLocationChoice();
  revalidatePath(BASE, "layout");
  redirect(BASE);
}

export async function disconnectAction() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  await disconnect();
  revalidatePath(BASE, "layout");
  redirect(BASE);
}
