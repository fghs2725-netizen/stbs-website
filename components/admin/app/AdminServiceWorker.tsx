"use client";

import { useEffect } from "react";

/** Registers the admin's service worker (offline screen and enquiry notifications). Renders nothing. */
export function AdminServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" }).catch((e) => {
      console.warn("[admin] service worker registration failed", e);
    });
  }, []);
  return null;
}
