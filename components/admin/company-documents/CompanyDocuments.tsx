"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Download, Eye, FileSignature, FileText, Loader2, Pencil, Search, Share2, Trash2, Upload } from "lucide-react";
import { bankLetterSchema, DOCUMENT_ACCEPT, DOCUMENT_CATEGORIES, documentMime, documentUploadSchema, formatDocumentSize, previewable, type CompanyDocumentItem } from "@/lib/company-documents/shared";
import { ShareDocuments } from "./ShareDocuments";
import "./company-documents.css";

const API = "/api/company-documents";
type Ticket = { id: string; pathname: string; provider: string; mimeType: string };
type QueueItem = { key: string; file: File; category: string; progress: number; status: "waiting" | "uploading" | "saved" | "error"; error?: string; ticket?: Ticket };
async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The request failed. Please try again.");
  return data;
}

export function CompanyDocuments() {
  const [documents, setDocuments] = useState<CompanyDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageReady, setStorageReady] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Other");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const uploadLock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const [shareItems, setShareItems] = useState<CompanyDocumentItem[] | null>(null);
  const [editing, setEditing] = useState<CompanyDocumentItem | null>(null);
  const [deleting, setDeleting] = useState<CompanyDocumentItem | null>(null);
  const [letterOpen, setLetterOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await jsonRequest(API);
      setDocuments(data.documents); setStorageReady(data.storageReady);
      setSelected((previous) => new Set([...previous].filter((id) => data.documents.some((doc: CompanyDocumentItem) => doc.id === id))));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load documents."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const updateQueue = (key: string, patch: Partial<QueueItem>) => setQueue((previous) => previous.map((entry) => entry.key === key ? { ...entry, ...patch } : entry));
  function remember(doc: CompanyDocumentItem) { setDocuments((previous) => [doc, ...previous.filter((item) => item.id !== doc.id)]); }

  async function uploadOne(item: QueueItem) {
    updateQueue(item.key, { status: "uploading", error: undefined, progress: 0 });
    try {
      const payload = documentUploadSchema.parse({ originalName: item.file.name, size: item.file.size, title: item.file.name.slice(0, 150), category: item.category });
      if (!documentMime(item.file.name)) throw new Error("Choose a PDF, JPG, PNG, WebP, Word, Excel, or CSV file.");
      if (item.ticket) {
        // A lost completion response must not duplicate an already-saved document.
        try {
          const result = await jsonRequest(`${API}/${item.ticket.id}/complete`, { method: "POST" });
          remember(result.document); updateQueue(item.key, { status: "saved", progress: 100 }); return;
        } catch {
          await jsonRequest(`${API}/${item.ticket.id}`, { method: "DELETE" });
        }
      }
      const ticket: Ticket = await jsonRequest(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      updateQueue(item.key, { ticket });
      if (ticket.provider === "local") {
        const form = new FormData(); form.set("file", item.file);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest(); xhr.open("POST", `${API}/${ticket.id}/local`);
          xhr.upload.onprogress = (event) => { if (event.lengthComputable) updateQueue(item.key, { progress: Math.round(event.loaded / event.total * 95) }); };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else { let message = "Upload failed. Please retry."; try { message = JSON.parse(xhr.responseText).error || message; } catch { /* non-JSON response */ } reject(new Error(message)); }
          };
          xhr.onerror = () => reject(new Error("Connection lost. Please retry."));
          xhr.timeout = 120000; xhr.ontimeout = () => reject(new Error("Upload timed out. Please retry.")); xhr.send(form);
        });
      } else {
        await upload(ticket.pathname, item.file, { access: "private", contentType: ticket.mimeType, handleUploadUrl: `${API}/upload`, clientPayload: ticket.id,
          onUploadProgress: ({ percentage }) => updateQueue(item.key, { progress: Math.round(percentage * 0.95) }),
        });
      }
      const result = await jsonRequest(`${API}/${ticket.id}/complete`, { method: "POST" });
      remember(result.document); updateQueue(item.key, { status: "saved", progress: 100 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed. Please retry.";
      updateQueue(item.key, { status: "error", error: message.startsWith("[") ? "Check the filename and size. Files must be between 1 byte and 20 MB." : message });
    }
  }
  async function runUploads(items: QueueItem[]) {
    if (uploadLock.current) return;
    uploadLock.current = true; setUploading(true);
    try { for (const item of items) await uploadOne(item); }
    finally { uploadLock.current = false; setUploading(false); }
  }
  function addFiles(files: FileList | null) {
    if (!files?.length || uploadLock.current) return;
    const items: QueueItem[] = Array.from(files).map((file) => ({ key: crypto.randomUUID(), file, category: uploadCategory, progress: 0, status: "waiting" }));
    setQueue((previous) => [...previous, ...items]);
    void runUploads(items);
    if (input.current) input.current.value = "";
  }
  const visible = documents.filter((doc) => (!category || doc.category === category) && `${doc.title} ${doc.originalName}`.toLowerCase().includes(query.toLowerCase()));
  function toggle(id: string) { setSelected((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function removeShareItem(id: string) { setSelected((previous) => { const next = new Set(previous); next.delete(id); return next; }); setShareItems((items) => { const next = items?.filter((doc) => doc.id !== id) || []; return next.length ? next : null; }); }

  return <>
    <section className="a-card cd-upload" aria-labelledby="upload-documents-title">
      <div className="cd-upload-icon"><Upload size={25} aria-hidden /></div>
      <div className="min-w-0 flex-1"><h2 id="upload-documents-title" className="font-semibold">Your business essentials, in one place</h2><p className="a-sub mt-1">PDF, images, Word, Excel and CSV · Up to 20 MB each</p><p className="a-sub mt-1 text-xs">Private in your admin. Share copies whenever you need them.</p></div>
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <label className="text-xs font-medium" htmlFor="upload-category">Category for new uploads</label>
        <select id="upload-category" className="cd-input" value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)} disabled={uploading}>{DOCUMENT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
        <input ref={input} type="file" accept={DOCUMENT_ACCEPT} multiple className="sr-only" aria-label="Upload company documents" disabled={uploading || !storageReady || loading} onChange={(event) => addFiles(event.target.files)} />
        <button type="button" className="a-btn a-btn-primary" disabled={uploading || !storageReady || loading} onClick={() => input.current?.click()}>{uploading ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />} {uploading ? "Uploading…" : "Upload documents"}</button>
        <button type="button" className="a-btn a-btn-secondary" disabled={!storageReady || loading} onClick={() => setLetterOpen(true)}><FileSignature size={17} /> Create bank details letter</button>
      </div>
    </section>
    {!storageReady && <p role="alert" className="cd-notice">Private document storage needs to be configured before you can upload files.</p>}
    {queue.length > 0 && <section className="a-card p-4" aria-label="Upload progress">
      <div className="mb-2 flex justify-between gap-3"><h2 className="font-semibold">Uploads</h2><button type="button" className="text-sm underline" onClick={() => setQueue((items) => items.filter((item) => item.status !== "saved"))}>Clear completed</button></div>
      <ul className="divide-y">{queue.map((item) => <li key={item.key} className="py-3">
        <div className="flex items-center gap-3"><p className="min-w-0 flex-1 break-all text-sm font-medium">{item.file.name}</p><span className="a-sub text-xs" aria-live="polite">{item.status === "saved" ? "Saved" : item.status === "uploading" ? `${item.progress}%` : item.status === "waiting" ? "Waiting" : "Failed"}</span>{item.status === "error" && <button type="button" className="a-btn a-btn-secondary" disabled={uploading} onClick={() => void runUploads([item])}>Retry</button>}</div>
        {item.status === "uploading" && <progress className="mt-2 h-1 w-full" max="100" value={item.progress} aria-label={`Uploading ${item.file.name}`} />}
        {item.error && <p role="alert" className="cd-error mt-1 text-sm">{item.error}</p>}
      </li>)}</ul>
    </section>}
    <section className="a-card overflow-hidden" aria-label="Document library">
      <div className="cd-filters">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Search documents</span><Search className="pointer-events-none absolute left-3 top-3" size={17} aria-hidden /><input type="search" className="cd-input w-full pl-10" placeholder="Search documents…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label><span className="sr-only">Filter category</span><select className="cd-input w-full" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{DOCUMENT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="cd-selection">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="cd-checkbox" checked={visible.length > 0 && visible.every((doc) => selected.has(doc.id))} disabled={!visible.length} onChange={(event) => { const checked = event.target.checked; setSelected((previous) => { const next = new Set(previous); visible.forEach((doc) => checked ? next.add(doc.id) : next.delete(doc.id)); return next; }); }} />Select all shown</label>
        <span className="a-sub text-sm" aria-live="polite">{selected.size} selected</span>
        {selected.size > 0 && <button type="button" className="text-sm underline" onClick={() => setSelected(new Set())}>Clear selection</button>}
        <button type="button" className="a-btn a-btn-primary sm:ml-auto" disabled={!selected.size} onClick={() => setShareItems(documents.filter((doc) => selected.has(doc.id)))}><Share2 size={16} />Share selected{selected.size ? ` (${selected.size})` : ""}</button>
      </div>
      {error ? <div className="p-6" role="alert"><p className="cd-error">{error}</p><button type="button" className="a-btn a-btn-secondary mt-3" onClick={() => void refresh()}>Retry loading</button></div> : loading ? <p role="status" className="a-sub p-8 text-center">Loading documents…</p> : visible.length === 0 ? <div className="px-4 py-14 text-center"><FileText size={32} className="mx-auto mb-3 opacity-40" aria-hidden /><h2 className="font-semibold">{documents.length ? "No matching documents" : "Ready for your first document"}</h2><p className="a-sub mt-2">{documents.length ? "Try another search or category." : "Upload your GSTIN certificate, bank details, or another company document."}</p></div> : <ul className="divide-y">{visible.map((doc) => <li key={doc.id} className={`cd-row ${selected.has(doc.id) ? "cd-row-selected" : ""}`}>
        <input type="checkbox" className="cd-checkbox mt-1" aria-label={`Select ${doc.title}`} checked={selected.has(doc.id)} onChange={() => toggle(doc.id)} />
        <div className="cd-file-icon"><FileText size={21} aria-hidden /></div>
        <div className="min-w-0 flex-1"><p className="break-words font-semibold">{doc.title}</p><p className="a-sub mt-1 break-all text-xs">{doc.originalName}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="cd-category">{doc.category}</span><span className="a-sub text-xs">{formatDocumentSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div></div>
        <div className="cd-row-actions">
          {previewable(doc.mimeType) && <a className="a-btn a-btn-secondary" href={`${API}/${doc.id}/file?preview=1`} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${doc.title}`} title="Preview"><Eye size={16} /></a>}
          <a className="a-btn a-btn-secondary" href={`${API}/${doc.id}/file`} download aria-label={`Download ${doc.title}`} title="Download"><Download size={16} /></a>
          <button type="button" className="a-btn a-btn-secondary" aria-label={`Edit ${doc.title}`} title="Edit name and category" onClick={() => setEditing(doc)}><Pencil size={16} /></button>
          <button type="button" className="a-btn a-btn-secondary" aria-label={`Delete ${doc.title}`} title="Delete" onClick={() => setDeleting(doc)}><Trash2 size={16} /></button>
        </div>
      </li>)}</ul>}
    </section>
    {letterOpen && <BankLetterDialog onClose={() => setLetterOpen(false)} onCreated={(doc) => { remember(doc); setLetterOpen(false); }} />}
    {shareItems && <ShareDocuments documents={shareItems} onClose={() => setShareItems(null)} onRemove={removeShareItem} />}
    {editing && <DocumentEditor document={editing} onClose={() => setEditing(null)} onSaved={(doc) => { setDocuments((items) => items.map((item) => item.id === doc.id ? doc : item)); setEditing(null); }} />}
    {deleting && <DeleteDocument document={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDocuments((items) => items.filter((doc) => doc.id !== deleting.id)); setSelected((previous) => { const next = new Set(previous); next.delete(deleting.id); return next; }); setDeleting(null); }} />}
  </>;
}

function DocumentEditor({ document, onClose, onSaved }: { document: CompanyDocumentItem; onClose: () => void; onSaved: (document: CompanyDocumentItem) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(document.title);
  const [category, setCategory] = useState(document.category);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="cd-dialog" aria-labelledby="edit-document-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}><form onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { const data = await jsonRequest(`${API}/${document.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, category }) }); onSaved(data.document); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save."); }
    finally { setBusy(false); }
  }}><h2 id="edit-document-title" className="mb-5 text-xl font-semibold">Edit document</h2>
    <label className="mb-4 block text-sm font-medium">Document name<input className="cd-input mt-2 w-full" required maxLength={150} value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
    <label className="block text-sm font-medium">Category<select className="cd-input mt-2 w-full" value={category} onChange={(event) => setCategory(event.target.value)}>{DOCUMENT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
    <p className="a-sub mt-3 text-xs">Attachments keep their original filename: {document.originalName}</p>
    {error && <p role="alert" className="cd-error mt-4">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button type="button" className="a-btn a-btn-secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="a-btn a-btn-primary" disabled={busy || !title.trim()}>{busy ? "Saving…" : "Save changes"}</button></div>
  </form></dialog>;
}

function DeleteDocument({ document, onClose, onDeleted }: { document: CompanyDocumentItem; onClose: () => void; onDeleted: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="cd-dialog" aria-labelledby="delete-document-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id="delete-document-title" className="text-xl font-semibold">Delete document?</h2><p className="a-sub mt-3 break-words">“{document.title}” will be removed from your library. Copies you have already shared will remain with their recipients.</p>
    {error && <p role="alert" className="cd-error mt-4">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button type="button" className="a-btn a-btn-secondary" autoFocus disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="a-btn a-btn-primary" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await jsonRequest(`${API}/${document.id}`, { method: "DELETE" }); onDeleted(); } catch (err) { setError(err instanceof Error ? err.message : "Could not delete. Please retry."); } finally { setBusy(false); } }}>{busy ? "Deleting…" : "Delete document"}</button></div>
  </dialog>;
}

const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const EMPTY_LETTER = { accountName: "Saini Tubewell Boring Service", bankName: "", branch: "", accountNumber: "", accountType: "Current", ifsc: "", micr: "", swift: "", upi: "", pan: "", includeGstin: true, date: "" };

function BankLetterDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (document: CompanyDocumentItem) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({ ...EMPTY_LETTER, date: todayIso() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  const set = (key: keyof typeof EMPTY_LETTER) => (event: { target: { value: string } }) => setForm((previous) => ({ ...previous, [key]: event.target.value }));
  const field = (key: keyof typeof EMPTY_LETTER, label: string, extra: { required?: boolean; placeholder?: string; inputMode?: "numeric" } = {}) =>
    <label className="block text-sm font-medium">{label}{extra.required ? "" : " (optional)"}<input className="cd-input mt-1 w-full" value={form[key] as string} onChange={set(key)} required={extra.required} placeholder={extra.placeholder} inputMode={extra.inputMode} autoComplete="off" /></label>;
  return <dialog ref={ref} className="cd-dialog" aria-labelledby="bank-letter-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}><form onSubmit={async (event) => {
    event.preventDefault(); setError("");
    const parsed = bankLetterSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Check the details."); return; }
    setBusy(true);
    try { const data = await jsonRequest(`${API}/bank-letter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) }); onCreated(data.document); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not create the letter."); }
    finally { setBusy(false); }
  }}><h2 id="bank-letter-title" className="text-xl font-semibold">Bank details letter</h2>
    <p className="a-sub mt-1 mb-4 text-sm">Made on STBS letterhead, signed by Rajesh Saini, and saved to your library under Bank Details.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">{field("accountName", "Account holder name", { required: true })}</div>
      {field("bankName", "Bank name", { required: true })}
      {field("branch", "Branch")}
      {field("accountNumber", "Account number", { required: true, inputMode: "numeric" })}
      <label className="block text-sm font-medium">Account type<select className="cd-input mt-1 w-full" value={form.accountType} onChange={set("accountType")}>{["Current", "Savings", "Cash Credit", "Overdraft"].map((value) => <option key={value}>{value}</option>)}</select></label>
      {field("ifsc", "IFSC code", { required: true, placeholder: "SBIN0001234" })}
      {field("micr", "MICR code", { inputMode: "numeric" })}
      {field("swift", "SWIFT code")}
      {field("upi", "UPI ID")}
      {field("pan", "PAN")}
      <label className="block text-sm font-medium">Letter date<input type="date" className="cd-input mt-1 w-full" required value={form.date} onChange={set("date")} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="cd-checkbox" checked={form.includeGstin} onChange={(event) => setForm((previous) => ({ ...previous, includeGstin: event.target.checked }))} />Include GSTIN on the letter</label>
    </div>
    {error && <p role="alert" className="cd-error mt-4">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button type="button" className="a-btn a-btn-secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="a-btn a-btn-primary" disabled={busy}>{busy ? "Creating…" : "Create letter"}</button></div>
  </form></dialog>;
}
