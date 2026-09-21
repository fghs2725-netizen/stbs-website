"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveDraftAction, finalizeAction } from "@/app/admin/(dashboard)/quotations/actions";
import { buildDraft, calcTotals, getValidItems, type QuotationState } from "../quotation-model";
import { createHistory, pushHistory, redoHistory, replaceHistoryPresent, undoHistory, type History } from "../editor-logic";
import { quotationPageCount } from "../pagination";
import { useToasts } from "../feedback";
import { readiness } from "./studio-logic";

const AUTOSAVE_MS = 3000;
export type SaveState = "saved" | "saving" | "unsaved" | "error";

/**
 * Everything the editor screen needs that is not layout: the document state with undo/redo, saving
 * (manual + autosave share one path), finalising, and the PDF and share exports.
 */
export function useQuotationSession(initial: QuotationState) {
  const [history, setHistory] = useState<History<QuotationState>>(() => createHistory(buildDraft(initial)));
  const historyRef = useRef(history);
  const q = history.present;
  const qRef = useRef(q);
  qRef.current = q;

  // Every change goes through here so undo/redo sees it. `key` collapses a typing burst into one step.
  const setQ = useCallback((next: QuotationState | ((p: QuotationState) => QuotationState), key?: string) => {
    const h = historyRef.current;
    const value = typeof next === "function" ? next(h.present) : next;
    const updated = pushHistory(h, value, key, Date.now());
    historyRef.current = updated;
    setHistory(updated);
  }, []);
  const patch = useCallback((changes: Partial<QuotationState>, key?: string) => setQ((x) => ({ ...x, ...changes }), key), [setQ]);
  const setDirect = (updated: History<QuotationState>) => { historyRef.current = updated; setHistory(updated); };
  const undo = useCallback(() => setDirect(undoHistory(historyRef.current)), []);
  const redo = useCallback(() => setDirect(redoHistory(historyRef.current)), []);

  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState("");
  const [saveTick, setSaveTick] = useState(0);
  const savedJson = useRef(JSON.stringify(q));
  const savingRef = useRef(false);
  const failedJson = useRef("");
  const [busy, setBusy] = useState({ finalize: false });
  const [overflow, setOverflow] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  const qJson = useMemo(() => JSON.stringify(q), [q]);
  const dirty = qJson !== savedJson.current;
  const isFinal = q.status === "FINAL";
  const status = useMemo(() => readiness(q), [q]);
  const totals = useMemo(() => calcTotals(q), [q]);
  const validItems = useMemo(() => getValidItems(q.items), [q.items]);
  const pageCount = useMemo(() => quotationPageCount(q), [q]);

  const persist = useCallback(async (mode: "manual" | "auto"): Promise<boolean> => {
    const sent = qRef.current;
    if (sent.status === "FINAL" || savingRef.current) return false;
    savingRef.current = true;
    setSaveState("saving");
    try {
      const saved = await saveDraftAction(sent);
      // Merge only server-assigned fields so edits made while saving are never overwritten.
      const merge = (x: QuotationState): QuotationState => ({ ...x, id: saved.id, quotationReference: saved.quotationReference, clientId: saved.clientId ?? x.clientId, saveClientForFuture: saved.clientId ? false : x.saveClientForFuture });
      savedJson.current = JSON.stringify(merge(sent));
      setDirect(replaceHistoryPresent(historyRef.current, merge(historyRef.current.present)));
      setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      setSaveState("saved");
      if (mode === "manual") push("success", `Draft saved · ${saved.quotationReference}`);
      // Move the address bar to the saved draft without remounting, so undo history, focus and scroll survive.
      if (!sent.id) window.history.replaceState(null, "", `/admin/quotations/${saved.id}/edit`);
      return true;
    } catch (e) {
      failedJson.current = JSON.stringify(sent);
      setSaveState("error");
      push("error", (e as Error)?.message === "FINAL_READ_ONLY" ? "This quotation is final and read-only." : "Could not save. Your changes are still here; it retries on your next edit, or press Ctrl+S.");
      return false;
    } finally {
      savingRef.current = false;
      setSaveTick((n) => n + 1);
    }
  }, [push]);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  // Existing drafts autosave a few seconds after the last edit. A new quotation gets its number on the first explicit save.
  useEffect(() => {
    if (!q.id || isFinal || !dirty || savingRef.current || qJson === failedJson.current) return;
    if (saveState === "saved") setSaveState("unsaved");
    const t = window.setTimeout(() => { void persist("auto"); }, AUTOSAVE_MS);
    return () => window.clearTimeout(t);
    // saveTick re-arms after a save that finished while newer edits were waiting.
  }, [qJson, saveTick, q.id, isFinal, dirty, persist, saveState]);

  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);

  // The server renders the SAVED quotation, so pending edits are saved first or the export would be stale.
  const saveBeforeExport = async (what: string) => {
    const cur = qRef.current;
    if (cur.id && cur.status === "DRAFT" && JSON.stringify(cur) !== savedJson.current && !(await persistRef.current("auto"))) throw new Error(`Could not save your latest changes first, so no ${what} was created.`);
  };

  // The PDF button opens the share/save sheet (which needs a way in from the Ctrl+P shortcut). The studio registers it here.
  const pdfShortcut = useRef<(() => void) | null>(null);

  const finalize = useCallback(async () => {
    const cur = qRef.current;
    if (!cur.id || !readiness(cur).ready) return false;
    setBusy((b) => ({ ...b, finalize: true }));
    try {
      if (JSON.stringify(cur) !== savedJson.current && !(await persistRef.current("auto"))) throw new Error("save");
      await finalizeAction(cur.id);
      const locked = { ...historyRef.current.present, status: "FINAL" as const };
      setDirect(replaceHistoryPresent(historyRef.current, locked));
      savedJson.current = JSON.stringify(locked);
      push("success", "Quotation finalized and locked. Duplicate it from the list to make changes.");
      return true;
    } catch { push("error", "Could not finalize the quotation. Nothing was locked; try again."); return false; }
    finally { setBusy((b) => ({ ...b, finalize: false })); }
  }, [push]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") { e.preventDefault(); if (!isFinal) void persist("manual"); }
      else if (k === "p") { e.preventDefault(); if (readiness(qRef.current).ready && !overflow) pdfShortcut.current?.(); }
      else if (k === "z" && !e.shiftKey) { e.preventDefault(); if (!isFinal) undo(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); if (!isFinal) redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist, overflow, undo, redo, isFinal]);

  const saveLabel = saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved" : !q.id ? "Not saved yet" : dirty ? "Unsaved changes" : `Saved${savedAt ? ` · ${savedAt}` : ""}`;

  return {
    q, setQ, patch, undo, redo, canUndo: history.past.length > 0 && !isFinal, canRedo: history.future.length > 0 && !isFinal,
    dirty, isFinal, saveState: saveState === "saved" && dirty ? "unsaved" as SaveState : saveState, saveLabel, persist,
    finalize, busy, overflow, setOverflow, pdfShortcut, saveBeforeExport, latest: () => qRef.current,
    status, totals, validItems, pageCount, toasts, push, dismiss,
  };
}
