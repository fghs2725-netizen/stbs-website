"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Star } from "lucide-react";

/** Google's own "write a review" link for the listing, ready to copy or send on WhatsApp after a job. */
export function ReviewLinkCard({ url, businessName }: { url: string; businessName: string }) {
  const [copied, setCopied] = useState(false);
  const message = `Thank you for choosing ${businessName}. If you were happy with our work, please leave us a review on Google — it helps other people find us: ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this review link", url);
    }
  };

  return (
    <section className="a-card p-4 sm:p-5" aria-labelledby="review-link-heading">
      <div className="flex items-start gap-3">
        <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: "var(--a-brand-soft)", color: "var(--a-brand)" }}><Star size={20} strokeWidth={1.75} /></span>
        <div className="min-w-0">
          <h2 id="review-link-heading" className="a-h2">Ask for a review</h2>
          <p className="a-sub mt-1">Send this link to a customer when a job is finished. It opens the review box on your listing directly.</p>
        </div>
      </div>
      <p className="mt-3 break-all rounded-[10px] p-2 text-[0.8125rem]" style={{ background: "rgba(0,0,0,.04)", color: "var(--a-body)" }}>{url}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={copy}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied ? "Copied" : "Copy link"}
        </button>
        <a className="a-btn a-btn-primary a-btn-sm" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="size-4" aria-hidden /> Send on WhatsApp
        </a>
      </div>
    </section>
  );
}
