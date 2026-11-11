"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ImagePlus, Megaphone, Plus, Trash2, X } from "lucide-react";
import { BottomSheet } from "@/components/admin/shell/BottomSheet";
import { ConfirmDialog, Toaster, useToasts } from "@/components/quotation/feedback";
import { FormError } from "@/components/admin/workers/WorkerForms";
import { EmptyState } from "@/components/admin/shell/ui";
import { CTA_OPTIONS, LIMITS, POST_STATE_LABEL, POST_TOPIC_LABEL, type PostInput, type PostState, type PostTopic } from "@/lib/google-business/model";
import { todayIST } from "@/lib/worker-ledger";
import { createPostAction, deletePostAction } from "@/app/admin/(dashboard)/google-business/actions";
import { prepareGooglePhoto, uploadPublic } from "./google-photo";

export interface PostView {
  name: string;
  topic: PostTopic;
  state: PostState | null;
  summary: string;
  title: string;
  dates: string | null;
  image: string | null;
  searchUrl: string | null;
  createTime: string;
  button: string | null;
  coupon: string | null;
}

const when = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

const blank = (siteUrl: string): PostInput => {
  const today = todayIST();
  return { topic: "STANDARD", summary: "", cta: "CALL", ctaUrl: siteUrl, title: "", startDate: today, endDate: today, startTime: "", endTime: "", couponCode: "", redeemUrl: "", terms: "", imageUrl: "" };
};

/** Updates, offers and events on the listing: create with an optional photo and button, or delete. */
export function PostsPanel({ posts, siteUrl }: { posts: PostView[]; siteUrl: string }) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [draft, setDraft] = useState<PostInput | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<PostView | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<PostInput>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const close = () => { setDraft(null); setPreview(null); setError(""); };

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const jpeg = await prepareGooglePhoto(file);
      setPreview(URL.createObjectURL(jpeg));
      set({ imageUrl: await uploadPublic(jpeg) });
    } catch (e) {
      setPreview(null);
      set({ imageUrl: "" });
      setError(e instanceof Error ? e.message : "The photo could not be added.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = () => start(async () => {
    if (!draft) return;
    setError("");
    const r = await createPostAction(draft);
    if (!r.ok) return setError(r.error);
    close();
    push("success", r.message ?? "Posted.");
    router.refresh();
  });

  const remove = () => start(async () => {
    if (!deleting) return;
    const r = await deletePostAction(deleting.name);
    setDeleting(null);
    if (!r.ok) return push("error", r.error);
    push("success", r.message ?? "Post deleted.");
    router.refresh();
  });

  return (
    <>
      <button type="button" className="a-btn a-btn-primary min-h-[52px] self-start" onClick={() => { setError(""); setDraft(blank(siteUrl)); }}>
        <Plus className="size-5" aria-hidden /> New post
      </button>

      <section className="a-card overflow-hidden" aria-label="Posts">
        {posts.length ? (
          <ul className="a-divide">
            {posts.map((p) => {
              const st = p.state ? POST_STATE_LABEL[p.state] : undefined;
              return (
                <li key={p.name} className="flex gap-3 p-4 sm:px-5">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" referrerPolicy="no-referrer" className="size-20 shrink-0 rounded-[12px] object-cover" />
                  ) : (
                    <span aria-hidden className="inline-flex size-20 shrink-0 items-center justify-center rounded-[12px]" style={{ background: "rgba(0,0,0,.04)", color: "var(--a-faint)" }}><Megaphone size={22} strokeWidth={1.75} /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="a-pill a-pill-neutral">{POST_TOPIC_LABEL[p.topic]}</span>
                      {st && <span className={`a-pill a-pill-${st.tone}`}>{st.text}</span>}
                      <span className="text-[0.75rem]" style={{ color: "var(--a-faint)" }}>{when(p.createTime)}</span>
                    </div>
                    {p.title && <p className="mt-1 text-[0.9375rem] font-medium" style={{ color: "var(--a-ink)" }}>{p.title}</p>}
                    {p.dates && <p className="text-[0.8125rem]" style={{ color: "var(--a-muted)" }}>{p.dates}</p>}
                    {p.summary && <p className="mt-1 line-clamp-3 whitespace-pre-line text-[0.875rem]" style={{ color: "var(--a-body)" }}>{p.summary}</p>}
                    <p className="mt-1 text-[0.75rem]" style={{ color: "var(--a-faint)" }}>{[p.button && `Button: ${p.button}`, p.coupon && `Code: ${p.coupon}`].filter(Boolean).join(" · ")}</p>
                    <div className="-ml-3 mt-2 flex flex-wrap gap-x-1">
                      {p.searchUrl && <a href={p.searchUrl} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-quiet a-btn-sm"><ExternalLink className="size-4" aria-hidden /> View on Google</a>}
                      <button type="button" className="a-btn a-btn-quiet a-btn-sm" style={{ color: "var(--a-danger)" }} onClick={() => setDeleting(p)}><Trash2 className="size-4" aria-hidden /> Delete</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={Megaphone} title="No posts yet" description="Posts show on your listing in Search and Maps. A photo of a recent job with a line about it works well; post once or twice a month." />
        )}
      </section>

      <BottomSheet open={!!draft} title="New post" onClose={close}>
        {draft && (
          <div className="space-y-4">
            <div className="a-segment" role="radiogroup" aria-label="Post type">
              {(["STANDARD", "OFFER", "EVENT"] as PostTopic[]).map((t) => (
                <button key={t} type="button" role="radio" aria-checked={draft.topic === t} data-active={draft.topic === t} onClick={() => set({ topic: t })}>{POST_TOPIC_LABEL[t]}</button>
              ))}
            </div>

            <div>
              <span className="a-label">Photo (optional, recommended)</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
              {preview || draft.imageUrl ? (
                <div className="relative mt-1 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview ?? draft.imageUrl} alt="Chosen photo" className="max-h-48 rounded-[12px] object-cover" />
                  <button type="button" aria-label="Remove photo" onClick={() => { setPreview(null); set({ imageUrl: "" }); }} className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,.55)", color: "#fff" }}><X size={16} aria-hidden /></button>
                </div>
              ) : (
                <button type="button" className="a-btn a-btn-secondary mt-1 w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <ImagePlus className="size-4" aria-hidden /> {uploading ? "Preparing photo…" : "Choose a photo"}
                </button>
              )}
              {uploading && (preview || draft.imageUrl) && <p className="mt-1 text-[0.75rem]" style={{ color: "var(--a-faint)" }}>Uploading…</p>}
            </div>

            {draft.topic !== "STANDARD" && (
              <>
                <label className="a-label block">{draft.topic === "OFFER" ? "Offer title" : "Event title"}
                  <input className="a-input mt-1" value={draft.title} maxLength={LIMITS.eventTitle} onChange={(e) => set({ title: e.target.value })} placeholder={draft.topic === "OFFER" ? "Free water testing with every new borewell" : "Rainwater harvesting site visit"} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="a-label">Starts
                    <input type="date" className="a-input mt-1" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                  </label>
                  <label className="a-label">Ends
                    <input type="date" className="a-input mt-1" value={draft.endDate} min={draft.startDate} onChange={(e) => set({ endDate: e.target.value })} />
                  </label>
                  {draft.topic === "EVENT" && (
                    <>
                      <label className="a-label">Start time (optional)
                        <input type="time" className="a-input mt-1" value={draft.startTime} onChange={(e) => set({ startTime: e.target.value })} />
                      </label>
                      <label className="a-label">End time (optional)
                        <input type="time" className="a-input mt-1" value={draft.endTime} onChange={(e) => set({ endTime: e.target.value })} />
                      </label>
                    </>
                  )}
                </div>
              </>
            )}

            <label className="a-label block">{draft.topic === "STANDARD" ? "Post text" : "Details (optional)"}
              <textarea className="a-input mt-1 py-2" style={{ minHeight: 120 }} value={draft.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="Completed a 600 ft industrial borewell for a factory in Kundli this week…" />
              <span className="mt-1 block text-right text-[0.75rem]" style={{ color: draft.summary.length > LIMITS.postSummary ? "var(--a-danger)" : "var(--a-faint)" }}>{draft.summary.length} / {LIMITS.postSummary}</span>
            </label>

            {draft.topic === "OFFER" ? (
              <>
                <label className="a-label block">Coupon code (optional)
                  <input className="a-input mt-1" value={draft.couponCode} maxLength={LIMITS.coupon} onChange={(e) => set({ couponCode: e.target.value })} />
                </label>
                <label className="a-label block">Link to redeem (optional)
                  <input className="a-input mt-1" inputMode="url" value={draft.redeemUrl} onChange={(e) => set({ redeemUrl: e.target.value })} placeholder={`${siteUrl}/quote`} />
                </label>
                <label className="a-label block">Terms (optional)
                  <textarea className="a-input mt-1 py-2" style={{ minHeight: 70 }} value={draft.terms} onChange={(e) => set({ terms: e.target.value })} />
                </label>
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <label className="a-label">Button
                  <select className="a-input mt-1" value={draft.cta} onChange={(e) => set({ cta: e.target.value as PostInput["cta"] })}>
                    {CTA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                {draft.cta !== "NONE" && draft.cta !== "CALL" && (
                  <label className="a-label">Button link
                    <input className="a-input mt-1" inputMode="url" value={draft.ctaUrl} onChange={(e) => set({ ctaUrl: e.target.value })} />
                  </label>
                )}
                {draft.cta === "CALL" && <p className="self-end pb-3 text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>Calls the main number on your listing.</p>}
              </div>
            )}

            <FormError message={error} />
            <button type="button" className="a-btn a-btn-primary w-full" onClick={submit} disabled={pending || uploading}>{pending ? "Posting…" : "Post to Google"}</button>
          </div>
        )}
      </BottomSheet>

      {deleting && (
        <ConfirmDialog title="Delete this post?" body="It is removed from your Google listing straight away." confirmLabel="Delete post" destructive busy={pending} onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
