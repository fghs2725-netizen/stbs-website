"use client";

import { useEffect, useRef } from "react";

/**
 * Opening animation for the homepage hero (Website -> Home -> Hero -> Opening animation).
 * It plays in a fixed overlay above the real hero, which stays exactly as designed underneath:
 *
 *   1. a water drop falls onto the drill tip of the STBS logo; the splash ripple reveals the logo (in grey)
 *   2. the tagline (GO DEEPER BUILD STRONGER) scrambles in under it
 *   3. the logo flies up into its place in the header while grey dots drift in and form the hero photo
 *   4. the dots settle into the photo in greyscale
 *   5. colour spreads out from the centre like a ripple, uncovering the real page; the hero text animates in
 *
 * First view in a browser tab only, and only when the page opens at the top. Scrolling is locked while it
 * plays; any scroll, tap, scroll key or the Skip button jumps to the end. A repeat view gets a short
 * grey-to-colour bloom. Reduced-motion visitors and the visual editor never see it.
 *
 * The real hero <img> and heading are in the page from the first paint (the overlay only covers them),
 * so the intro does not hold back the page's Largest Contentful Paint.
 */

const SEEN_KEY = "stbs-intro-seen";
const FALLBACK_LOGO = "/stbs-logo-only.png";
// Vector trace of the STBS logo (same 805x340 frame as stbs-logo-only.png), sharp at any size.
const HD_LOGO = "/brand/stbs-logo-hd.svg";
const NOSCRIPT_CSS = ".ih-overlay{display:none!important}[data-intro-hold] .ph-copy [class*='animate-']{animation:none!important;opacity:1!important}";

export function HeroIntroOverlay({ tagline }: { tagline: string }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current, canvas = canvasRef.current, logo = logoRef.current;
    const tag = tagRef.current, skip = skipRef.current;
    const hero = overlay?.parentElement;
    if (!overlay || !canvas || !logo || !tag || !skip || !hero) return;
    const release = () => { hero.removeAttribute("data-intro-hold"); overlay.dataset.done = "1"; };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = hero.getBoundingClientRect();
    const heroOnScreen = r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.5;
    if (reduce || !heroOnScreen) { release(); return; }
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch { /* storage blocked: treat as a first visit */ }
    const full = !seen && window.scrollY < 40 && !window.location.hash;

    const engine = createIntro({ hero, overlay, canvas, logo, tag, skip, tagline });
    if (!engine) { release(); return; }
    engine.start(full ? "full" : "quick", () => { try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ } });
    return () => engine.destroy();
  }, [tagline]);

  return (
    <div ref={overlayRef} className="ih-overlay">
      <noscript><style>{NOSCRIPT_CSS}</style></noscript>
      <canvas ref={canvasRef} className="ih-ov-canvas" aria-hidden="true" />
      {/* Plain <img>: its source is the header's own logo, read at run time. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={logoRef} className="ih-ov-logo" alt="" aria-hidden="true" />
      <span ref={tagRef} className="ih-ov-tag" aria-hidden="true">{tagline || " "}</span>
      <button ref={skipRef} type="button" className="ih-skip">Skip intro</button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

type Mode = "full" | "quick";
interface Box { l: number; t: number; w: number; h: number }
interface Dot {
  x: number; y: number; sx: number; sy: number; tx: number; ty: number; vx: number; vy: number;
  d: number; dur: number; sw: number; rgb: number; lum: number; st: boolean;
}
interface Droplet { x: number; y: number; vx: number; vy: number; r: number; t0: number; life: number }
interface Ripple { x: number; y: number; t0: number; life: number; max: number }

const BASE = "#131819"; // --brand-deep, the hero band and header colour
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=";
const SKIP_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Spacebar", "Escape", "Enter"]);
// Where the drill tip meets the water rings in the STBS logo artwork (fractions of the image).
const DRILL_TIP = { x: 0.37, y: 0.8 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const inQuad = (t: number) => t * t;
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const inOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** The original file behind a next/image URL, so the big logo is sharp. */
function originalSrc(im: HTMLImageElement) {
  const src = im.currentSrc || im.src;
  try {
    const u = new URL(src, window.location.href);
    if (u.pathname === "/_next/image") return u.searchParams.get("url") || src;
  } catch { /* keep src */ }
  return src;
}
function objectPos(im: HTMLImageElement) {
  const parts = getComputedStyle(im).objectPosition.split(/\s+/);
  const f = (v: string | undefined) => (v && v.endsWith("%") ? parseFloat(v) / 100 : 0.5);
  return { x: f(parts[0]), y: f(parts[1]) };
}
function whenLoaded(im: HTMLImageElement, timeout: number) {
  return new Promise<boolean>((res) => {
    if (im.complete && im.naturalWidth > 0) { im.decode().then(() => res(true), () => res(true)); return; }
    const t = window.setTimeout(() => res(im.naturalWidth > 0), timeout);
    im.addEventListener("load", () => { window.clearTimeout(t); im.decode().then(() => res(true), () => res(true)); }, { once: true });
    im.addEventListener("error", () => { window.clearTimeout(t); res(false); }, { once: true });
  });
}

function createIntro(els: {
  hero: HTMLElement; overlay: HTMLElement; canvas: HTMLCanvasElement; logo: HTMLImageElement;
  tag: HTMLSpanElement; skip: HTMLButtonElement; tagline: string;
}) {
  const { hero, overlay, canvas, logo, tag, skip, tagline } = els;
  const ctx = canvas.getContext("2d");
  const tagText = tag.firstChild;
  if (!ctx || !(tagText instanceof Text)) return null;
  const c: CanvasRenderingContext2D = ctx;
  const tagNode: Text = tagText;
  const html = document.documentElement;

  let alive = true, runId = 0, mode: Mode = "quick", onSeen = () => {};
  let W = 0, H = 0, dpr = 1;
  let playing = false, released = false, locked = false;

  // hero photo, in grey
  let heroImg: HTMLImageElement | null = null;
  let sec: Box = { l: 0, t: 0, w: 0, h: 0 };
  let visH = 0;
  let grey: HTMLCanvasElement | null = null;
  let photoAlpha = 0;

  // logo flight
  let headerBox: Box | null = null;
  let geo = { k: 1, tx: 0, ty: 0, dw: 0, dh: 0, cx: 0, cy: 0, tipX: 0, tipY: 0, lx: 0, ly: 0 };

  // dots
  const mos = document.createElement("canvas");
  const mctx = mos.getContext("2d");
  let mData: ImageData | null = null, mBuf: Uint32Array | null = null, mosaicFresh = false;
  let dots: Dot[] = [];
  let sq = 4, ms = 1;

  // phases after the words: assemble (dots fly in) -> grey (dots settle into the grey photo) -> hole (colour spreads) -> done
  let pState: "off" | "assemble" | "grey" | "hole" | "done" = "off";
  let pT0 = 0, greyT0 = 0, greyMs = 700, holeT0 = 0, holeMs = 1300, holeMax = 1, speed = 1;
  let glow = 0;

  // water
  let drop: { x: number; y: number; k: number; r: number } | null = null;
  let flash: { x: number; y: number; t0: number } | null = null;
  const droplets: Droplet[] = [];
  const ripples: Ripple[] = [];

  let raf = 0, running = false;
  const timers = new Set<number>();
  const CANCEL = Symbol("cancel");

  const after = (ms: number, fn: () => void) => {
    const t = window.setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
    timers.add(t);
  };
  const sleep = (ms: number, id: number) => new Promise<void>((res, rej) => after(ms, () => (id === runId ? res() : rej(CANCEL))));
  const tween = (ms: number, fn: (e: number, p: number) => void, id: number, ease: (t: number) => number = inOutCubic) =>
    new Promise<void>((res, rej) => {
      const t0 = performance.now();
      const step = (now: number) => {
        if (!alive || id !== runId) { rej(CANCEL); return; }
        const p = clamp01((now - t0) / ms);
        fn(ease(p), p);
        if (p < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });

  /* ---------- setup ---------- */
  function measure() {
    W = overlay.clientWidth || window.innerWidth; H = overlay.clientHeight || window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const r = hero.getBoundingClientRect();
    sec = { l: r.left, t: r.top, w: r.width, h: r.height };
    visH = Math.max(0, Math.min(sec.h, H - sec.t));
    holeMax = Math.hypot(W, H) * 0.62 + 140;
    // Resizing a canvas clears it, and the overlay's own backdrop is gone once the canvas is live:
    // repaint in the same frame so the page underneath never flashes through.
    if (overlay.dataset.live) { if (raf) cancelAnimationFrame(raf); raf = 0; running = true; frame(performance.now()); }
  }
  function findHeaderLogo() {
    const header = document.querySelector("header");
    const imgs = header ? Array.from(header.querySelectorAll<HTMLImageElement>("a img")) : [];
    const vis = imgs.find((i) => i.offsetParent !== null && i.getBoundingClientRect().width > 0);
    if (!vis) return null;
    const b = (vis.parentElement ?? vis).getBoundingClientRect();
    return { img: vis, box: { l: b.left, t: b.top, w: b.width, h: b.height } };
  }
  function findHeroImg() {
    return Array.from(hero.querySelectorAll<HTMLImageElement>("img")).find((i) => !overlay.contains(i) && i.offsetParent !== null) ?? null;
  }

  /**
   * Lays the logo out at its big mid-screen size, so it is drawn sharp, and works out the transform
   * that shrinks it onto the header logo. (Scaling a small image up is what made it soft.)
   */
  function placeLogo() {
    const nw = logo.naturalWidth || 805, nh = logo.naturalHeight || 340;
    const box = headerBox ?? { l: W / 2 - 46, t: 11, w: 92, h: 34 };
    // where the header draws its logo: contained in its box, left-aligned, centred vertically
    const hs = Math.min(box.w / nw, box.h / nh);
    const hw = nw * hs, hh = nh * hs, hl = box.l, ht = box.t + (box.h - hh) / 2;
    const bigW = Math.min(W * (W < 700 ? 0.72 : 0.4), 560), bigH = (bigW * nh) / nw;
    const cx = W / 2, cy = Math.min(H * 0.42, H / 2 - 20);
    const L = cx - bigW / 2, T = cy - bigH / 2;
    Object.assign(logo.style, { left: `${L}px`, top: `${T}px`, width: `${bigW}px`, height: `${bigH}px`, transformOrigin: "0 0" });
    geo = {
      k: hw / bigW, tx: hl - L, ty: ht - T, dw: bigW, dh: bigH, cx, cy,
      tipX: L + DRILL_TIP.x * bigW, tipY: T + DRILL_TIP.y * bigH,
      lx: DRILL_TIP.x * bigW, ly: DRILL_TIP.y * bigH,
    };
    tag.style.top = `${T + bigH * (305 / 340) + Math.max(16, bigH * 0.12)}px`; // just under the water rings
  }
  const setLogo = (p: number) => { // 0 = big in the centre, 1 = exactly over the header logo
    logo.style.transform = p <= 0 ? "none" : `translate(${geo.tx * p}px,${geo.ty * p}px) scale(${lerp(1, geo.k, p)})`;
  };

  /** The hero photo exactly as the page frames it, desaturated, with the hero's own scrim baked in. */
  function buildGrey() {
    grey = null;
    if (!heroImg || !heroImg.naturalWidth || visH < 2) return;
    const g0 = document.createElement("canvas");
    g0.width = Math.round(sec.w * dpr); g0.height = Math.round(visH * dpr);
    const g = g0.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);
    const nw = heroImg.naturalWidth, nh = heroImg.naturalHeight, pos = objectPos(heroImg);
    const s = Math.max(sec.w / nw, sec.h / nh), dw = nw * s, dh = nh * s;
    g.drawImage(heroImg, (sec.w - dw) * pos.x, (sec.h - dh) * pos.y, dw, dh);
    g.globalCompositeOperation = "saturation"; // keeps brightness, drops colour (works in every browser)
    g.fillStyle = "#808080";
    g.fillRect(0, 0, sec.w, visH);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "rgba(11,15,16,0.5)"; // .hero-scrim
    g.fillRect(0, 0, sec.w, visH);
    if (sec.h - visH < 1) { // the hero's bottom fade (h-40, black/50) is on screen
      const fade = g.createLinearGradient(0, sec.h, 0, sec.h - 160);
      fade.addColorStop(0, "rgba(0,0,0,0.5)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = fade;
      g.fillRect(0, sec.h - 160, sec.w, 160);
    }
    grey = g0;
  }

  /* ---------- dots ---------- */
  function buildDots() {
    dots = [];
    if (!grey || !mctx) return;
    const gap = Math.max(4, Math.min(9, Math.round(Math.sqrt((sec.w * visH) / 20000))));
    const cols = Math.floor((sec.w - (gap - 1)) / gap) + 1, rows = Math.floor((visH - (gap - 1)) / gap) + 1;
    const tmp = document.createElement("canvas");
    tmp.width = Math.max(1, cols); tmp.height = Math.max(1, rows);
    const g = tmp.getContext("2d", { willReadFrequently: true });
    if (!g) return;
    g.imageSmoothingQuality = "medium";
    g.drawImage(grey, 0, 0, cols, rows); // one pixel per dot: the downscale averages each cell
    let data: Uint8ClampedArray;
    try { data = g.getImageData(0, 0, cols, rows).data; } catch { return; }
    const sw = Math.min(140, W * 0.1);
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = (cy * cols + cx) * 4;
        const lum = data[i] / 255;
        if (lum < 0.035) continue;
        const v = Math.min(1, lum * 1.9); // the grey photo is under a 50% scrim; dots run brighter, then settle
        dots.push({
          x: Math.random() * W, y: Math.random() * H, sx: 0, sy: 0, tx: sec.l + cx * gap, ty: sec.t + cy * gap,
          vx: (Math.random() - 0.5) * 0.4, vy: 0.3 + Math.random() * 0.9, d: 0, dur: 0, sw: (Math.random() - 0.5) * 2 * sw,
          rgb: (Math.round(v * 246) << 16) | (Math.round(v * 240) << 8) | Math.round(v * 234), lum, st: false,
        });
      }
    }
    ms = Math.min(1, Math.sqrt(1_500_000 / (W * H)));
    sq = Math.max(1, Math.round((gap - 1) * ms));
    mos.width = Math.max(1, Math.ceil(W * ms)); mos.height = Math.max(1, Math.ceil(H * ms));
    mData = mctx.createImageData(mos.width, mos.height);
    mBuf = new Uint32Array(mData.data.buffer);
  }
  function beginDots() {
    if (pState !== "off") return;
    if (!grey) { startHole(600); return; } // no photo to build: just uncover the page
    buildDots();
    if (!dots.length) { startGrey(500); return; }
    for (const p of dots) {
      p.d = ((1 - Math.min(1, p.lum * 2.2)) * 750 + Math.random() * 260) * speed; // the bright water arrives first
      p.dur = (780 + Math.random() * 380) * speed;
    }
    pState = "assemble";
    pT0 = performance.now();
    kick();
  }
  function startGrey(ms_: number) { pState = "grey"; greyMs = ms_; greyT0 = performance.now(); mosaicFresh = false; kick(); }
  function startHole(ms_: number) {
    if (pState === "hole" || pState === "done") return;
    if (grey) photoAlpha = 1;
    pState = "hole"; holeMs = ms_; holeT0 = performance.now();
    overlay.dataset.colour = "1"; // the logo takes its colour back (CSS)
    kick();
  }
  function drawMosaic(now: number) {
    if (!mBuf || !mData || !mctx) return true;
    const buf = mBuf, mw = mos.width, mh = mos.height, t = now - pT0;
    buf.fill(0);
    let allDone = true;
    for (const p of dots) {
      let a: number;
      if (pState === "assemble" && t < p.d) { // drifting down like spray
        p.x += p.vx; p.y += p.vy;
        if (p.y > H) p.y -= H;
        if (p.x < 0) p.x += W; else if (p.x > W) p.x -= W;
        a = 0.3 * clamp01(t / 400);
        allDone = false;
      } else if (pState === "assemble") {
        if (!p.st) { p.st = true; p.sx = p.x; p.sy = p.y; }
        const q = clamp01((t - p.d) / p.dur), e = inOutCubic(q);
        const dx = p.tx - p.sx, dy = p.ty - p.sy, len = Math.hypot(dx, dy) || 1, arc = Math.sin(Math.PI * e) * p.sw;
        p.x = p.sx + dx * e - (dy / len) * arc;
        p.y = p.sy + dy * e + (dx / len) * arc;
        a = 0.3 + 0.7 * e;
        if (q < 1) allDone = false;
      } else { p.x = p.tx; p.y = p.ty; a = 1; }
      const ix = Math.round(p.x * ms), iy = Math.round(p.y * ms);
      if (ix < 0 || iy < 0 || ix + sq > mw || iy + sq > mh) continue;
      const px = ((((a * 255) | 0) << 24) | p.rgb) >>> 0;
      for (let yy = 0; yy < sq; yy++) {
        let o = (iy + yy) * mw + ix;
        for (let xx = 0; xx < sq; xx++) buf[o++] = px;
      }
    }
    mctx.putImageData(mData, 0, 0);
    return allDone;
  }

  /* ---------- water ---------- */
  function drawDrop(d: { x: number; y: number; k: number; r: number }) {
    const { x, y, k, r } = d;
    const top = y - r * 2.7 * k;
    const trail = c.createLinearGradient(x, top - 70 * k, x, top);
    trail.addColorStop(0, "rgba(206,228,250,0)");
    trail.addColorStop(1, "rgba(206,228,250,0.28)");
    c.fillStyle = trail;
    c.fillRect(x - 0.75, top - 70 * k, 1.5, 70 * k);
    const body = c.createLinearGradient(x - r, top, x + r, y + r);
    body.addColorStop(0, "rgba(236,246,255,0.96)");
    body.addColorStop(1, "rgba(120,170,220,0.88)");
    c.fillStyle = body;
    c.beginPath();
    c.moveTo(x, top);
    c.bezierCurveTo(x + r * 0.25, y - r * 1.7 * k, x + r, y - r * 0.9, x + r, y);
    c.arc(x, y, r, 0, Math.PI);
    c.bezierCurveTo(x - r, y - r * 0.9, x - r * 0.25, y - r * 1.7 * k, x, top);
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.9)";
    c.beginPath();
    c.ellipse(x - r * 0.38, y - r * 0.2, r * 0.2, r * 0.34, -0.4, 0, Math.PI * 2);
    c.fill();
  }
  function impact(x: number, y: number) {
    const now = performance.now();
    flash = { x, y, t0: now };
    const reach = Math.max(W, H) * 0.55;
    ripples.push(
      { x, y, t0: now, life: 1500, max: reach },
      { x, y, t0: now + 150, life: 1500, max: reach * 0.78 },
      { x, y, t0: now + 320, life: 1400, max: reach * 0.58 },
    );
    const k = Math.max(0.6, Math.min(1, W / 1440));
    for (let i = 0; i < 24; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = (180 + Math.random() * 320) * k;
      droplets.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 0.8 + Math.random() * 2.2, t0: now, life: 0.6 + Math.random() * 0.4 });
    }
    kick();
  }
  function drawWater(now: number) {
    let busy = false;
    if (drop) { drawDrop(drop); busy = true; }
    if (flash) {
      const q = (now - flash.t0) / 420;
      if (q < 1) {
        const rad = 30 + 90 * q;
        const gl = c.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, rad);
        gl.addColorStop(0, `rgba(220,238,255,${(0.45 * (1 - q)).toFixed(3)})`);
        gl.addColorStop(1, "rgba(220,238,255,0)");
        c.fillStyle = gl;
        c.fillRect(flash.x - rad, flash.y - rad, rad * 2, rad * 2);
        busy = true;
      } else flash = null;
    }
    c.lineWidth = 1.4;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i], q = (now - rp.t0) / rp.life;
      if (q >= 1) { ripples.splice(i, 1); continue; }
      busy = true;
      if (q < 0) continue;
      const R = rp.max * outCubic(q);
      c.strokeStyle = `rgba(206,228,250,${(0.55 * (1 - q)).toFixed(3)})`;
      c.beginPath();
      c.ellipse(rp.x, rp.y, R, R * 0.28, 0, 0, Math.PI * 2); // flat like the rings in the logo
      c.stroke();
    }
    for (let i = droplets.length - 1; i >= 0; i--) {
      const s = droplets[i], age = (now - s.t0) / 1000;
      if (age > s.life) { droplets.splice(i, 1); continue; }
      busy = true;
      c.fillStyle = `rgba(214,236,255,${(0.85 * (1 - age / s.life)).toFixed(3)})`;
      c.beginPath();
      c.arc(s.x + s.vx * age, s.y + s.vy * age + 700 * age * age, s.r, 0, Math.PI * 2);
      c.fill();
    }
    return busy;
  }

  /* ---------- render loop ---------- */
  function frame(now: number) {
    raf = 0;
    if (!alive) { running = false; return; }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, W, H);
    c.fillStyle = BASE;
    c.fillRect(0, 0, W, H);
    if (!overlay.dataset.live) overlay.dataset.live = "1"; // the canvas now paints the backdrop; the CSS one must go for the colour hole
    let busy = false;

    if (glow > 0) {
      const gl = c.createRadialGradient(geo.cx, geo.cy, 0, geo.cx, geo.cy, Math.max(W, H) * 0.55);
      gl.addColorStop(0, `rgba(206,228,250,${(0.07 * glow).toFixed(3)})`);
      gl.addColorStop(1, "rgba(206,228,250,0)");
      c.fillStyle = gl;
      c.fillRect(0, 0, W, H);
    }
    if (pState === "grey") {
      const q = clamp01((now - greyT0) / greyMs);
      photoAlpha = inOutCubic(q);
      busy = true;
      if (q >= 1) { photoAlpha = 1; startHole(mode === "full" ? 1400 : 800); }
    }
    if (photoAlpha > 0 && grey) {
      c.globalAlpha = photoAlpha;
      c.drawImage(grey, sec.l, sec.t, sec.w, visH);
      c.globalAlpha = 1;
    }
    if ((pState === "assemble" || pState === "grey") && dots.length) {
      if (pState === "assemble") {
        if (drawMosaic(now)) startGrey(speed < 1 ? 400 : 700);
        busy = true;
      } else if (!mosaicFresh) { drawMosaic(now); mosaicFresh = true; }
      c.globalAlpha = 1 - photoAlpha;
      c.imageSmoothingEnabled = false;
      c.drawImage(mos, 0, 0, W, H);
      c.imageSmoothingEnabled = true;
      c.globalAlpha = 1;
    }
    if (drawWater(now)) busy = true;

    if (pState === "hole") { // colour spreads from the centre: cut the grey layer away to the real page beneath
      const q = clamp01((now - holeT0) / holeMs), R = holeMax * inOutCubic(q), feather = 140;
      const hx = W / 2, hy = sec.t + visH / 2;
      if (R > 0) {
        c.globalCompositeOperation = "destination-out";
        const cut = c.createRadialGradient(hx, hy, Math.max(0, R - feather), hx, hy, R);
        cut.addColorStop(0, "rgba(0,0,0,1)");
        cut.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = cut;
        c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = "source-over";
        c.strokeStyle = `rgba(206,228,250,${(0.22 * (1 - q)).toFixed(3)})`;
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(hx, hy, Math.max(1, R - feather * 0.5), 0, Math.PI * 2);
        c.stroke();
      }
      if (q > 0.35) releasePage();
      if (q >= 1) { finish(); return; }
      busy = true;
    }
    if (busy) raf = requestAnimationFrame(frame);
    else running = false;
  }
  function kick() {
    if (running || !alive) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  /* ---------- gate ---------- */
  const onWheel = (e: Event) => { e.preventDefault(); e.stopPropagation(); skipIntro(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Tab") { skipIntro(); return; }
    if (SKIP_KEYS.has(e.key)) { e.preventDefault(); skipIntro(); }
  };
  const onPointer = () => skipIntro();
  // A real resize (rotation, window drag) skips; a phone's address bar changing height does not.
  const onResize = () => { if (Math.abs(window.innerWidth - lockW) > 2) skipIntro(); };
  let lockW = 0;
  function lock() {
    locked = true;
    lockW = window.innerWidth;
    html.style.overflow = "hidden";
    html.style.scrollbarGutter = "stable"; // hiding the scrollbar must not shift the page sideways
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("touchmove", onWheel, { capture: true, passive: false });
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("pointerdown", onPointer, { capture: true });
    window.addEventListener("resize", onResize);
  }
  function unlock() {
    if (!locked) return;
    locked = false;
    html.style.overflow = "";
    html.style.scrollbarGutter = "";
    window.removeEventListener("wheel", onWheel, { capture: true });
    window.removeEventListener("touchmove", onWheel, { capture: true });
    window.removeEventListener("keydown", onKey, { capture: true });
    window.removeEventListener("pointerdown", onPointer, { capture: true });
    window.removeEventListener("resize", onResize);
  }
  /** Hero text animates in, scrolling comes back. */
  function releasePage() {
    if (released) return;
    released = true;
    playing = false;
    overlay.dataset.released = "1"; // hides the Skip button
    hero.removeAttribute("data-intro-hold");
    unlock();
    onSeen();
  }
  function finish() {
    running = false;
    pState = "done";
    releasePage();
    overlay.dataset.done = "1";
  }
  function skipIntro() {
    if (!playing) return;
    runId++;
    drop = null; flash = null; droplets.length = 0; ripples.length = 0;
    tag.style.opacity = "0";
    logo.style.clipPath = "";
    logo.style.opacity = "1";
    setLogo(1);
    playing = false;
    releasePage();
    if (grey) { mosaicFresh = false; startHole(550); } else finish();
  }

  /* ---------- the full sequence ---------- */
  function scramble(to: string, id: number) {
    const len = to.length;
    const stagger = Math.max(35, Math.min(80, 900 / Math.max(1, len))), flick = 200, total = (len - 1) * stagger + flick;
    return new Promise<void>((res, rej) => {
      const t0 = performance.now();
      let last = -1;
      const step = (now: number) => {
        if (!alive || id !== runId) { rej(CANCEL); return; }
        const t = now - t0, tick = Math.floor(t / 50);
        if (tick !== last) {
          last = tick;
          let out = "";
          for (let i = 0; i < len; i++) {
            const ti = i * stagger;
            if (t < ti) out += " ";
            else if (t < ti + flick && to[i].trim()) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
            else out += to[i];
          }
          tagNode.nodeValue = out;
        }
        if (t < total) requestAnimationFrame(step);
        else { tagNode.nodeValue = to; res(); }
      };
      requestAnimationFrame(step);
    });
  }

  async function fullSequence(id: number) {
    placeLogo();
    setLogo(0);
    logo.style.clipPath = "ellipse(0px 0px at 50% 50%)";
    logo.style.opacity = "1";
    tween(900, (e) => { glow = e; kick(); }, id).catch(() => {}); // the spotlight comes up while the drop falls
    await sleep(200, id);

    // 1. a drop falls onto the drill tip; its ripple uncovers the logo
    const rd = Math.max(6, Math.min(11, W * 0.008));
    await tween(680, (e) => { drop = { x: geo.tipX, y: lerp(-rd * 4, geo.tipY, e), k: 1 + 0.5 * e, r: rd }; kick(); }, id, inQuad);
    drop = null;
    impact(geo.tipX, geo.tipY);
    const big = { w: geo.dw, h: geo.dh };
    const dx = Math.max(geo.tipX - (geo.cx - big.w / 2), geo.cx + big.w / 2 - geo.tipX);
    const dy = Math.max(geo.tipY - (geo.cy - big.h / 2), geo.cy + big.h / 2 - geo.tipY);
    const reach = Math.hypot(dx, dy / 0.5) + 8;
    await tween(1000, (e) => {
      const R = reach * e;
      logo.style.clipPath = `ellipse(${R.toFixed(1)}px ${(R * 0.5).toFixed(1)}px at ${geo.lx.toFixed(1)}px ${geo.ly.toFixed(1)}px)`;
    }, id, outCubic);
    logo.style.clipPath = "";

    // 2. the tagline scrambles in under the logo
    if (tagline) {
      await sleep(150, id);
      tag.style.opacity = "1";
      await scramble(tagline, id);
      await sleep(650, id);
    } else await sleep(500, id);

    // 3. the logo flies into the header; grey dots drift in and start forming the photo
    tag.style.opacity = "0";
    let started = false;
    await tween(950, (e, p) => {
      setLogo(e);
      glow = 1 - e;
      if (!started && p > 0.15) { started = true; speed = 1; beginDots(); }
    }, id);
    // 4-5 continue in the render loop: dots -> grey photo -> colour spreads -> page released
  }

  return {
    start(m: Mode, seen: () => void) {
      mode = m;
      onSeen = seen;
      measure();
      const id = runId;
      if (m === "full") { playing = true; lock(); after(14000, () => skipIntro()); }
      kick(); // paint the dark base straight away
      skip.addEventListener("click", skipIntro);

      const found = findHeaderLogo();
      headerBox = found?.box ?? null;
      const fallbackSrc = found ? originalSrc(found.img) : FALLBACK_LOGO;
      logo.src = HD_LOGO;
      const logoReady = whenLoaded(logo, 2000).then((ok) => {
        if (ok) return true;
        logo.src = fallbackSrc; // HD file missing: use the header's own logo
        return whenLoaded(logo, 2000);
      });
      heroImg = findHeroImg();
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      Promise.all([
        logoReady,
        heroImg ? whenLoaded(heroImg, 3000) : Promise.resolve(false),
        Promise.race([fontsReady, new Promise((r) => window.setTimeout(r, 1200))]),
      ]).then(([, heroOk]) => {
        if (!alive) return;
        measure();
        if (heroOk) buildGrey();
        if (m === "quick") { // repeat view: the photo in grey, then colour blooms out
          releasePage();
          if (grey) { photoAlpha = 1; startHole(800); } else finish();
          return;
        }
        if (!playing) return; // skipped while loading
        fullSequence(id).catch((err) => { if (err !== CANCEL) skipIntro(); });
      });
    },
    destroy() {
      alive = false;
      runId++;
      if (raf) cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      unlock();
      skip.removeEventListener("click", skipIntro);
      tagNode.nodeValue = tagline || " ";
      logo.style.cssText = "";
      tag.style.cssText = "";
      delete overlay.dataset.colour; delete overlay.dataset.released; delete overlay.dataset.done; delete overlay.dataset.live;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
