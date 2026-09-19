"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const UNSAVED_MESSAGE = "You have unsaved changes. Leave without saving?";

/** Ask before discarding edits (drawer close, cancel). Returns true when it is fine to proceed. */
export function confirmDiscard(dirty: boolean, message: string = UNSAVED_MESSAGE): boolean {
  return !dirty || window.confirm(message);
}

// One shared pair of listeners for the whole page, however many forms are dirty, so the user is asked once.
let guardCount = 0;

function onBeforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
  e.returnValue = "";
}

function onLinkClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
  const raw = anchor.getAttribute("href") ?? "";
  if (raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) return;
  let url: URL;
  try { url = new URL(anchor.href, window.location.href); } catch { return; }
  if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search) return;
  if (!window.confirm(UNSAVED_MESSAGE)) { e.preventDefault(); e.stopImmediatePropagation(); }
}

function acquireGuard() {
  if (guardCount++ === 0) {
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onLinkClick, true); // capture: runs before Next's router handles the click
  }
}

function releaseGuard() {
  if (guardCount > 0 && --guardCount === 0) {
    window.removeEventListener("beforeunload", onBeforeUnload);
    document.removeEventListener("click", onLinkClick, true);
  }
}

/** While `dirty`, warn on tab close/refresh (beforeunload) and on in-app link clicks. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    acquireGuard();
    return releaseGuard;
  }, [dirty]);
}

/**
 * Tracks whether `value` differs from the last saved snapshot. Call markSaved() after a successful save
 * (optionally with the saved value), then pass `dirty` to useUnsavedGuard and to any close/cancel handler.
 */
export function useDirtyTracker<T>(value: T) {
  const latest = useRef(value);
  latest.current = value;
  const saved = useRef(JSON.stringify(value));
  const [, bump] = useState(0);
  const markSaved = useCallback((next?: T) => {
    saved.current = JSON.stringify(next === undefined ? latest.current : next);
    bump((n) => n + 1);
  }, []);
  const dirty = JSON.stringify(value) !== saved.current;
  return { dirty, markSaved };
}

// ── Drawer registry ────────────────────────────────────────────────────────────
// The visual editor's drawers are closed from a shared header and a backdrop, far from each form's state.
// Each dirty form registers here so those close controls can ask before discarding edits.
let dirtyForms = 0;
export const anyDrawerDirty = () => dirtyForms > 0;

/** useUnsavedGuard plus registration with the drawer close controls. */
export function useDrawerGuard(dirty: boolean) {
  useUnsavedGuard(dirty);
  useEffect(() => {
    if (!dirty) return;
    dirtyForms++;
    return () => { dirtyForms = Math.max(0, dirtyForms - 1); };
  }, [dirty]);
}
