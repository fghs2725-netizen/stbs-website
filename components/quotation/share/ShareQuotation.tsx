"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, Loader2, Mail, MessageCircle, Send, X } from "lucide-react";
import { buildShareMessage, defaultFileBase, fileNameSuggestions, mailtoHref, sanitizeFileBase, shareTitle, whatsappHref, withPdfExtension, type ShareSubject } from "./share-model";
import "./share.css";

type Phase = "preparing" | "ready" | "error";

const kb = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/**
 * One sheet for getting a quotation PDF out of the app, either to keep ("save") or to send ("share").
 * Both let you choose the file name first, so it is never stuck as a generated "STBS-Quotation-...".
 *
 * Why a sheet rather than a button that acts straight away: generating the PDF takes a few seconds, and a
 * browser only lets a page open the system share menu from a fresh tap. iPhone Safari in particular refuses
 * once that tap is "stale". So the PDF is prepared first, and the actual share or download happens from a
 * second, fresh tap. You can rename the file while it is being prepared.
 *
 * With the system menu (phones, some desktops) the PDF is attached and you pick WhatsApp, Gmail, and so on.
 * A web page cannot attach a file to a WhatsApp or mail link, so where the menu is missing those buttons
 * download the PDF and open the app with the message ready, and the sheet says to attach it.
 */
export function ShareQuotation({ subject, getPdf, render, intent = "share", registerOpen }: {
  subject: ShareSubject;
  /** Produces the PDF. Called when the sheet opens, so it always reflects the latest saved quotation. */
  getPdf: () => Promise<Blob>;
  /** Draws the button that opens the sheet, so each page keeps its own styling. */
  render: (t: { open: () => void; busy: boolean }) => ReactNode;
  /** "save" leads with Download; "share" leads with the system share menu and the message. */
  intent?: "share" | "save";
  /** Lets a keyboard shortcut open the sheet from outside. */
  registerOpen?: (open: () => void) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("preparing");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShareFile, setCanShareFile] = useState(false);
  const [touch, setTouch] = useState(false);
  const returnTo = useRef<HTMLElement | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const run = useRef(0);

  const defaultBase = defaultFileBase(subject);
  const cleanBase = sanitizeFileBase(name, defaultBase);
  const fileName = withPdfExtension(cleanBase);
  // Rebuilt at the moment of use, so whatever the name box says right now is what the file is called.
  const namedFile = () => (blob ? new File([blob], fileName, { type: "application/pdf" }) : null);

  const prepare = useCallback(async () => {
    const mine = ++run.current;
    setPhase("preparing"); setError(""); setNote(""); setBlob(null);
    try {
      const b = await getPdf();
      if (mine !== run.current) return;
      if (b.type && !b.type.toLowerCase().includes("application/pdf")) throw new Error("The PDF could not be created. Please try again.");
      setBlob(b);
      const probe = new File([b], "quotation.pdf", { type: "application/pdf" });
      setCanShareFile(typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof navigator.share === "function" && navigator.canShare({ files: [probe] }));
      setPhase("ready");
    } catch (e) {
      if (mine !== run.current) return;
      setError(e instanceof Error && e.message ? e.message : "The PDF could not be created. Please try again.");
      setPhase("error");
    }
  }, [getPdf]);

  const open = () => {
    returnTo.current = document.activeElement as HTMLElement | null;
    setName(defaultFileBase(subject));
    setText(buildShareMessage(subject));
    setCopied(false);
    setTouch(window.matchMedia?.("(pointer: coarse)").matches ?? false);
    setIsOpen(true);
    void prepare();
  };
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => { registerOpen?.(() => openRef.current()); }, [registerOpen]);

  const close = useCallback(() => { run.current++; setIsOpen(false); returnTo.current?.focus?.(); }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [isOpen, close]);

  const title = shareTitle(subject);

  const download = () => {
    const f = namedFile();
    if (!f) return;
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url; a.download = f.name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setNote(`Saved as ${f.name}`);
  };

  const nativeShare = async () => {
    const f = namedFile();
    if (!f) return;
    setNote("");
    try {
      await navigator.share({ files: [f], title, text });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return; // the person closed the share menu
      setNote("Sharing is not available here. Use Download, then attach the file.");
    }
  };

  const whatsapp = () => {
    download();
    setNote(`Downloaded as ${fileName}. Attach it in the WhatsApp chat.`);
    window.open(whatsappHref(subject.phone, text), "_blank", "noopener");
  };
  const email = () => {
    download();
    setNote(`Downloaded as ${fileName}. Attach it in your email.`);
    const href = mailtoHref(subject.email, title, text);
    window.setTimeout(() => { window.location.href = href; }, 150);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = sheet.current?.querySelector<HTMLTextAreaElement>("#shr-text"); t?.select(); document.execCommand?.("copy"); }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const saving = intent === "save";
  // On a phone the system menu already lists WhatsApp and mail with the file attached, so the explicit
  // buttons (which cannot attach) would only be a worse way in. On desktop they are the useful ones.
  const showApps = !saving && !(touch && canShareFile);
  const suggestions = fileNameSuggestions(subject);
  const typedDiffers = name.trim() !== "" && cleanBase !== name.trim().replace(/(\.pdf)+$/i, "");

  return (
    <>
      {render({ open, busy: isOpen && phase === "preparing" })}
      {isOpen && typeof document !== "undefined" && createPortal(
        <div className="shr-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="shr-sheet" role="dialog" aria-modal="true" aria-labelledby="shr-title" ref={sheet} tabIndex={-1}>
            <div className="shr-head">
              <div className="min-w-0">
                <h2 id="shr-title">{saving ? "Save PDF" : "Share quotation"}</h2>
                <p className="shr-sub">{[subject.reference, subject.clientName].filter(Boolean).join(" · ") || "Quotation"}</p>
              </div>
              <button type="button" className="shr-x" onClick={close} aria-label="Close"><X size={20} aria-hidden /></button>
            </div>

            <label htmlFor="shr-name" className="shr-label shr-first">File name</label>
            <div className="shr-namebox">
              <input
                id="shr-name"
                className="shr-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setName((n) => (n.trim() ? sanitizeFileBase(n, defaultBase) : defaultBase))}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="shr-name-hint"
              />
              <span aria-hidden className="shr-ext">.pdf</span>
            </div>
            <div className="shr-chips" role="group" aria-label="Suggested file names">
              {suggestions.map((s) => (
                <button key={s} type="button" className="shr-chip" data-on={s === cleanBase || undefined} onClick={() => setName(s)} title={withPdfExtension(s)}>{s}</button>
              ))}
            </div>
            <p id="shr-name-hint" className="shr-hint shr-tight">{typedDiffers ? `Will be saved as ${fileName} (characters a file name cannot contain are replaced).` : `Will be saved as ${fileName}`}</p>

            {phase === "preparing" && (
              <p className="shr-status" role="status"><Loader2 size={18} className="shr-spin" aria-hidden /> Preparing the PDF… you can rename it meanwhile.</p>
            )}
            {phase === "error" && (
              <div role="alert" className="shr-error">
                <p>{error}</p>
                <button type="button" className="shr-btn shr-secondary" onClick={() => void prepare()}>Try again</button>
              </div>
            )}
            {phase === "ready" && blob && (
              <>
                <p className="shr-file"><Check size={16} aria-hidden /> PDF ready <span>· {kb(blob.size)}</span></p>

                {!saving && (
                  <>
                    <label htmlFor="shr-text" className="shr-label">Message</label>
                    <textarea id="shr-text" className="shr-text" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
                  </>
                )}

                <div className="shr-actions">
                  {saving ? (
                    <>
                      <button type="button" className="shr-btn shr-primary" onClick={download}><Download size={18} aria-hidden /> Download PDF</button>
                      {canShareFile && <button type="button" className="shr-btn shr-secondary" onClick={() => void nativeShare()}><Send size={18} aria-hidden /> Share instead…</button>}
                    </>
                  ) : (
                    <>
                      {canShareFile && <button type="button" className="shr-btn shr-primary" onClick={() => void nativeShare()}><Send size={18} aria-hidden /> Share PDF…</button>}
                      {showApps && (
                        <div className="shr-row">
                          <button type="button" className="shr-btn shr-secondary" onClick={whatsapp}><MessageCircle size={18} aria-hidden /> WhatsApp</button>
                          <button type="button" className="shr-btn shr-secondary" onClick={email}><Mail size={18} aria-hidden /> Email</button>
                        </div>
                      )}
                      <div className="shr-row">
                        <button type="button" className="shr-btn shr-secondary" onClick={download}><Download size={18} aria-hidden /> Download</button>
                        <button type="button" className="shr-btn shr-secondary" onClick={() => void copy()}>{copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />} {copied ? "Copied" : "Copy message"}</button>
                      </div>
                    </>
                  )}
                </div>

                {!saving && canShareFile && touch && <p className="shr-hint">Pick WhatsApp, Gmail or any app in the next menu. The PDF goes with it, under the name above.</p>}
                {showApps && !note && <p className="shr-hint">{subject.phone ? "WhatsApp opens the chat with the client's number. " : ""}A web page cannot attach a file to WhatsApp or email, so the PDF downloads first and you attach it.</p>}
                {note && <p className="shr-hint" role="status">{note}</p>}
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
