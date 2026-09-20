"use client";
import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Inertial page scrolling for the public site. Skipped for reduced-motion users and touch
 * devices (native momentum is already smooth there), and never mounted inside the editor.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, anchors: true });
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });
    return () => { cancelAnimationFrame(frame); lenis.destroy(); };
  }, []);
  return null;
}
