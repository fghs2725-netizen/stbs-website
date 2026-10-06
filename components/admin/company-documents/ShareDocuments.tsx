"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Share2, X } from "lucide-react";
import { formatDocumentSize, MAX_SHARE_BYTES, uniqueDocumentNames, type CompanyDocumentItem } from "@/lib/company-documents/shared";

type Prepared = { document: CompanyDocumentItem; file?: File; error?: string };
export function ShareDocuments({ documents, onClose, onRemove }: {
  documents: CompanyDocumentItem[]; onClose: () => void; onRemove: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [prepared, setPrepared] = useState<Prepared[]>([]);
  const [busy, setBusy] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const total = documents.reduce((sum, doc) => sum + doc.size, 0);
  const tooLarge = total > MAX_SHARE_BYTES;

  useEffect(() => {
    const previous = document.activeElement;
    const el = dialog.current;
    el?.showModal();
    return () => { el?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setPrepared([]); setNotice(""); setBusy(true);
    if (tooLarge) { setBusy(false); return () => controller.abort(); }
    const names = uniqueDocumentNames(documents.map((doc) => doc.originalName));
    // Sequential fetching bounds pressure on the server and retains each file's failure.
    void (async () => {
      const results: Prepared[] = [];
      for (let index = 0; index < documents.length; index++) {
        if (controller.signal.aborted) return;
        const document = documents[index];
        try {
          const response = await fetch(`/api/company-documents/${document.id}/file`, { signal: controller.signal, cache: "no-store" });
          if (!response.ok) throw new Error("Could not load this file. Retry or remove it.");
          const blob = await response.blob();
          if (blob.size !== document.size) throw new Error("File download was incomplete. Please retry.");
          results.push({ document, file: new File([blob], names[index], { type: document.mimeType }) });
        } catch (error) {
          if (controller.signal.aborted) return;
          results.push({ document, error: error instanceof Error ? error.message : "File unavailable." });
        }
        if (!controller.signal.aborted) setPrepared([...results]);
      }
      if (!controller.signal.aborted) setBusy(false);
    })();
    return () => controller.abort();
  }, [documents, attempt, tooLarge]);

  const files = prepared.flatMap((item) => item.file ? [item.file] : []);
  const ready = !busy && !tooLarge && documents.length > 0 && files.length === documents.length;
  let nativeSupported = false;
  try { nativeSupported = ready && typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files }); } catch { /* download fallback */ }

  async function share() {
    setNotice(""); setSharing(true);
    try { await navigator.share({ files }); }
    catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setNotice("Sharing is unavailable for these files. Download them below, then attach them in your app.");
    } finally { setSharing(false); }
  }
  function download(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return <dialog ref={dialog} className="cd-dialog" aria-labelledby="share-documents-title" onCancel={(event) => { event.preventDefault(); if (!sharing) onClose(); }}>
    <div className="flex items-start justify-between gap-4">
      <div><h2 id="share-documents-title" className="text-xl font-semibold">Share documents</h2><p className="a-sub mt-1">{documents.length} selected · {formatDocumentSize(total)}</p></div>
      <button type="button" className="a-btn a-btn-secondary" aria-label="Close share dialog" onClick={onClose} disabled={sharing}><X size={18} /></button>
    </div>
    {tooLarge && <p role="alert" className="cd-notice mt-4">Select fewer documents to stay within the 50 MB sharing limit. You can still download each file from the library.</p>}
    <ul className="my-5 divide-y" aria-label="Selected documents">
      {documents.map((doc) => {
        const item = prepared.find((entry) => entry.document.id === doc.id);
        return <li key={doc.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1"><p className="break-words font-medium">{doc.title}</p><p className="a-sub break-all text-xs">{item?.file?.name || doc.originalName} · {formatDocumentSize(doc.size)}</p>{item?.error && <p role="alert" className="cd-error mt-1 text-sm">{item.error}</p>}</div>
          {busy && !item && <Loader2 size={17} className="animate-spin" aria-label="Preparing file" />}
          {!busy && item?.file && <button type="button" className="a-btn a-btn-secondary" onClick={() => download(item.file!)} aria-label={`Download ${doc.title}`}><Download size={16} /></button>}
          <button type="button" className="a-btn a-btn-secondary" disabled={busy || sharing} onClick={() => onRemove(doc.id)} aria-label={`Remove ${doc.title} from selection`}><X size={16} /></button>
        </li>;
      })}
    </ul>
    <div aria-live="polite">
      {busy ? <p className="a-sub">Preparing your files…</p> : nativeSupported ? <p className="a-sub">Choose WhatsApp, Mail, or another app from your device’s share menu.</p> : ready ? <p className="a-sub">File sharing is not available in this browser. Download each file above, then attach them in WhatsApp or email.</p> : null}
      {notice && <p className="cd-notice mt-3">{notice}</p>}
    </div>
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      {!busy && prepared.some((item) => item.error) && <button type="button" className="a-btn a-btn-secondary" onClick={() => setAttempt((v) => v + 1)}>Retry loading files</button>}
      <button type="button" className="a-btn a-btn-secondary" onClick={onClose} disabled={sharing}>Close</button>
      {nativeSupported && <button type="button" className="a-btn a-btn-primary" onClick={() => void share()} disabled={sharing}><Share2 size={17} />{sharing ? "Sharing…" : `Share ${files.length} ${files.length === 1 ? "file" : "files"}`}</button>}
    </div>
  </dialog>;
}
