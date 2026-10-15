"use client";

/**
 * The invoice list, with a Select mode for acting on many bills at once: share their PDFs together,
 * download them as Excel, or mark them sent to the CA (or not sent).
 *
 * Selection covers this page's rows; once the whole page is ticked, "Select all N" extends it to every
 * bill the current filters match, and the bulk actions then work from the filters rather than ids, so
 * marking a whole month as sent does not mean paging through it.
 *
 * Every issued bill carries a coloured edge: green once it has been sent to the CA, red until then.
 */
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Download, Share2, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/admin/shell/ui";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { InvoicePdfActions } from "@/components/invoice/share/InvoicePdfActions";
import { formatINR, type InvoiceStatus } from "@/components/invoice/invoice-model";
import type { ShareSubject } from "@/components/quotation/share/share-model";
import type { InvoiceFilter } from "@/lib/invoice-management";
import { invoiceIdsForAction, markSentToCaAction, purgeInvoiceAction, restoreInvoiceAction } from "@/app/admin/(dashboard)/invoices/actions";

export type InvoiceListRow = {
  id: string;
  title: string;
  status: InvoiceStatus;
  isCash: boolean;
  meta: string;
  late: number;
  itemCount: number;
  grandTotal: number;
  paid: number;
  balance: number;
  sentToCaAt?: string;
  subject: ShareSubject;
};

const LABEL: Record<InvoiceStatus, string> = { DRAFT: "Draft", ISSUED: "Issued", PARTLY_PAID: "Part paid", PAID: "Paid", CANCELLED: "Cancelled" };
const TONE: Record<InvoiceStatus, "neutral" | "positive" | "warn" | "brand"> = { DRAFT: "warn", ISSUED: "brand", PARTLY_PAID: "warn", PAID: "positive", CANCELLED: "neutral" };
const short = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
/** At most this many PDFs are made in one go: each is rendered on the server and takes a few seconds. */
const PDF_LIMIT = 50;

export function InvoiceList({ rows, total, filter, filterQuery, inDeleted }: {
  rows: InvoiceListRow[];
  /** How many bills the current filters match, across all pages. */
  total: number;
  filter: InvoiceFilter;
  /** The same filters as a query string, for the Excel route. */
  filterQuery: string;
  inDeleted: boolean;
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const wholePage = pageIds.length > 0 && pageIds.every((id) => picked.has(id));
  const count = allMatching ? total : picked.size;
  const target = allMatching ? { filter } : { ids: [...picked] };

  const toggle = (id: string) => {
    setAllMatching(false);
    setPicked((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const togglePage = () => { setAllMatching(false); setPicked(wholePage ? new Set() : new Set(pageIds)); };
  const stop = () => { setSelecting(false); setPicked(new Set()); setAllMatching(false); setNote(""); };

  const mark = (sent: boolean) => start(async () => {
    setNote("");
    const changed = await markSentToCaAction(target, sent);
    setNote(changed ? `${changed} bill${changed === 1 ? "" : "s"} marked ${sent ? "sent to CA" : "not sent"}.` : "Nothing to change: drafts are skipped, and the rest were already marked.");
    router.refresh();
  });

  const downloadExcel = () => {
    const qs = allMatching ? filterQuery : `ids=${encodeURIComponent([...picked].join(","))}`;
    window.location.href = `/api/invoices/export${qs ? `?${qs}` : ""}`;
  };

  /*
   * One file per bill, fetched one after another so the server renders a single PDF at a time, then
   * handed to the phone's share sheet together. Where the browser cannot share files (most desktops),
   * each file is downloaded instead.
   */
  const sharePdfs = async () => {
    setNote("");
    let ids = allMatching ? await invoiceIdsForAction(filter) : [...picked];
    if (ids.length > PDF_LIMIT) { ids = ids.slice(0, PDF_LIMIT); setNote(`Only the first ${PDF_LIMIT} PDFs are made in one go.`); }
    const files: File[] = [];
    try {
      for (let i = 0; i < ids.length; i++) {
        setBusy(`Preparing PDF ${i + 1} of ${ids.length}…`);
        const res = await fetch(`/api/invoices/${encodeURIComponent(ids[i])}/pdf`);
        if (!res.ok) throw new Error(`PDF ${i + 1} could not be made. Try again, or share fewer at once.`);
        const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `invoice-${i + 1}.pdf`;
        files.push(new File([await res.blob()], name, { type: "application/pdf" }));
      }
      setBusy("");
      if (typeof navigator.canShare === "function" && navigator.canShare({ files })) {
        await navigator.share({ files, title: `${files.length} invoice${files.length === 1 ? "" : "s"}` });
      } else {
        for (const f of files) {
          const url = URL.createObjectURL(f);
          const a = Object.assign(document.createElement("a"), { href: url, download: f.name });
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10_000);
        }
        setNote(`${files.length} PDF${files.length === 1 ? "" : "s"} downloaded. This browser cannot share several files at once.`);
      }
    } catch (e) {
      setBusy("");
      // Closing the share sheet is not an error worth showing.
      if (!(e instanceof DOMException && e.name === "AbortError")) setNote(e instanceof Error ? e.message : "Sharing failed.");
    }
  };

  return (
    <>
      {!inDeleted && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--a-hairline)] px-4 py-3 sm:px-5">
          {!selecting ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setSelecting(true)}>
              <CheckSquare size={15} strokeWidth={1.75} aria-hidden /> Select
            </Button>
          ) : (
            <>
              <button type="button" className="a-link inline-flex items-center gap-2 text-[0.875rem]" onClick={togglePage} aria-pressed={wholePage}>
                {wholePage ? <CheckSquare size={17} strokeWidth={1.75} aria-hidden /> : <Square size={17} strokeWidth={1.75} aria-hidden />}
                {wholePage ? "Clear page" : "Select page"}
              </button>
              <span className="a-num text-[0.875rem]" style={{ color: "var(--a-ink)" }}>{count} selected</span>
              {wholePage && !allMatching && total > rows.length && (
                <button type="button" className="a-link text-[0.875rem]" onClick={() => setAllMatching(true)}>Select all {total} matching</button>
              )}
              <span className="ml-auto" />
              <Button type="button" variant="secondary" size="sm" onClick={stop} aria-label="Leave select mode">
                <X size={15} strokeWidth={1.75} aria-hidden /> Done
              </Button>
            </>
          )}
        </div>
      )}

      {selecting && count > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-[color:var(--a-hairline)] px-4 py-3 sm:px-5" style={{ background: "var(--a-surface)" }}>
          <Button type="button" size="sm" onClick={sharePdfs} disabled={Boolean(busy)}>
            <Share2 size={15} strokeWidth={1.75} aria-hidden /> Share PDFs
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={downloadExcel}>
            <Download size={15} strokeWidth={1.75} aria-hidden /> Excel
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => mark(true)} disabled={pending}>Mark sent to CA</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => mark(false)} disabled={pending}>Mark not sent</Button>
          {(busy || note) && <p role="status" className="w-full text-[0.8125rem]" style={{ color: "var(--a-body)" }}>{busy || note}</p>}
        </div>
      )}

      <ul className="a-divide">
        {rows.map((inv) => {
          const issued = inv.status !== "DRAFT";
          const sent = Boolean(inv.sentToCaAt);
          const checked = allMatching || picked.has(inv.id);
          return (
            <li
              key={inv.id}
              data-testid="invoice-row"
              className="flex gap-3 p-4 sm:px-5"
              // The CA edge: green once sent, red until then. Drafts have not gone anywhere yet, so none.
              style={issued && !inDeleted ? { boxShadow: `inset 4px 0 0 ${sent ? "var(--a-positive)" : "var(--a-danger)"}` } : undefined}
            >
              {selecting && (
                <input
                  type="checkbox" className="mt-1 size-[18px] shrink-0 accent-[color:var(--a-brand)]"
                  checked={checked} onChange={() => toggle(inv.id)} aria-label={`Select ${inv.title}`}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/invoices/${inv.id}`} className="truncate text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>
                        {inv.title}
                      </Link>
                      <Pill tone={TONE[inv.status]}>{LABEL[inv.status]}</Pill>
                      {inv.isCash && <Pill tone="neutral">Cash</Pill>}
                      {inv.late > 0 && <Pill tone="warn">{inv.late} day{inv.late === 1 ? "" : "s"} overdue</Pill>}
                    </div>
                    <p className="a-num mt-[3px] truncate text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>{inv.meta}</p>
                    {issued && !inDeleted && (
                      <p className="mt-[3px] text-[0.75rem] font-medium" style={{ color: sent ? "var(--a-positive)" : "var(--a-danger)" }}>
                        {sent ? `Sent to CA · ${short(inv.sentToCaAt!)}` : "Not sent to CA"}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="a-num text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>
                      {inv.itemCount ? formatINR(inv.grandTotal) : "—"}
                    </p>
                    {inv.paid > 0 && inv.status !== "CANCELLED" && (
                      <p className="a-num text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                        {inv.balance > 0 ? `${formatINR(inv.balance)} due` : "Settled"}
                      </p>
                    )}
                  </div>
                </div>

                {!selecting && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm"><Link href={`/admin/invoices/${inv.id}`}>View</Link></Button>
                    {inDeleted && (
                      <>
                        <form action={restoreInvoiceAction.bind(null, inv.id)}>
                          <Button type="submit" variant="secondary" size="sm">Restore</Button>
                        </form>
                        <form action={purgeInvoiceAction.bind(null, inv.id)}>
                          <ConfirmSubmit variant="destructive" message="Delete this invoice permanently? Its items, payments and history are removed and this cannot be undone.">
                            Delete permanently
                          </ConfirmSubmit>
                        </form>
                      </>
                    )}
                    {!inDeleted && inv.status !== "CANCELLED" && (
                      <Button asChild variant="secondary" size="sm"><Link href={`/admin/invoices/${inv.id}/edit`}>Edit</Link></Button>
                    )}
                    {!inDeleted && <InvoicePdfActions id={inv.id} subject={inv.subject} />}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
