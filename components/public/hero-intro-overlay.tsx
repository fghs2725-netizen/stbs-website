"use client";

import { useEffect, useRef } from "react";

/**
 * Opening animation for the homepage hero (Website -> Home -> Hero -> Opening animation).
 * It plays in a fixed overlay above the real hero, which stays exactly as designed underneath:
 *
 *   1. a water drop falls and settles as a bead, with a little hop (the dot in the reference intro)
 *   2. the gold drill grows up out of the bead like an "!", tips left and flings out the S, swings right
 *      and flings out the B and the last S; the letters tumble into place, the drill settles upright and the
 *      bead drips into the water rings. The logo is grey until the colour phase.
 *   3. the tagline (GO DEEPER BUILD STRONGER) scrambles in under it
 *   4. the logo flies up into its place in the header while grey dots drift in and form the hero photo
 *   5. the dots settle into the photo in greyscale
 *   6. colour spreads out from the centre like a ripple, uncovering the real page; the hero text animates in
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
// The HD vector logo (same 805x340 frame as stbs-logo-only.png) with each piece in its own group:
// #ih-s1 (S + the T's top bar), #ih-b, #ih-s2, #ih-drill, #ih-rings.
const PIECES_LOGO = "/brand/stbs-logo-pieces.svg";
const NOSCRIPT_CSS = ".ih-overlay{display:none!important}[data-intro-hold] .ph-copy [class*='animate-']{animation:none!important;opacity:1!important}";

export function HeroIntroOverlay({ tagline }: { tagline: string }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
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
      {/* Filled at run time with the piece-by-piece vector logo (or the header's logo as a fallback). */}
      <div ref={logoRef} className="ih-ov-logo" aria-hidden="true" />
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
// Points in the logo's own 805x340 frame.
const LOGO_W = 805, LOGO_H = 340;
const TIP = { x: 298, y: 279 };   // the drill tip, at the centre of the water rings
const HEAD = { x: 290, y: 100 };  // the drill head, where the letters are thrown from
const HOME = { s1: { x: 241, y: 130 }, b: { x: 478, y: 130 }, s2: { x: 676, y: 130 }, rings: { x: 300, y: 282 } };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const inQuad = (t: number) => t * t;
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const inOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outBack = (t: number) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);

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
  hero: HTMLElement; overlay: HTMLElement; canvas: HTMLCanvasElement; logo: HTMLDivElement;
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
  let geo = { k: 1, tx: 0, ty: 0, dw: 0, dh: 0, cx: 0, cy: 0, L: 0, T: 0, s: 1 };
  type Pieces = { s1: SVGGElement; b: SVGGElement; s2: SVGGElement; drill: SVGGElement; rings: SVGGElement };
  let pieces: Pieces | null = null;
  let drillAngle = 0;

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
  let bead: { x: number; y: number; r: number; a: number } | null = null;
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
    const nw = LOGO_W, nh = LOGO_H;
    const box = headerBox ?? { l: W / 2 - 46, t: 11, w: 92, h: 34 };
    // where the header draws its logo: contained in its box, left-aligned, centred vertically
    const hs = Math.min(box.w / nw, box.h / nh);
    const hw = nw * hs, hh = nh * hs, hl = box.l, ht = box.t + (box.h - hh) / 2;
    const bigW = Math.min(W * (W < 700 ? 0.72 : 0.4), 560), bigH = (bigW * nh) / nw;
    const cx = W / 2, cy = Math.min(H * 0.42, H / 2 - 20);
    const L = cx - bigW / 2, T = cy - bigH / 2;
    Object.assign(logo.style, { left: `${L}px`, top: `${T}px`, width: `${bigW}px`, height: `${bigH}px`, transformOrigin: "0 0" });
    geo = { k: hw / bigW, tx: hl - L, ty: ht - T, dw: bigW, dh: bigH, cx, cy, L, T, s: bigW / LOGO_W };
    tag.style.top = `${T + bigH * (305 / 340) + Math.max(16, bigH * 0.12)}px`; // just under the water rings
  }
  const setLogo = (p: number) => { // 0 = big in the centre, 1 = exactly over the header logo
    logo.style.transform = p <= 0 ? "none" : `translate(${geo.tx * p}px,${geo.ty * p}px) scale(${lerp(1, geo.k, p)})`;
  };

  /** Inlines the piece-by-piece vector logo; falls back to the header's own logo as one image. */
  async function loadLogo(fallbackSrc: string) {
    try {
      const res = await fetch(PIECES_LOGO);
      const text = res.ok ? await res.text() : "";
      if (!alive) return false;
      if (!text.includes('id="ih-drill"')) throw new Error("no pieces");
      logo.innerHTML = text;
      const q = (id: string) => logo.querySelector<SVGGElement>(`#${id}`);
      const svg = logo.querySelector("svg"), s1 = q("ih-s1"), b = q("ih-b"), s2 = q("ih-s2"), drill = q("ih-drill"), rings = q("ih-rings");
      if (!svg || !s1 || !b || !s2 || !drill || !rings) throw new Error("incomplete pieces");
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      pieces = { s1, b, s2, drill, rings };
      return true;
    } catch {
      if (!alive) return false;
      const im = document.createElement("img");
      im.alt = "";
      im.src = fallbackSrc;
      Object.assign(im.style, { display: "block", width: "100%", height: "100%", objectFit: "contain" });
      logo.replaceChildren(im);
      pieces = null;
      return whenLoaded(im, 2000);
    }
  }
  const setPiece = (g: SVGGElement, transform: string, opacity?: number) => {
    if (transform) g.setAttribute("transform", transform); else g.removeAttribute("transform");
    if (opacity === undefined) g.removeAttribute("opacity"); else g.setAttribute("opacity", opacity.toFixed(3));
  };
  /** Drill pivots on its tip; grow 0..1 stretches it up out of the bead. */
  const setDrill = (angle: number, grow: number) => {
    drillAngle = angle;
    if (pieces) setPiece(pieces.drill, `translate(${TIP.x} ${TIP.y}) rotate(${angle.toFixed(2)}) scale(1 ${grow.toFixed(3)}) translate(${-TIP.x} ${-TIP.y})`);
  };
  /** Throws a letter from the drill head (where it is right now) along an arc into its place, spinning as it lands. */
  const fling = (g: SVGGElement, home: { x: number; y: number }, spin: number, side: number, ms: number, id: number) => {
    const a = (drillAngle * Math.PI) / 180;
    const hx = TIP.x + (HEAD.x - TIP.x) * Math.cos(a) - (HEAD.y - TIP.y) * Math.sin(a);
    const hy = TIP.y + (HEAD.x - TIP.x) * Math.sin(a) + (HEAD.y - TIP.y) * Math.cos(a);
    const sx = hx - home.x, sy = hy - home.y, kx = sx * 0.45 + side * 30, ky = Math.min(sy, 0) - 150;
    return tween(ms, (_e, p) => {
      const e = outCubic(p), u = 1 - e;
      const ox = u * u * sx + 2 * u * e * kx, oy = u * u * sy + 2 * u * e * ky;
      const rot = spin * (1 - outBack(p)), sc = lerp(0.3, 1, outCubic(Math.min(1, p * 1.5)));
      setPiece(g, `translate(${ox.toFixed(2)} ${oy.toFixed(2)}) rotate(${rot.toFixed(2)} ${home.x} ${home.y}) translate(${home.x} ${home.y}) scale(${sc.toFixed(3)}) translate(${-home.x} ${-home.y})`, Math.min(1, p * 6));
    }, id, (t) => t).then(() => setPiece(g, ""));
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
  /** A small landing splash: one low ripple and a few droplets. */
  function plop(x: number, y: number, size: number) {
    const now = performance.now();
    ripples.push({ x, y, t0: now, life: 900, max: size });
    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.8, sp = 90 + Math.random() * 140;
      droplets.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 0.7 + Math.random() * 1.4, t0: now, life: 0.45 + Math.random() * 0.3 });
    }
    kick();
  }
  function drawWater(now: number) {
    let busy = false;
    if (drop) { drawDrop(drop); busy = true; }
    if (bead && bead.r > 0.3) { // the resting drop: the dot of the "!"
      const { x, y, r } = bead;
      const body = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      body.addColorStop(0, "rgba(246,251,255,0.98)");
      body.addColorStop(1, "rgba(140,185,228,0.9)");
      c.fillStyle = body;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
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
    logo.style.opacity = "1";
    if (pieces) for (const g of [pieces.s1, pieces.b, pieces.s2, pieces.drill, pieces.rings]) setPiece(g, "");
    bead = null;
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
    logo.style.opacity = "1";
    const P = pieces;
    if (P) {
      for (const g of [P.s1, P.b, P.s2, P.rings]) setPiece(g, "", 0);
      setDrill(0, 0);
    } else logo.style.opacity = "0";
    tween(900, (e) => { glow = e; kick(); }, id).catch(() => {}); // the spotlight comes up while the drop falls
    await sleep(200, id);

    // 1. a drop falls and settles as a bead just under the drill tip, then hops (the dot in the reference)
    const rd = Math.max(4.5, Math.min(10, geo.dw * 0.017));
    const bx = geo.L + TIP.x * geo.s, by = geo.T + TIP.y * geo.s + rd + Math.max(5, geo.s * 14);
    await tween(650, (e) => { drop = { x: bx, y: lerp(-rd * 4, by, e), k: 1 + 0.5 * e, r: rd }; kick(); }, id, inQuad);
    drop = null;
    bead = { x: bx, y: by, r: rd, a: 1 };
    plop(bx, by + rd, geo.dw * 0.18);
    await tween(330, (_e, p) => { if (bead) bead.y = by - Math.sin(Math.PI * p) * rd * 3.4; kick(); }, id, (t) => t);
    await tween(210, (_e, p) => { if (bead) bead.y = by - Math.sin(Math.PI * p) * rd * 1.2; kick(); }, id, (t) => t);

    if (P) {
      // 2. the drill grows up out of the bead: an "!"
      await sleep(120, id);
      await tween(380, (e) => setDrill(0, e), id, outCubic);
      await sleep(140, id);
      // 3. it tips left and flings out the S, then swings right and flings out the B and the last S
      const flights: Promise<void>[] = [];
      const throwIt = (g: SVGGElement, home: { x: number; y: number }, spin: number, side: number, ms: number) =>
        flights.push(fling(g, home, spin, side, ms, id).catch(() => {}));
      let s1 = false, b = false, s2 = false;
      await tween(420, (e, p) => {
        setDrill(-30 * e, 1);
        if (!s1 && p > 0.45) { s1 = true; throwIt(P.s1, HOME.s1, -150, -1, 640); }
      }, id);
      await tween(520, (e, p) => {
        setDrill(lerp(-30, 28, e), 1);
        if (!b && p > 0.35) { b = true; throwIt(P.b, HOME.b, 170, 1, 620); }
        if (!s2 && p > 0.7) { s2 = true; throwIt(P.s2, HOME.s2, 230, 1, 660); }
      }, id);
      // 4. the drill rocks back upright; the bead drips into the water rings
      await tween(460, (_e, p) => setDrill(28 * (1 - outBack(p)), 1), id, (t) => t);
      await Promise.all(flights);
      if (id !== runId) throw CANCEL;
      setPiece(P.drill, "");
      const tipY = geo.T + TIP.y * geo.s;
      await tween(180, (e) => { if (bead) { bead.r = rd * (1 - e); bead.y = lerp(by, tipY, e); } kick(); }, id);
      bead = null;
      const rcx = geo.L + HOME.rings.x * geo.s, rcy = geo.T + HOME.rings.y * geo.s;
      impact(rcx, rcy);
      await tween(560, (e) => {
        const sc = lerp(0.15, 1, e);
        setPiece(P.rings, `translate(${HOME.rings.x} ${HOME.rings.y}) scale(${sc.toFixed(3)}) translate(${-HOME.rings.x} ${-HOME.rings.y})`, Math.min(1, e * 2));
      }, id, outCubic);
      setPiece(P.rings, "");
    } else { // no piece file: the header's logo simply fades in over the bead
      bead = null;
      kick();
      await tween(600, (e) => { logo.style.opacity = e.toFixed(3); }, id);
    }

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
      const logoReady = loadLogo(found ? originalSrc(found.img) : FALLBACK_LOGO);
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
      logo.replaceChildren();
      pieces = null;
      tag.style.cssText = "";
      delete overlay.dataset.colour; delete overlay.dataset.released; delete overlay.dataset.done; delete overlay.dataset.live;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
