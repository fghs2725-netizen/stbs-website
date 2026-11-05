"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareReply, Pencil, PlayCircle, Sparkles, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/admin/shell/BottomSheet";
import { ConfirmDialog, Toaster, useToasts } from "@/components/quotation/feedback";
import { FormError } from "@/components/admin/workers/WorkerForms";
import { EmptyState } from "@/components/admin/shell/ui";
import { REPLY_STATE_LABEL, LIMITS, policyText, type ReplyState } from "@/lib/google-business/model";
import { deleteReplyAction, draftReplyAction, replyToReviewAction } from "@/app/admin/(dashboard)/google-business/actions";
import { Stars } from "./bits";

export interface ReviewView {
  name: string;
  reviewer: string;
  photo: string | null;
  stars: number;
  comment: string;
  createTime: string;
  edited: boolean;
  reply: { comment: string; updateTime: string; state: ReplyState | null; policy: string | null } | null;
  media: Array<{ thumb: string; video: string | null; label: string }>;
}

const when = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** The review list with reply, edit and delete. Replies are drafted by hand or with the AI, then posted by the owner. */
export function ReviewsPanel({ reviews, aiEnabled, emptyText }: { reviews: ReviewView[]; aiEnabled: boolean; emptyText: string }) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [editing, setEditing] = useState<ReviewView | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<ReviewView | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [pending, start] = useTransition();

  const open = (r: ReviewView) => { setEditing(r); setText(r.reply?.comment ?? ""); setError(""); };
  const close = () => { setEditing(null); setError(""); };

  const draft = async () => {
    if (!editing) return;
    setDrafting(true);
    setError("");
    try {
      const r = await draftReplyAction(editing.stars, editing.comment);
      if (r.ok) setText(r.text);
      else setError(r.error);
    } finally {
      setDrafting(false);
    }
  };

  const post = () => start(async () => {
    if (!editing) return;
    const r = await replyToReviewAction(editing.name, text);
    if (!r.ok) return setError(r.error);
    close();
    push("success", r.message ?? "Reply posted.");
    router.refresh();
  });

  const remove = () => start(async () => {
    if (!deleting) return;
    const r = await deleteReplyAction(deleting.name);
    setDeleting(null);
    if (!r.ok) return push("error", r.error);
    push("success", r.message ?? "Reply removed.");
    router.refresh();
  });

  const tooLong = byteLength(text) > LIMITS.reply;

  return (
    <>
      <section className="a-card overflow-hidden" aria-label="Reviews">
        {reviews.length ? (
          <ul className="a-divide">
            {reviews.map((r) => {
              const stateLabel = r.reply?.state ? REPLY_STATE_LABEL[r.reply.state] : undefined;
              return (
                <li key={r.name} className="p-4 sm:px-5">
                  <div className="flex items-start gap-3">
                    {r.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photo} alt="" width={40} height={40} referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[0.9375rem] font-semibold" style={{ background: "var(--a-brand-soft)", color: "var(--a-brand)" }}>{r.reviewer.charAt(0).toUpperCase()}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] font-medium" style={{ color: "var(--a-ink)" }}>{r.reviewer}</p>
                      <div className="mt-[2px] flex flex-wrap items-center gap-2 text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                        <Stars value={r.stars} size={14} />
                        <span>{when(r.createTime)}{r.edited ? " · edited" : ""}</span>
                      </div>
                    </div>
                  </div>

                  {r.comment ? (
                    <p className="mt-3 whitespace-pre-line text-[0.9375rem]" style={{ color: "var(--a-body)" }}>{r.comment}</p>
                  ) : (
                    <p className="mt-3 text-[0.875rem] italic" style={{ color: "var(--a-faint)" }}>Rating only, no written review.</p>
                  )}

                  {r.media.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Customer photos">
                      {r.media.map((m, i) => (
                        <li key={i}>
                          <a href={m.video ?? m.thumb} target="_blank" rel="noopener noreferrer" className="relative block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.thumb} alt={m.label || "Photo from the customer"} referrerPolicy="no-referrer" className="size-20 rounded-[10px] object-cover" />
                            {m.video && <PlayCircle className="absolute inset-0 m-auto size-7 text-white drop-shadow" aria-label="Video" />}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  {r.reply ? (
                    <div className="mt-3 rounded-[12px] p-3" style={{ background: "rgba(0,0,0,.035)" }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.8125rem] font-semibold" style={{ color: "var(--a-ink)" }}>Your reply</p>
                        {r.reply.updateTime && <p className="text-[0.75rem]" style={{ color: "var(--a-faint)" }}>{when(r.reply.updateTime)}</p>}
                        {stateLabel && <span className={`a-pill a-pill-${stateLabel.tone}`}>{stateLabel.text}</span>}
                      </div>
                      {r.reply.state === "REJECTED" && (
                        <p className="mt-1 text-[0.8125rem]" style={{ color: "var(--a-warn)" }}>
                          Google did not publish this reply{policyText(r.reply.policy ?? undefined) ? ` (${policyText(r.reply.policy ?? undefined)})` : ""}. Edit it and post again.
                        </p>
                      )}
                      <p className="mt-1 whitespace-pre-line text-[0.875rem]" style={{ color: "var(--a-body)" }}>{r.reply.comment}</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" className="a-btn a-btn-quiet a-btn-sm" onClick={() => open(r)}><Pencil className="size-4" aria-hidden /> Edit</button>
                        <button type="button" className="a-btn a-btn-quiet a-btn-sm" style={{ color: "var(--a-danger)" }} onClick={() => setDeleting(r)}><Trash2 className="size-4" aria-hidden /> Delete</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="a-btn a-btn-primary a-btn-sm mt-3" onClick={() => open(r)}><MessageSquareReply className="size-4" aria-hidden /> Reply</button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={MessageSquareReply} title="Nothing here" description={emptyText} />
        )}
      </section>

      <BottomSheet open={!!editing} title={editing?.reply ? "Edit your reply" : `Reply to ${editing?.reviewer ?? ""}`} onClose={close}>
        {editing && (
          <div className="space-y-4">
            <div className="rounded-[12px] p-3" style={{ background: "rgba(0,0,0,.035)" }}>
              <Stars value={editing.stars} size={14} />
              <p className="mt-1 line-clamp-4 whitespace-pre-line text-[0.875rem]" style={{ color: "var(--a-body)" }}>{editing.comment || "Rating only, no written review."}</p>
            </div>
            <label className="a-label block">Your reply (public, shown under the review)
              <textarea className="a-input mt-1 py-2" style={{ minHeight: 150 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Thank you for choosing us…" />
            </label>
            <div className="flex items-center justify-between gap-3">
              {aiEnabled ? (
                <button type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={draft} disabled={drafting || pending}>
                  <Sparkles className="size-4" aria-hidden /> {drafting ? "Writing…" : text ? "Rewrite with AI" : "Write with AI"}
                </button>
              ) : <span />}
              <span className="text-[0.75rem]" style={{ color: tooLong ? "var(--a-danger)" : "var(--a-faint)" }}>{text.length} characters</span>
            </div>
            {aiEnabled && <p className="text-[0.75rem]" style={{ color: "var(--a-faint)" }}>Read the AI draft before posting. Add the customer&apos;s name if you like.</p>}
            <FormError message={error} />
            <button type="button" className="a-btn a-btn-primary w-full" onClick={post} disabled={pending || drafting || !text.trim() || tooLong}>
              {pending ? "Posting…" : editing.reply ? "Update reply" : "Post reply"}
            </button>
          </div>
        )}
      </BottomSheet>

      {deleting && (
        <ConfirmDialog title="Delete your reply?" body={`Your public reply to ${deleting.reviewer} is removed from Google. The review stays.`} confirmLabel="Delete reply" destructive busy={pending} onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
