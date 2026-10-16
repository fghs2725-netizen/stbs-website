"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Editable } from "@/components/website/editable";
import { useWebsiteEditor } from "@/lib/website/editor-context";
import type { SerializedSection } from "@/lib/website/action-types";

/**
 * Animated homepage hero ("intro" style of the hero section).
 *
 * Sequence on a visitor's first homepage view in a browser session:
 *   1. a dot drops in and a bar sweeps across, revealing the intro word (SAINI)
 *   2. the letters scramble into the hero word (BOREWELL)
 *   3. the word drops to the bottom and grows to the full container width
 *   4. grain drifts in and assembles into a particle drilling rig; the copy and CTAs fade in
 * Later views in the same session skip straight to step 4. The visual editor and
 * reduced-motion visitors get the finished frame with no motion.
 *
 * The heading, subheadline and CTAs are passed in as children (they stay real,
 * server-rendered text for SEO); the big word is decorative (aria-hidden).
 */

const SEEN_KEY = "stbs-intro-seen";

type Mode = "full" | "quick" | "still";

export function IntroHero({
  introWord,
  heroWord,
  editTarget,
  children,
}: {
  introWord: string;
  heroWord: string;
  editTarget?: SerializedSection;
  children: ReactNode;
}) {
  const editor = useWebsiteEditor();
  const editing = editor.isEditor;
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current, foot = footRef.current;
    const word = wordRef.current, dot = dotRef.current, bar = barRef.current;
    if (!stage || !canvas || !foot || !word || !dot || !bar) return;
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch { /* storage blocked: play the intro */ }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mode: Mode = editing || reduce ? "still" : seen ? "quick" : "full";
    const engine = createIntro({ stage, canvas, foot, word, dot, bar, introWord, heroWord });
    if (!engine) return;
    engine.start(mode, () => { try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ } });
    return () => engine.destroy();
  }, [introWord, heroWord, editing]);

  const wordNode = <span ref={wordRef} className="ih-word" aria-hidden="true">{heroWord}</span>;

  return (
    <section ref={stageRef} className="intro-hero band-deep relative isolate overflow-hidden">
      <noscript>
        <style>{".intro-hero .ih-word,.intro-hero .ih-copy{opacity:1!important;visibility:visible!important;transform:none!important}"}</style>
      </noscript>
      <canvas ref={canvasRef} className="ih-canvas" aria-hidden="true" />
      <div ref={dotRef} className="ih-dot" aria-hidden="true" />
      <div ref={barRef} className="ih-bar" aria-hidden="true" />
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
// Particle colour ramp: dim bronze (--bronze-light family) up to warm white (--ink-on-dark).
const PALETTE = Array.from({ length: 32 }, (_, i) => {
  const t = i / 31;
  return `rgba(${Math.round(150 + 96 * t)},${Math.round(112 + 130 * t)},${Math.round(62 + 172 * t)},${(0.16 + 0.84 * t).toFixed(3)})`;
});
const POINTER_RADIUS = 90;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const inOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const inOutQuart = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);
const outBounce = (t: number) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};

interface Target { x: number; y: number; b: number }
interface Particle {
  x: number; y: number; vx: number; vy: number; tx: number; ty: number; b: number;
  d: number; dur: number; sw: number; n: number; ph: number; sp: number; st: boolean; sx: number; sy: number;
}
interface Box { l: number; t: number; w: number; h: number }

/** Borewell rig drawn in a 100 x 130 unit box. Grey level becomes particle brightness; dark fills become gaps. */
function drawRig(g: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const u = w / 100;
  g.save();
  g.translate(x, y);
  g.scale(u, u);
  const col = (v: number) => { const c = Math.round(v * 255); return `rgb(${c},${c},${c})`; };
  const R = (x: number, y: number, w: number, h: number, v: number) => { g.fillStyle = col(v); g.fillRect(x, y, w, h); };
  const Ln = (x1: number, y1: number, x2: number, y2: number, lw: number, v: number) => {
    g.strokeStyle = col(v); g.lineWidth = lw; g.lineCap = "round";
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  };
  const C = (cx: number, cy: number, r: number, v: number) => { g.fillStyle = col(v); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); };
  const P = (pts: Array<[number, number]>, v: number) => {
    g.fillStyle = col(v); g.beginPath();
    pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b)));
    g.closePath(); g.fill();
  };

  R(0, 118.4, 100, 1.1, 0.42);                                                             // ground line
  g.fillStyle = col(0.5); g.beginPath(); g.ellipse(54.05, 118.6, 13, 2.6, 0, Math.PI, Math.PI * 2); g.fill(); // spoil heap
  R(48.4, 8, 2.8, 90, 0.96); R(56.9, 8, 2.8, 90, 0.96);                                    // mast rails
  for (let yy = 11; yy < 92; yy += 6.5) { Ln(51.2, yy, 56.9, yy + 6.5, 0.9, 0.62); Ln(56.9, yy, 51.2, yy + 6.5, 0.9, 0.5); }
  R(46, 4, 16.2, 4.6, 1); C(54.05, 3.6, 3.4, 0.9); C(54.05, 3.6, 1.3, 0.12);               // crown block + sheave
  R(53.35, 8.6, 1.4, 110.4, 0.82);                                                        // drill rod into the ground
  R(50, 48, 8.1, 10, 0.94); R(51.4, 58, 5.3, 2.4, 0.7);                                    // rotary head
  Ln(59.8, 64, 79, 93.5, 2.4, 0.72); Ln(48.4, 70, 37, 93.5, 1.9, 0.56);                    // hydraulic rams
  R(30, 93.5, 66, 6.5, 0.6); R(5, 100, 91, 5.6, 0.74);                                     // deck + chassis
  R(31.5, 81, 15, 12.5, 0.82);                                                            // compressor
  for (let i = 0; i < 4; i++) R(33.4, 83.2 + i * 2.6, 11.2, 0.95, 0.3);                    // its vents
  for (let i = 0; i < 3; i++) { R(63, 85.6 + i * 2.7, 31, 1.9, 0.88 - i * 0.07); C(94, 86.55 + i * 2.7, 1.05, 0.95); } // pipe rack
  P([[5, 100], [5, 82.5], [9.5, 75], [27, 75], [29.6, 82.5], [29.6, 100]], 0.86);          // cab
  P([[10.6, 77.4], [25.6, 77.4], [27.4, 83.6], [9.2, 83.6]], 0.14);                        // windscreen
  Ln(18, 85.5, 18, 98.5, 0.6, 0.45); R(20, 90, 3, 0.9, 0.5); R(3.6, 96, 2.2, 5, 0.7);      // door, handle, bumper
  for (const wx of [17, 66, 80.5]) { C(wx, 110.2, 6.4, 0.55); C(wx, 110.2, 4.3, 0.2); C(wx, 110.2, 2.1, 0.92); } // wheels
  R(9.3, 105.6, 1.9, 11.2, 0.62); R(7.2, 116.4, 6.2, 1.7, 0.78);                           // outrigger jacks
  R(90.6, 105.6, 1.9, 11.2, 0.62); R(88.5, 116.4, 6.2, 1.7, 0.78);
  g.globalCompositeOperation = "source-atop";                                              // soft light from the left
  const lg = g.createLinearGradient(0, 0, 100, 0);
  lg.addColorStop(0, "rgba(0,0,0,0)");
  lg.addColorStop(1, "rgba(0,0,0,.28)");
  g.fillStyle = lg;
  g.fillRect(0, 0, 100, 130);
  g.restore();
}

function createIntro(els: {
  stage: HTMLElement; canvas: HTMLCanvasElement; foot: HTMLElement;
  word: HTMLSpanElement; dot: HTMLElement; bar: HTMLElement;
  introWord: string; heroWord: string;
}) {
  const { stage, canvas, foot, word, dot, bar, introWord, heroWord } = els;
  const ctx = canvas.getContext("2d");
  const text = word.firstChild;
  if (!ctx || !(text instanceof Text)) return null;
  const c2d: CanvasRenderingContext2D = ctx;
  const textNode: Text = text;

  // Mutate the existing text node so React keeps ownership of it.
  const setText = (s: string) => { textNode.nodeValue = s; };

  let alive = true;
  let runId = 0;
  let still = false;
  let introDone = false;
  let W = 0, H = 0;
  let targets: Target[] = [];
  let parts: Particle[] = [];
  let pState: "off" | "assemble" | "live" = "off";
  let pT0 = 0, pSize = 2.4;
  let introScale = 0.66, introT = { tx: 0, ty: 0, s: 1 };
  let raf = 0, visible = true, running = false;
  const pointer = { x: -1e4, y: -1e4 };
  const timers = new Set<number>();
  const CANCEL = Symbol("cancel");

  /* ---------- timeline helpers (cancelled on destroy) ---------- */
  const sleep = (ms: number, id: number) => new Promise<void>((res, rej) => {
    const t = window.setTimeout(() => { timers.delete(t); if (id === runId) res(); else rej(CANCEL); }, ms);
    timers.add(t);
  });
  const tween = (ms: number, fn: (e: number, p: number) => void, id: number, ease: (t: number) => number = inOutCubic) =>
    new Promise<void>((res, rej) => {
      const t0 = performance.now();
      const step = (now: number) => {
        if (id !== runId) { rej(CANCEL); return; }
        const p = clamp01((now - t0) / ms);
        fn(ease(p), p);
        if (p < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });

  /* ---------- geometry (stage-relative) ---------- */
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

  function fitWord() {
    W = stage.clientWidth; H = stage.clientHeight;
    const cs = getComputedStyle(foot);
    const avail = foot.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const keep = textNode.nodeValue ?? heroWord;
    word.style.fontSize = "100px";
    setText(heroWord);
    const w = word.offsetWidth || 1;
    word.style.fontSize = `${Math.min((100 * avail / w) * 0.995, H * 0.3).toFixed(2)}px`;
    setText(keep);
    introScale = W < 700 ? 0.9 : 0.66;
  }
  function centerWord() {
    const L = layoutBox();
    introT = { tx: W / 2 - (L.l + L.w / 2), ty: H * 0.46 - (L.t + L.h / 2), s: introScale };
    applyT(introT);
  }

  /* ---------- particles ---------- */
  function rigBox() { // between the top of the band and the middle of the word
    const L = layoutBox();
    const top0 = Math.max(12, H * 0.03);
    const bottom = L.t + L.h * 0.6;
    let h = bottom - top0, w = (h * 100) / 130;
    if (w > W * 0.94) { w = W * 0.94; h = w * 1.3; }
    return { x: (W - w) / 2, y: top0 + (bottom - top0 - h) / 2, w, h };
  }
  function buildTargets() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.ceil(W)); off.height = Math.max(1, Math.ceil(H));
    const g = off.getContext("2d", { willReadFrequently: true });
    if (!g) return;
    const b = rigBox();
    if (b.h < 40) { targets = []; return; }
    drawRig(g, b.x, b.y, b.w);
    const data = g.getImageData(0, 0, off.width, off.height).data;
    let gap = W < 600 ? 3 : 4;
    let pts: Target[] = [];
    for (;;) {
      pts = [];
      const y0 = Math.max(0, Math.floor(b.y)), y1 = Math.min(off.height, b.y + b.h);
      const x0 = Math.max(0, Math.floor(b.x)), x1 = Math.min(off.width, b.x + b.w);
      for (let y = y0; y < y1; y += gap) for (let x = x0; x < x1; x += gap) {
        const i = (y * off.width + x) * 4, a = data[i + 3] / 255;
        if (a < 0.4) continue;
        const lum = ((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255) * a;
        if (lum < 0.3) continue;
        const v = 0.34 + ((lum - 0.3) / 0.7) * 0.66;
        pts.push({ x, y, b: Math.min(1, Math.max(0.15, v + (Math.random() - 0.5) * 0.12)) });
      }
      if (pts.length <= 9000 || gap >= 8) break;
      gap++;
    }
    targets = pts;
    pSize = Math.max(1.6, gap * 0.62);
  }
  function makeParticle(t: Target, x: number, y: number, quick: boolean): Particle {
    const sw = Math.min(160, W * 0.12);
    return {
      x, y, tx: t.x, ty: t.y, b: t.b,
      vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
      d: quick ? Math.random() * 350 : 520 + Math.random() * 800,
      dur: quick ? 700 + Math.random() * 400 : 1100 + Math.random() * 600,
      sw: (Math.random() - 0.5) * 2 * sw, n: 0.25 + Math.random() * 0.6,
      ph: Math.random() * 6.283, sp: 0.6 + Math.random() * 1.4, st: false, sx: 0, sy: 0,
    };
  }
  function particlesStart(quick: boolean) {
    parts = targets.map((t) => makeParticle(t, Math.random() * W, Math.random() * H, quick));
    pState = "assemble";
    pT0 = performance.now();
    kick();
  }
  function particlesSettled() {
    parts = targets.map((t) => { const p = makeParticle(t, t.x, t.y, true); p.vx = 0; p.vy = 0; return p; });
    pState = "live";
    kick();
  }

  function frame(now: number) {
    raf = 0;
    if (!alive || pState === "off" || !visible) { running = false; return; }
    c2d.clearRect(0, 0, W, H);
    const t = now - pT0, fadeIn = clamp01(t / 450), LV = PALETTE.length - 1, half = pSize / 2;
    let allDone = true;
    for (const p of parts) {
      let lvl: number;
      if (pState === "assemble") {
        if (t < p.d) { // grain drifting across the band
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x += W; else if (p.x > W) p.x -= W;
          if (p.y < 0) p.y += H; else if (p.y > H) p.y -= H;
          lvl = p.n * fadeIn * 0.7;
          allDone = false;
        } else { // fly to the target along a gentle arc
          if (!p.st) { p.st = true; p.sx = p.x; p.sy = p.y; }
          const q = clamp01((t - p.d) / p.dur), e = inOutCubic(q);
          const dx = p.tx - p.sx, dy = p.ty - p.sy, len = Math.hypot(dx, dy) || 1, arc = Math.sin(Math.PI * e) * p.sw;
          p.x = p.sx + dx * e - (dy / len) * arc;
          p.y = p.sy + dy * e + (dx / len) * arc;
          lvl = lerp(p.n * 0.7, p.b, e);
          if (q < 1) allDone = false;
        }
      } else { // settled: spring home, step aside for the pointer, twinkle
        let ax = (p.tx - p.x) * 0.07, ay = (p.ty - p.y) * 0.07;
        if (!still) {
          const mx = p.x - pointer.x, my = p.y - pointer.y, d2 = mx * mx + my * my;
          if (d2 < POINTER_RADIUS * POINTER_RADIUS) {
            const d = Math.sqrt(d2) || 1, f = (1 - d / POINTER_RADIUS) * 4.2;
            ax += (mx / d) * f; ay += (my / d) * f;
          }
        }
        p.vx = (p.vx + ax) * 0.8; p.vy = (p.vy + ay) * 0.8;
        p.x += p.vx; p.y += p.vy;
        lvl = still ? p.b : p.b * (0.8 + 0.2 * Math.sin(now * 0.0016 * p.sp + p.ph));
      }
      if (lvl < 0.02) continue;
      c2d.fillStyle = PALETTE[Math.min(LV, (lvl * LV) | 0)];
      c2d.fillRect(p.x - half, p.y - half, pSize, pSize);
    }
    if (pState === "assemble" && allDone) {
      pState = "live";
      for (const p of parts) { p.vx = 0; p.vy = 0; }
    }
    if (still && pState === "live") { running = false; return; } // one finished frame is enough
    raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (running || !alive || !visible) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  /* ---------- the intro ---------- */
  function scramble(from: string, to: string, id: number) {
    const stagger = 95, flick = 210, len = Math.max(from.length, to.length);
    const total = (len - 1) * stagger + flick;
    return new Promise<void>((res, rej) => {
      const t0 = performance.now();
      let last = -1;
      const step = (now: number) => {
        if (id !== runId) { rej(CANCEL); return; }
        const t = now - t0, tick = Math.floor(t / 50);
        if (tick !== last) {
          last = tick;
          let out = "";
          for (let i = 0; i < len; i++) {
            const ti = i * stagger;
            if (t < ti) out += from[i] ?? "";
            else if (t < ti + flick) out += i < to.length ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : "";
            else out += to[i] ?? "";
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

  function showFinished() {
    setText(heroWord);
    word.style.transform = "";
    word.style.clipPath = "";
    stage.dataset.word = "1";
    stage.dataset.lit = "1";
    stage.dataset.ready = "1";
    introDone = true;
  }

  async function full(id: number, onSeen: () => void) {
    setText(introWord);
    centerWord();
    word.style.clipPath = "polygon(0 0,0 0,0 0)";
    stage.dataset.word = "1";
    stage.dataset.lit = "1";
    await sleep(400, id);

    const r = rel(word.getBoundingClientRect()), s = introScale, hLocal = word.offsetHeight;
    const cx = W / 2;
    const dsz = Math.max(8, Math.min(16, r.h * 0.09));
    const dotY = r.t + r.h + Math.max(10, r.h * 0.1);
    const barW = Math.max(4, dsz * 0.5), barH = r.h * 1.08;
    dot.style.width = dot.style.height = `${dsz}px`;
    bar.style.width = `${barW}px`;
    bar.style.height = `${barH}px`;
    const setDot = (x: number, o: number, y = dotY) => { dot.style.transform = `translate(${x - dsz / 2}px,${y - dsz / 2}px)`; dot.style.opacity = String(o); };
    const setBar = (x: number, a: number, k: number, o: number) => {
      bar.style.transform = `translate(${x - barW / 2}px,${dotY - barH}px) rotate(${a}deg) scaleY(${k})`;
      bar.style.opacity = String(o);
    };
    const A = 14, tanA = Math.tan((A * Math.PI) / 180);
    const reveal = (x: number) => { // slanted clip edge that follows the bar
      const edge = x + tanA * (dotY - (r.t + r.h / 2));
      const lx = (edge - r.l) / s, sl = tanA * 0.7 * hLocal;
      word.style.clipPath = `polygon(-10% -20%, ${lx + sl}px -20%, ${lx - sl}px 120%, -10% 120%)`;
    };
    const L = r.l - dsz, R = r.l + r.w + dsz;

    // 1. the dot drops in
    await tween(800, (e, p) => setDot(cx, Math.min(1, p * 5), lerp(dotY - H * 0.25, dotY, e)), id, outBounce);
    await sleep(120, id);
    // 2. it rolls to the left edge while the bar swings up
    await tween(480, (e) => { const x = lerp(cx, L, e); setDot(x, 1); setBar(x, lerp(-70, A, e), e, 1); }, id);
    // 3. sweep right, revealing the intro word
    await tween(900, (e) => { const x = lerp(L, R, e); setDot(x, 1); setBar(x, A, 1, 1); reveal(x); }, id);
    word.style.clipPath = "";
    // 4. the bar folds away, the dot rolls back and fades
    await tween(520, (e) => { setDot(lerp(R, cx, e), 1 - e); setBar(R, lerp(A, 70, e), 1 - e, 1 - e); }, id);
    await sleep(300, id);
    // 5. scramble into the hero word
    await scramble(introWord, heroWord, id);
    await sleep(250, id);
    // 6. drop to the bottom and grow to full width; the rig and the copy come in on the way
    const from = { ...introT };
    let fired = false, shown = false;
    await tween(1100, (e, p) => {
      applyT({ tx: lerp(from.tx, 0, e), ty: lerp(from.ty, 0, e), s: lerp(from.s, 1, e) });
      if (!fired && p > 0.25) { fired = true; particlesStart(false); }
      if (!shown && p > 0.55) { shown = true; stage.dataset.ready = "1"; }
    }, id, inOutQuart);
    word.style.transform = "";
    introDone = true;
    onSeen();
  }

  /* ---------- resizing, visibility, pointer ---------- */
  let lastW = 0, lastH = 0, rT = 0;
  function onResize() {
    if (!alive) return;
    fitWord();
    if (!introDone && word.style.transform) centerWord();
    buildTargets();
    if (pState !== "off") {
      const old = parts;
      parts = targets.map((t, i) => {
        const o = old[i];
        const p = makeParticle(t, o ? o.x : Math.random() * W, o ? o.y : Math.random() * H, true);
        p.vx = 0; p.vy = 0;
        return p;
      });
      pState = "live";
      kick();
    }
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
  const onMove = (e: PointerEvent) => { const s = stage.getBoundingClientRect(); pointer.x = e.clientX - s.left; pointer.y = e.clientY - s.top; };
  const onLeave = () => { pointer.x = -1e4; pointer.y = -1e4; };
  const onFonts = () => { if (introDone) onResize(); };

  return {
    start(mode: Mode, onSeen: () => void) {
      still = mode === "still";
      const id = ++runId;
      const go = () => {
        if (!alive || id !== runId) return;
        lastW = stage.clientWidth; lastH = stage.clientHeight;
        ro.observe(stage);
        io.observe(stage);
        stage.addEventListener("pointermove", onMove);
        stage.addEventListener("pointerleave", onLeave);
        document.fonts?.addEventListener?.("loadingdone", onFonts);
        fitWord();
        if (mode === "full") {
          full(id, onSeen).catch((err) => {
            if (err !== CANCEL) { showFinished(); buildTargets(); particlesSettled(); }
          });
          // The rig targets depend on the word's final size, so build them once it is fitted.
          buildTargets();
          return;
        }
        showFinished();
        buildTargets();
        if (mode === "quick") particlesStart(true); else particlesSettled();
      };
      // Fit against the real display face, not the fallback, when it is still loading.
      const fonts = document.fonts?.ready ?? Promise.resolve();
      Promise.race([fonts, new Promise((r) => window.setTimeout(r, 1500))]).then(go, go);
    },
    destroy() {
      alive = false;
      runId++;
      if (raf) cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(rT);
      ro.disconnect();
      io.disconnect();
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      document.fonts?.removeEventListener?.("loadingdone", onFonts);
      // Leave the DOM as React rendered it.
      setText(heroWord);
      word.style.transform = word.style.clipPath = word.style.fontSize = "";
      dot.style.opacity = bar.style.opacity = "0";
      delete stage.dataset.word; delete stage.dataset.lit; delete stage.dataset.ready;
      c2d.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
