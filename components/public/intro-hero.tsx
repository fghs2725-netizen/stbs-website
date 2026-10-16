"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Editable } from "@/components/website/editable";
import { useWebsiteEditor } from "@/lib/website/editor-context";
import type { SerializedSection } from "@/lib/website/action-types";

/**
 * Animated homepage hero ("intro" style of the hero section).
 *
 * First homepage view in a browser tab:
 *   1. a water drop falls and splashes; the ripple reveals the intro word (STBS)
 *   2. the letters scramble into the hero line (BUILDING DEEP LINE), fitted on 1-3 lines
 *   3. the line drops to the bottom and grows to the full container width
 *   4. the hero photo forms out of drifting dots, brightest parts (the water) first
 *   5. the dots dissolve into the real photo; header, copy and CTAs appear and scrolling unlocks
 * While it plays the header and WhatsApp button are hidden and the page cannot scroll;
 * any scroll, tap, scroll key or the Skip button jumps straight to the end.
 *
 * Later views in the same tab skip the words and only re-form the photo (about a second).
 * The visual editor and reduced-motion visitors get the finished frame.
 *
 * The photo is drawn on the canvas (not an <img>), so the intro does not count against the
 * page's Largest Contentful Paint. Heading, subheadline and CTAs are server-rendered children.
 */

const SEEN_KEY = "stbs-intro-seen";
type Mode = "full" | "quick" | "still";

const NOSCRIPT_CSS =
  ".intro-hero .ih-word,.intro-hero .ih-copy,[data-hide-during-intro]{opacity:1!important;visibility:visible!important;transform:none!important;pointer-events:auto!important}" +
  ".intro-hero .ih-skip{display:none!important}";

export function IntroHero({
  introWord,
  heroWord,
  photo,
  mobilePhoto,
  photoAlt,
  editTarget,
  children,
}: {
  introWord: string;
  heroWord: string;
  photo: string;
  mobilePhoto?: string;
  photoAlt: string;
  editTarget?: SerializedSection;
  children: ReactNode;
}) {
  const editor = useWebsiteEditor();
  const editing = editor.isEditor;
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current, foot = footRef.current;
    const word = wordRef.current, skip = skipRef.current;
    if (!stage || !canvas || !foot || !word || !skip) return;
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch { /* storage blocked: treat as a first visit */ }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const atTop = window.scrollY < 40 && !window.location.hash;
    const mode: Mode = editing || reduce ? "still" : !seen && atTop ? "full" : "quick";
    const engine = createIntro({ stage, canvas, foot, word, skip, introWord, heroWord, photo, mobilePhoto });
    if (!engine) { delete stage.dataset.playing; stage.dataset.word = stage.dataset.ready = "1"; return; }
    engine.start(mode, () => { try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ } });
    return () => engine.destroy();
  }, [introWord, heroWord, photo, mobilePhoto, editing]);

  const wordNode = <span ref={wordRef} className="ih-word" aria-hidden="true">{heroWord}</span>;
  const canvasNode = <canvas ref={canvasRef} className="ih-canvas" role="img" aria-label={photoAlt} />;

  return (
    <section
      ref={stageRef}
      className={`intro-hero band-deep relative isolate overflow-hidden${editing ? "" : " ih-under-nav"}`}
      // Rendered "playing" so a first visit never flashes the header before the script takes over.
      // The script removes it at once for repeat visits, the editor and reduced motion.
      data-playing={editing ? undefined : ""}
    >
      <noscript>
        <style>{NOSCRIPT_CSS}</style>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className="ih-noscript-photo" />
      </noscript>
      {editTarget ? (
        <Editable target={{ kind: "section-field", section: editTarget, fieldKey: "heroImage" }} label="Edit Image" className="absolute inset-0">
          {canvasNode}
        </Editable>
      ) : canvasNode}
      <button ref={skipRef} type="button" className="ih-skip">Skip intro</button>
      <div ref={footRef} className="ih-foot container-x">
        {editTarget ? (
          <Editable target={{ kind: "section-field", section: editTarget, fieldKey: "heroWord" }} label="Big word" className="max-w-fit">
            {wordNode}
          </Editable>
        ) : wordNode}
        <div className="ih-copy">{children}</div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=";
const OPTIMIZER_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048];
const LINE_HEIGHT = 0.9; // keep in sync with .ih-word line-height
const SKIP_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Spacebar", "Escape", "Enter"]);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const inQuad = (t: number) => t * t;
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const inOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const inOutQuart = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);

interface Dot {
  x: number; y: number; sx: number; sy: number; tx: number; ty: number; vx: number; vy: number;
  d: number; dur: number; sw: number; rgb: number; lum: number; st: boolean;
}
interface Box { l: number; t: number; w: number; h: number }
interface Droplet { x: number; y: number; vx: number; vy: number; r: number; t0: number; life: number }
interface Ripple { x: number; y: number; t0: number; life: number; max: number }

/** Every way to break the words into 1..max consecutive lines. */
function lineSplits(words: string[], max: number): string[][] {
  const out: string[][] = [];
  const walk = (start: number, acc: string[]) => {
    if (start === words.length) { out.push(acc); return; }
    if (acc.length === max) return;
    for (let end = start + 1; end <= words.length; end++) walk(end, [...acc, words.slice(start, end).join(" ")]);
  };
  walk(0, []);
  return out.length ? out : [[words.join(" ")]];
}

function createIntro(els: {
  stage: HTMLElement; canvas: HTMLCanvasElement; foot: HTMLElement; word: HTMLSpanElement; skip: HTMLButtonElement;
  introWord: string; heroWord: string; photo: string; mobilePhoto?: string;
}) {
  const { stage, canvas, foot, word, skip, introWord, heroWord, photo, mobilePhoto } = els;
  const ctx = canvas.getContext("2d");
  const first = word.firstChild;
  if (!ctx || !(first instanceof Text)) return null;
  const c: CanvasRenderingContext2D = ctx;
  const textNode: Text = first;
  const html = document.documentElement;
  // Mutate the existing text node so React keeps ownership of it.
  const setText = (s: string) => { textNode.nodeValue = s; };

  let alive = true;
  let runId = 0;
  let mode: Mode = "quick";
  let onSeen = () => {};
  let W = 0, H = 0, dpr = 1;
  let heroText = heroWord;
  let introMax = 1;
  let introT = { tx: 0, ty: 0, s: 1 };
  let playing = false, revealed = false, skipToPhoto = false, locked = false;

  // photo
  let img: HTMLImageElement | null = null;
  let variant: "wide" | "tall" | null = null;
  let photoState: "loading" | "ready" | "failed" = "loading";
  let photoAlpha = 0;

  // dots
  const mos = document.createElement("canvas");
  const mctx = mos.getContext("2d");
  let mData: ImageData | null = null, mBuf: Uint32Array | null = null, mosaicFresh = false;
  let dots: Dot[] = [];
  let sq = 4, ms = 1; // dot size in mosaic pixels; mosaic pixels per CSS pixel
  let pState: "off" | "wait" | "assemble" | "resolve" | "done" = "off";
  let pT0 = 0, resolveT0 = 0, resolveMs = 900, speed = 1;

  // water effects
  let drop: { x: number; y: number; k: number; r: number } | null = null;
  let flash: { x: number; y: number; t0: number } | null = null;
  const droplets: Droplet[] = [];
  const ripples: Ripple[] = [];

  let raf = 0, running = false, visible = true;
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

  /* ---------- geometry ---------- */
  const rel = (r: DOMRect): Box => {
    const s = stage.getBoundingClientRect();
    return { l: r.left - s.left, t: r.top - s.top, w: r.width, h: r.height };
  };
  const layoutBox = (): Box => { // the word's box without the intro transform
    const prev = word.style.transform;
    word.style.transform = "none";
    const b = rel(word.getBoundingClientRect());
    word.style.transform = prev;
    return b;
  };
  const applyT = (t: { tx: number; ty: number; s: number }) => { word.style.transform = `translate(${t.tx}px,${t.ty}px) scale(${t.s})`; };

  function sizeCanvas() {
    W = stage.clientWidth; H = stage.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
  }

  /** Picks the line breaks that give the biggest type, then sizes the word to the container. */
  function fitWord() {
    const cs = getComputedStyle(foot);
    const avail = foot.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const keep = textNode.nodeValue ?? heroWord, keepT = word.style.transform;
    word.style.transform = "none";
    word.style.fontSize = "100px";
    const cache = new Map<string, number>();
    const measure = (s: string) => {
      let w = cache.get(s);
      if (w === undefined) { setText(s); w = word.offsetWidth || 1; cache.set(s, w); }
      return w;
    };
    const budget = H * (W < 700 ? 0.26 : 0.3);
    let best = { text: heroWord, size: 40, score: -1 };
    for (const lines of lineSplits(heroWord.split(/\s+/).filter(Boolean), 3)) {
      const longest = Math.max(...lines.map(measure));
      const size = Math.min((avail * 0.995 * 100) / longest, budget / (lines.length * LINE_HEIGHT + 0.1));
      const score = size * (lines.length === 1 ? 1 : lines.length === 2 ? 0.93 : 0.86);
      if (score > best.score) best = { text: lines.join("\n"), size, score };
    }
    const introAt100 = measure(introWord);
    heroText = best.text;
    word.style.fontSize = `${best.size.toFixed(2)}px`;
    // The intro word sits mid-screen at ~45% of the width (62% on phones).
    introMax = Math.min(1.35, (W * (W < 700 ? 0.62 : 0.45)) / ((introAt100 * best.size) / 100));
    setText(keep);
    word.style.transform = keepT;
  }
  function centerWord() {
    const L = layoutBox();
    const s = Math.min(introMax, (W * 0.92) / L.w, (H * 0.5) / L.h);
    introT = { tx: W / 2 - (L.l + L.w / 2), ty: H * 0.46 - (L.t + L.h / 2), s };
    applyT(introT);
  }

  /* ---------- photo ---------- */
  const wantTall = () => W / H < 0.9 && !!mobilePhoto;
  function loadPhoto() {
    const v: "wide" | "tall" = wantTall() ? "tall" : "wide";
    if (v === variant && photoState !== "failed") return;
    variant = v;
    photoState = "loading";
    const src = v === "tall" && mobilePhoto ? mobilePhoto : photo;
    if (!src) { photoState = "failed"; onPhotoReady(); return; }
    const need = Math.min(2048, (v === "tall" ? W : Math.max(W, H * 1.78)) * dpr);
    const w = OPTIMIZER_WIDTHS.find((x) => x >= need) ?? 2048;
    const attempt = (url: string, cors: boolean, fallback?: () => void) => {
      const im = new Image();
      if (cors) im.crossOrigin = "anonymous";
      im.onload = () => {
        // Decode off the main thread first, so the first draw does not stall a frame.
        const ready = () => { if (alive && variant === v) { img = im; photoState = "ready"; onPhotoReady(); } };
        im.decode().then(ready, ready);
      };
      im.onerror = () => {
        if (fallback) fallback();
        else if (alive && variant === v) { photoState = "failed"; onPhotoReady(); }
      };
      im.src = url;
    };
    // Same-origin through the image optimizer (resized, and safe to read pixels from);
    // the original file is the fallback.
    attempt(`/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`, false, () => attempt(src, /^https?:/.test(src)));
  }
  function coverRect(im: HTMLImageElement) {
    const fx = variant === "tall" ? 0.5 : W / H < 0.9 ? 0.46 : 0.7; // same framing as the photo hero
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    return { x: (W - dw) * fx, y: (H - dh) * 0.5, w: dw, h: dh };
  }
  function drawPhoto(alpha: number) {
    if (!img) return;
    const r = coverRect(img);
    c.globalAlpha = alpha;
    c.drawImage(img, r.x, r.y, r.w, r.h);
    c.fillStyle = "rgba(11,15,16,0.42)"; // the photo hero's flat scrim, for text contrast
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
  }
  function onPhotoReady() {
    if (!alive) return;
    if (photoState === "failed") {
      if (pState === "wait") { pState = "off"; revealUI(); }
      return;
    }
    if (mode === "still") { startResolve(0); return; }
    if (skipToPhoto && pState !== "done") { startResolve(500); return; }
    if (pState === "wait") { buildDots(); startAssemble(); return; }
    if (pState === "done") kick(); // a different crop arrived after a resize
  }

  /* ---------- dots ---------- */
  function buildDots() {
    dots = [];
    if (!img || !mctx) return;
    // Draw the photo at one pixel per dot: the browser's downscale averages each cell's colour,
    // and reading a few thousand pixels is far cheaper than reading the full-size frame.
    const gap = Math.max(4, Math.min(9, Math.round(Math.sqrt((W * H) / 20000))));
    const cols = Math.floor((W - (gap - 1)) / gap) + 1, rows = Math.floor((H - (gap - 1)) / gap) + 1;
    const tmp = document.createElement("canvas");
    tmp.width = Math.max(1, cols); tmp.height = Math.max(1, rows);
    const g = tmp.getContext("2d", { willReadFrequently: true });
    if (!g) return;
    const r = coverRect(img);
    g.imageSmoothingQuality = "medium";
    g.drawImage(img, r.x / gap, r.y / gap, r.w / gap, r.h / gap);
    let data: Uint8ClampedArray;
    try { data = g.getImageData(0, 0, tmp.width, tmp.height).data; } catch { return; } // unreadable image: fade the photo in instead
    const sw = Math.min(140, W * 0.1);
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = (cy * cols + cx) * 4, x = cx * gap, y = cy * gap;
        const R = data[i], G = data[i + 1], B = data[i + 2];
        const lum = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
        if (lum < 0.06) continue; // near-black cells stay empty; the photo fills them in
        const k = 0.82;
        dots.push({
          x: Math.random() * W, y: Math.random() * H, sx: 0, sy: 0, tx: x, ty: y,
          vx: (Math.random() - 0.5) * 0.4, vy: 0.3 + Math.random() * 0.9,
          d: 0, dur: 0, sw: (Math.random() - 0.5) * 2 * sw,
          rgb: (Math.round(B * k) << 16) | (Math.round(G * k) << 8) | Math.round(R * k), lum, st: false,
        });
      }
    }
    // Big screens render the dot layer at reduced resolution (it is scaled up crisply), so a frame stays cheap.
    ms = Math.min(1, Math.sqrt(1_500_000 / (W * H)));
    sq = Math.max(1, Math.round((gap - 1) * ms));
    mos.width = Math.max(1, Math.ceil(W * ms)); mos.height = Math.max(1, Math.ceil(H * ms));
    mData = mctx.createImageData(mos.width, mos.height);
    mBuf = new Uint32Array(mData.data.buffer);
  }
  function startAssemble() {
    if (!dots.length) { startResolve(600); return; }
    for (const p of dots) {
      p.d = ((1 - p.lum) * 750 + Math.random() * 260) * speed; // the bright water arrives first
      p.dur = (780 + Math.random() * 380) * speed;
      p.st = false;
    }
    pState = "assemble";
    pT0 = performance.now();
    kick();
  }
  function startResolve(ms: number) {
    resolveMs = ms;
    resolveT0 = performance.now();
    mosaicFresh = false;
    pState = ms <= 0 ? "done" : "resolve";
    if (ms <= 0) photoAlpha = 1;
    revealUI();
    kick();
  }
  function beginDots() {
    if (photoState === "ready") { buildDots(); startAssemble(); return; }
    if (photoState === "failed") { revealUI(); return; }
    pState = "wait";
    if (playing) after(2500, () => { if (pState === "wait") revealUI(); }); // slow photo: let people in anyway
  }
  /** Writes every dot into one pixel buffer (much cheaper than thousands of fillRect calls). */
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
      } else {
        p.x = p.tx; p.y = p.ty; a = 1;
      }
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
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2; // upward crown
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
      c.ellipse(rp.x, rp.y, R, R * 0.28, 0, 0, Math.PI * 2);
      c.stroke();
    }
    for (let i = droplets.length - 1; i >= 0; i--) {
      const s = droplets[i], age = (now - s.t0) / 1000;
      if (age > s.life) { droplets.splice(i, 1); continue; }
      busy = true;
      const x = s.x + s.vx * age, y = s.y + s.vy * age + 700 * age * age;
      c.fillStyle = `rgba(214,236,255,${(0.85 * (1 - age / s.life)).toFixed(3)})`;
      c.beginPath();
      c.arc(x, y, s.r, 0, Math.PI * 2);
      c.fill();
    }
    return busy;
  }

  /* ---------- render loop ---------- */
  function frame(now: number) {
    raf = 0;
    if (!alive) { running = false; return; }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    let busy = false;
    if (pState === "resolve") {
      const q = clamp01((now - resolveT0) / resolveMs);
      photoAlpha = inOutCubic(q);
      if (q >= 1) { pState = "done"; photoAlpha = 1; } else busy = true;
    }
    if ((pState === "assemble" || pState === "resolve") && dots.length) {
      if (pState === "assemble") {
        if (drawMosaic(now)) startResolve(speed < 1 ? 450 : 900);
        busy = true;
      } else if (!mosaicFresh) { drawMosaic(now); mosaicFresh = true; }
      c.globalAlpha = 1 - photoAlpha;
      c.imageSmoothingEnabled = false;
      c.drawImage(mos, 0, 0, W, H);
      c.imageSmoothingEnabled = true;
      c.globalAlpha = 1;
    }
    if (photoAlpha > 0) drawPhoto(photoAlpha);
    if (drawWater(now)) busy = true;
    if (busy && visible) raf = requestAnimationFrame(frame);
    else running = false;
  }
  function kick() {
    if (running || !alive || !visible) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  /* ---------- the gate: header hidden, page locked, any intent skips ---------- */
  const onWheel = (e: Event) => { e.preventDefault(); e.stopPropagation(); skipIntro(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Tab") { skipIntro(); return; } // let focus move, but into a page that is ready
    if (SKIP_KEYS.has(e.key)) { e.preventDefault(); skipIntro(); }
  };
  const onPointer = () => skipIntro();
  function lock() {
    locked = true;
    html.style.overflow = "hidden";
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("touchmove", onWheel, { capture: true, passive: false });
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("pointerdown", onPointer, { capture: true });
  }
  function unlock() {
    if (!locked) return;
    locked = false;
    html.style.overflow = "";
    window.removeEventListener("wheel", onWheel, { capture: true });
    window.removeEventListener("touchmove", onWheel, { capture: true });
    window.removeEventListener("keydown", onKey, { capture: true });
    window.removeEventListener("pointerdown", onPointer, { capture: true });
  }
  function revealUI() {
    if (revealed) return;
    revealed = true;
    playing = false;
    delete stage.dataset.playing; // brings back the header and WhatsApp button (CSS)
    stage.dataset.ready = "1";
    unlock();
    onSeen();
  }
  function showFinished() {
    setText(heroText);
    word.style.transform = "";
    word.style.clipPath = "";
    stage.dataset.word = "1";
    stage.dataset.lit = "1";
  }
  function skipIntro() {
    if (!playing) return;
    runId++; // cancels the timeline
    drop = null; flash = null; droplets.length = 0; ripples.length = 0;
    showFinished();
    revealUI();
    speed = 0.45;
    skipToPhoto = true;
    if (photoState === "ready" && pState !== "resolve" && pState !== "done") startResolve(500);
    kick();
  }

  /* ---------- the full sequence ---------- */
  function scramble(from: string, to: string, id: number) {
    const len = Math.max(from.length, to.length);
    const stagger = Math.max(40, Math.min(95, 1000 / len)), flick = 200, total = (len - 1) * stagger + flick;
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
            const ti = i * stagger, target = to[i] ?? "";
            if (t < ti) out += from[i] ?? "";
            else if (t < ti + flick && target.trim()) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
            else out += target;
          }
          setText(out);
          centerWord();
        }
        if (t < total) requestAnimationFrame(step);
        else { setText(to); centerWord(); res(); }
      };
      requestAnimationFrame(step);
    });
  }

  async function full(id: number) {
    setText(introWord);
    centerWord();
    word.style.clipPath = "ellipse(0px 0px at 50% 50%)";
    stage.dataset.word = "1";
    await sleep(250, id);
    stage.dataset.lit = "1";
    await sleep(250, id);

    // 1. the drop falls onto the middle of the hidden word
    const r = rel(word.getBoundingClientRect());
    const ix = r.l + r.w / 2, iy = r.t + r.h * 0.55;
    const rd = Math.max(6, Math.min(11, W * 0.008));
    await tween(680, (e) => { drop = { x: ix, y: lerp(-rd * 4, iy, e), k: 1 + 0.5 * e, r: rd }; kick(); }, id, inQuad);
    drop = null;
    impact(ix, iy);

    // 2. the ripple uncovers STBS
    const s = introT.s;
    const dx = Math.max(ix - r.l, r.l + r.w - ix), dy = Math.max(iy - r.t, r.t + r.h - iy);
    const reach = Math.hypot(dx, dy / 0.62) + 6;
    await tween(950, (e) => {
      const R = reach * e;
      word.style.clipPath = `ellipse(${(R / s).toFixed(1)}px ${((R * 0.62) / s).toFixed(1)}px at ${((ix - r.l) / s).toFixed(1)}px ${((iy - r.t) / s).toFixed(1)}px)`;
    }, id, outCubic);
    word.style.clipPath = "";
    await sleep(380, id);

    // 3. scramble into the hero line
    await scramble(introWord, heroText, id);
    await sleep(220, id);

    // 4. drop to the bottom at full width; the photo starts forming on the way
    const from = { ...introT };
    let fired = false;
    await tween(1100, (e, p) => {
      applyT({ tx: lerp(from.tx, 0, e), ty: lerp(from.ty, 0, e), s: lerp(from.s, 1, e) });
      if (!fired && p > 0.15) { fired = true; speed = 1; beginDots(); }
    }, id, inOutQuart);
    word.style.transform = "";
    setText(heroText); // line breaks may have changed if the window was resized mid-intro
    // 5. the dots assemble, then dissolve into the photo; startResolve() reveals the page.
  }

  /* ---------- resizing, visibility ---------- */
  let lastW = 0, lastH = 0, rT = 0;
  function onResize() {
    if (!alive) return;
    sizeCanvas();
    fitWord();
    if (playing && word.style.transform) centerWord();
    else if (!playing) setText(heroText);
    if ((variant === "tall") !== wantTall()) loadPhoto();
    if (pState === "assemble" || pState === "resolve") { pState = "done"; photoAlpha = 1; }
    if (pState === "done" && !revealed) revealUI();
    kick();
  }
  const ro = new ResizeObserver(() => {
    if (stage.clientWidth === lastW && stage.clientHeight === lastH) return;
    lastW = stage.clientWidth; lastH = stage.clientHeight;
    window.clearTimeout(rT);
    rT = window.setTimeout(onResize, 140);
  });
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) kick();
  });
  // A late font only changes the word's metrics; leave the canvas and the dots alone.
  const onFonts = () => { if (!playing) { fitWord(); setText(heroText); } };
  const onSkipClick = () => skipIntro();

  return {
    start(m: Mode, seen: () => void) {
      mode = m;
      onSeen = seen;
      sizeCanvas();
      loadPhoto(); // in parallel with the words, so it is ready by the time the dots need it
      if (m === "full") {
        playing = true;
        stage.dataset.playing = "";
        lock();
        after(12000, () => skipIntro()); // never hold the page longer than this
      } else {
        delete stage.dataset.playing;
        stage.dataset.word = "1";
        stage.dataset.ready = "1";
        revealed = true;
      }
      skip.addEventListener("click", onSkipClick);
      const go = () => {
        if (!alive) return;
        lastW = stage.clientWidth; lastH = stage.clientHeight;
        ro.observe(stage);
        io.observe(stage);
        document.fonts?.addEventListener?.("loadingdone", onFonts);
        fitWord();
        if (m === "full" && playing) {
          full(runId).catch((err) => { if (err !== CANCEL) skipIntro(); });
          return;
        }
        showFinished();
        kick();
        if (m === "quick" && pState === "off") { speed = 0.45; beginDots(); }
      };
      // Fit against the real display face, not the fallback, if it is still loading.
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      Promise.race([fontsReady, new Promise((r) => window.setTimeout(r, 1500))]).then(go, go);
    },
    destroy() {
      alive = false;
      runId++;
      if (raf) cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(rT);
      ro.disconnect();
      io.disconnect();
      unlock();
      skip.removeEventListener("click", onSkipClick);
      document.fonts?.removeEventListener?.("loadingdone", onFonts);
      // Leave the DOM as React rendered it.
      setText(heroWord);
      word.style.transform = word.style.clipPath = word.style.fontSize = "";
      delete stage.dataset.word; delete stage.dataset.lit; delete stage.dataset.ready;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
