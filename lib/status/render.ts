/*
 * Draws a WhatsApp status story (1080 × 1920) on a canvas, in the browser.
 *
 * The look follows the owner's own festival posters (2026-11-17): the logo with the business name
 * and tagline on top, a large serif greeting, and a navy footer with both phone numbers, the
 * website, "Since 1992" and the services. The picture behind is the owner's, or one made for the
 * occasion; it should carry no text of its own.
 */

export const STORY = { width: 1080, height: 1920 } as const;

export const STORY_LAYOUTS = [
  { id: "sky", name: "Light" },
  { id: "night", name: "Dark photo" },
  { id: "arch", name: "Cream" },
  { id: "navy", name: "Navy" },
] as const;
export type StoryLayout = (typeof STORY_LAYOUTS)[number]["id"];

export type StoryPhoto = { source: CanvasImageSource; width: number; height: number };

export type StoryBrand = {
  nameTop: string;
  nameBottom: string;
  tagline: string;
  phones: string[];
  website: string;
  since: string;
  services: string[];
  values: string[];
};

export type StoryInput = {
  title: string;
  line: string;
  photo: StoryPhoto | null;
  /** The logo as drawn for light backgrounds, and the same with its dark letters turned white. */
  logo: StoryPhoto | null;
  logoLight: StoryPhoto | null;
  brand: StoryBrand;
};

export const COLOR = {
  navy: "#0b1d3f", navyDeep: "#091832", gold: "#c8922e", goldLight: "#ecc56b", cream: "#f8f3e7", white: "#ffffff", ink: "#1f2325",
} as const;

const SERIF = '"STBS Playfair", "STBS Devanagari", Georgia, serif';
const SANS = '"STBS Inter", "STBS Devanagari", system-ui, sans-serif';
const CAPS = '"STBS Archivo", "STBS Devanagari", system-ui, sans-serif';

/** Fonts the stories draw with; the component loads these before the first draw. */
export const STORY_FONTS = [
  { family: "STBS Playfair", weight: "400", url: "/fonts/playfair-display-latin-400.woff2" },
  { family: "STBS Playfair", weight: "700", url: "/fonts/playfair-display-latin-700.woff2" },
  { family: "STBS Archivo", weight: "700", url: "/fonts/archivo-latin-700.woff2" },
  { family: "STBS Inter", weight: "500", url: "/fonts/inter-latin-500.woff2" },
  { family: "STBS Devanagari", weight: "500", url: "/fonts/noto-sans-devanagari-500.woff2" },
  { family: "STBS Devanagari", weight: "700", url: "/fonts/noto-sans-devanagari-700.woff2" },
] as const;

/** "9812003001" → "+91 9812003001", as the posters print it. Anything else is shown as typed. */
export function displayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return digits.length === 10 ? `+91 ${digits}` : phone;
}

/** "Happy Dussehra" → small "HAPPY" over a large "Dussehra". Other greetings stay whole. */
export function splitGreeting(title: string): { kicker: string; main: string } {
  const match = /^(happy|merry)\s+(.+)$/i.exec(title.trim());
  return match ? { kicker: match[1].toUpperCase(), main: match[2] } : { kicker: "", main: title.trim() };
}

/** Breaks `text` into lines no wider than `maxWidth`; a single word wider than that keeps its own line. */
export function wrapLines(measure: (s: string) => number, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next) > maxWidth) { out.push(line); line = word; } else line = next;
    }
    if (line) out.push(line);
  }
  return out;
}

const hasDevanagari = (s: string) => /[ऀ-ॿ]/.test(s);

type Font = (px: number) => string;
const serifBold: Font = (px) => `700 ${px}px ${SERIF}`;
const serif: Font = (px) => `400 ${px}px ${SERIF}`;
const sans: Font = (px) => `500 ${px}px ${SANS}`;
const caps: Font = (px) => `700 ${px}px ${CAPS}`;

type Block = { lines: string[]; size: number; lineHeight: number; height: number };

/**
 * The largest size from `sizes` at which `text` fits the width, the line count and the height.
 * Devanagari is drawn smaller and with more room between lines: its letters are wider and carry
 * marks above and below.
 */
function fit(ctx: CanvasRenderingContext2D, text: string, font: Font, sizes: number[], box: { width: number; lines: number; height?: number }, latinLeading: number, hindiScale = 0.62): Block {
  const hindi = hasDevanagari(text);
  const leading = hindi ? latinLeading + 0.3 : latinLeading;
  let block: Block = { lines: [], size: 0, lineHeight: 0, height: 0 };
  if (!text.trim()) return block;
  for (const raw of sizes) {
    const size = Math.round(hindi ? raw * hindiScale : raw);
    ctx.font = font(size);
    const lines = wrapLines((s) => ctx.measureText(s).width, text, box.width);
    const lineHeight = Math.round(size * leading);
    block = { lines, size, lineHeight, height: lines.length * lineHeight };
    const maxLines = hindi ? box.lines + 1 : box.lines;
    if (lines.length <= maxLines && (!box.height || block.height <= box.height) && lines.every((l) => ctx.measureText(l).width <= box.width)) return block;
  }
  return block;
}

function drawBlock(ctx: CanvasRenderingContext2D, block: Block, font: Font, x: number, y: number, align: CanvasTextAlign, fill: string | CanvasGradient): number {
  if (!block.lines.length) return y;
  ctx.font = font(block.size);
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  // Baseline at a fixed share of the line box, so every line sits the same whatever its letters.
  block.lines.forEach((line, n) => ctx.fillText(line, x, y + n * block.lineHeight + block.lineHeight * 0.5 + block.size * 0.34));
  return y + block.height;
}

/** Width of `text` drawn one character at a time with `spacing` between characters. */
function spacedWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  return [...text].reduce((w, ch) => w + ctx.measureText(ch).width, 0) + spacing * Math.max(0, [...text].length - 1);
}

/** Letter-spaced capitals, drawn by hand because canvas letter-spacing is not in every phone's browser. */
function drawSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: "left" | "center"): number {
  const width = spacedWidth(ctx, text, spacing);
  let cursor = align === "center" ? x - width / 2 : x;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const ch of text) { ctx.fillText(ch, cursor, y); cursor += ctx.measureText(ch).width + spacing; }
  return width;
}

/** Draws the photo to fill the box, cropping the overflow evenly (like CSS `object-fit: cover`). */
function drawCover(ctx: CanvasRenderingContext2D, photo: StoryPhoto, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / photo.width, h / photo.height);
  const sw = w / scale, sh = h / scale;
  ctx.drawImage(photo.source, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, x, y, w, h);
}

/** The water ripples from the logo, for stories with no picture. */
function drawRipples(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, alpha: number) {
  ctx.save();
  ctx.strokeStyle = COLOR.gold;
  for (let n = 1; n <= 5; n++) {
    ctx.globalAlpha = alpha * (1 - (n - 1) * 0.16);
    ctx.lineWidth = Math.max(3, radius * 0.02);
    ctx.beginPath();
    ctx.ellipse(cx, cy, (radius * n) / 5, ((radius * n) / 5) * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function fade(ctx: CanvasRenderingContext2D, y0: number, y1: number, rgb: string, a0: number, a1: number, mid?: [number, number]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(${rgb},${a0})`);
  if (mid) g.addColorStop(mid[0], `rgba(${rgb},${mid[1]})`);
  g.addColorStop(1, `rgba(${rgb},${a1})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.min(y0, y1), STORY.width, Math.abs(y1 - y0));
}

const NAVY_RGB = "11,29,63";
const CREAM_RGB = "248,243,231";
const DARK_RGB = "12,10,8";

/** Logo, a gold rule, the business name in two lines, and the tagline under them. Returns the bottom. */
function drawLockup(ctx: CanvasRenderingContext2D, input: StoryInput, cx: number, top: number, onDark: boolean): number {
  const logo = onDark ? input.logoLight ?? input.logo : input.logo;
  const logoH = 108;
  const logoW = logo ? (logoH * logo.width) / logo.height : 0;
  const gap = 30;

  ctx.font = caps(42);
  const spacingTop = 5;
  const wTop = spacedWidth(ctx, input.brand.nameTop, spacingTop);
  const bottomChars = [...input.brand.nameBottom].length;
  const wBottomBare = spacedWidth(ctx, input.brand.nameBottom, 0);
  // Stretch the second line to the first line's width, as on the posters.
  const spacingBottom = bottomChars > 1 ? Math.max(spacingTop, (wTop - wBottomBare) / (bottomChars - 1)) : spacingTop;
  const textW = Math.max(wTop, spacedWidth(ctx, input.brand.nameBottom, spacingBottom));

  const total = logoW + (logo ? gap * 2 + 3 : 0) + textW;
  let x = cx - total / 2;
  if (logo) {
    ctx.drawImage(logo.source, x, top, logoW, logoH);
    x += logoW + gap;
    ctx.fillStyle = COLOR.gold;
    ctx.fillRect(x, top - 4, 3, logoH + 8);
    x += 3 + gap;
  }
  ctx.fillStyle = onDark ? COLOR.goldLight : COLOR.gold;
  drawSpaced(ctx, input.brand.nameTop, x, top + 46, spacingTop, "left");
  ctx.fillStyle = onDark ? COLOR.white : COLOR.navy;
  drawSpaced(ctx, input.brand.nameBottom, x, top + 98, spacingBottom, "left");

  ctx.font = sans(25);
  ctx.fillStyle = onDark ? "rgba(255,255,255,0.86)" : COLOR.navy;
  drawSpaced(ctx, input.brand.tagline, cx, top + logoH + 52, 8, "center");
  return top + logoH + 62;
}

/** Two gold lines with a small diamond between them. */
function drawOrnament(ctx: CanvasRenderingContext2D, cx: number, y: number, half: number, color: string = COLOR.gold) {
  ctx.fillStyle = color;
  ctx.fillRect(cx - half, y - 1, half - 22, 2);
  ctx.fillRect(cx + 22, y - 1, half - 22, 2);
  ctx.save();
  ctx.translate(cx, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();
}

function drawPhoneIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.strokeStyle = COLOR.goldLight;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = r * 0.26;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.36, cy - r * 0.42);
  ctx.quadraticCurveTo(cx - r * 0.4, cy + r * 0.4, cx + r * 0.42, cy + r * 0.36);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function drawGlobeIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.strokeStyle = COLOR.goldLight;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.45, r, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
}

/** Both phone numbers and the website on one row, each with its icon, shrunk to fit the width. */
function drawContacts(ctx: CanvasRenderingContext2D, input: StoryInput, cy: number, maxWidth: number) {
  const items = [...input.brand.phones.slice(0, 2).map((p) => ({ text: displayPhone(p), icon: "phone" as const })), { text: input.brand.website, icon: "globe" as const }];
  let size = 34, r = 25, gap = 34, total = 0;
  for (; size >= 22; size -= 2) {
    r = Math.round(size * 0.74); gap = Math.round(size);
    ctx.font = sans(size);
    total = items.reduce((w, item) => w + r * 2 + 16 + ctx.measureText(item.text).width, 0) + (gap * 2 + 2) * (items.length - 1);
    if (total <= maxWidth) break;
  }
  let x = STORY.width / 2 - total / 2;
  items.forEach((item, n) => {
    if (item.icon === "phone") drawPhoneIcon(ctx, x + r, cy, r); else drawGlobeIcon(ctx, x + r, cy, r);
    x += r * 2 + 16;
    ctx.font = sans(size);
    ctx.fillStyle = COLOR.white;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(item.text, x, cy + 2);
    x += ctx.measureText(item.text).width;
    if (n < items.length - 1) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(x + gap, cy - r, 2, r * 2);
      x += gap * 2 + 2;
    }
  });
}

const BAND = { plain: 270, withValues: 410 } as const;

/** The navy footer: optional four values, the contacts, "Since 1992" and the services. Returns its top. */
function drawBand(ctx: CanvasRenderingContext2D, input: StoryInput, withValues: boolean, fill: string = COLOR.navy): number {
  const { width: W, height: H } = STORY;
  const top = H - (withValues ? BAND.withValues : BAND.plain);
  ctx.fillStyle = fill;
  ctx.fillRect(0, top, W, H - top);
  ctx.fillStyle = COLOR.gold;
  ctx.fillRect(0, top, W, 4);
  let y = top + 40;

  if (withValues) {
    const values = input.brand.values.slice(0, 4);
    const column = (W - 100) / values.length;
    ctx.font = sans(24);
    values.forEach((value, n) => {
      const cx = 50 + column * (n + 0.5);
      const words = value.split(" ");
      const cut = Math.ceil(words.length / 2);
      const rows = words.length > 1 ? [words.slice(0, cut).join(" "), words.slice(cut).join(" ")] : [value];
      ctx.fillStyle = COLOR.goldLight;
      ctx.beginPath(); ctx.arc(cx, y + 6, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLOR.white;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      rows.forEach((row, r) => ctx.fillText(row, cx, y + 50 + r * 32));
      if (n > 0) { ctx.fillStyle = COLOR.gold; ctx.fillRect(50 + column * n, y, 2, 88); }
    });
    y += 112;
    ctx.fillStyle = COLOR.gold;
    ctx.fillRect(50, y, W - 100, 2);
    y += 28;
  }

  drawContacts(ctx, input, y + 30, W - 90);
  y += 88;

  ctx.font = sans(26);
  ctx.fillStyle = COLOR.white;
  const sinceW = drawSpaced(ctx, input.brand.since, W / 2, y + 26, 9, "center");
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(W / 2 - sinceW / 2 - 250, y + 16, 220, 2);
  ctx.fillRect(W / 2 + sinceW / 2 + 30, y + 16, 220, 2);
  y += 62;

  // Services on one line with gold dots between, shrunk until the line fits.
  const services = input.brand.services;
  for (let size = 24; size >= 16; size -= 1) {
    ctx.font = sans(size);
    const spacing = size * 0.12, dot = size * 1.6;
    const widths = services.map((s) => spacedWidth(ctx, s, spacing));
    const total = widths.reduce((a, b) => a + b, 0) + dot * (services.length - 1);
    if (total > W - 70 && size > 16) continue;
    let x = W / 2 - total / 2;
    services.forEach((service, n) => {
      ctx.fillStyle = COLOR.white;
      drawSpaced(ctx, service, x, y + 22, spacing, "left");
      x += widths[n];
      if (n < services.length - 1) {
        ctx.fillStyle = COLOR.goldLight;
        ctx.beginPath(); ctx.arc(x + dot / 2, y + 14, size * 0.2, 0, Math.PI * 2); ctx.fill();
        x += dot;
      }
    });
    break;
  }
  return top;
}

const MAIN_SIZES = [176, 160, 144, 128, 112, 100, 88, 78, 68];
const LINE_SIZES = [42, 38, 34, 30];

type Greeting = { kicker: string; main: Block; line: Block };

function measureGreeting(ctx: CanvasRenderingContext2D, input: StoryInput, width: number, mainHeight: number, lineWidth: number, lineLines: number): Greeting {
  const { kicker, main } = splitGreeting(input.title);
  return {
    kicker,
    main: fit(ctx, main, serifBold, MAIN_SIZES, { width, lines: 2, height: mainHeight }, 1.08),
    line: fit(ctx, input.line, serif, LINE_SIZES, { width: lineWidth, lines: lineLines }, 1.34, 0.95),
  };
}

const KICKER_HEIGHT = 78;

/** Kicker, greeting, ornament and message, centred on `cx` from `y` down. Returns the bottom. */
function drawGreeting(ctx: CanvasRenderingContext2D, g: Greeting, cx: number, y: number, colors: { kicker: string; main: string | CanvasGradient; line: string; ornament: string }): number {
  if (g.kicker) {
    ctx.font = serifBold(52);
    ctx.fillStyle = colors.kicker;
    const w = drawSpaced(ctx, g.kicker, cx, y + 52, 26, "center");
    ctx.fillStyle = colors.ornament;
    ctx.fillRect(cx - w / 2 - 110, y + 32, 70, 2);
    ctx.fillRect(cx + w / 2 + 40, y + 32, 70, 2);
    y += KICKER_HEIGHT;
  }
  y = drawBlock(ctx, g.main, serifBold, cx, y, "center", colors.main);
  drawOrnament(ctx, cx, y + 30, 190, colors.ornament);
  y += 62;
  return drawBlock(ctx, g.line, serif, cx, y, "center", colors.line);
}

const greetingHeight = (g: Greeting) => (g.kicker ? KICKER_HEIGHT : 0) + g.main.height + 62 + g.line.height;

function goldFill(ctx: CanvasRenderingContext2D, y: number, height: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y, 0, y + Math.max(1, height));
  g.addColorStop(0, "#f8e3a0"); g.addColorStop(0.55, COLOR.goldLight); g.addColorStop(1, COLOR.gold);
  return g;
}

/** Light: the picture under a pale sky of cream, the greeting in navy on top, the full footer below. */
function drawSky(ctx: CanvasRenderingContext2D, input: StoryInput) {
  const { width: W } = STORY;
  const bandTop = STORY.height - BAND.withValues;
  ctx.fillStyle = COLOR.cream;
  ctx.fillRect(0, 0, W, bandTop);
  if (input.photo) drawCover(ctx, input.photo, 0, 0, W, bandTop);
  else drawRipples(ctx, W / 2, 1210, 430, 0.8);
  fade(ctx, 0, 1080, CREAM_RGB, 0.96, 0, [0.62, 0.86]);

  const y = drawLockup(ctx, input, W / 2, 110, false);
  const g = measureGreeting(ctx, input, W - 160, 260, 660, 4);
  drawGreeting(ctx, g, W / 2, y + 44, { kicker: COLOR.navy, main: COLOR.navy, line: COLOR.navy, ornament: COLOR.gold });
  drawBand(ctx, input, true);
}

/** Dark photo: the picture fills the story; the greeting sits low in gold, as on a night poster. */
function drawNight(ctx: CanvasRenderingContext2D, input: StoryInput) {
  const { width: W, height: H } = STORY;
  ctx.fillStyle = "#14100c";
  ctx.fillRect(0, 0, W, H);
  if (input.photo) drawCover(ctx, input.photo, 0, 0, W, H);
  else drawRipples(ctx, W / 2, 800, 460, 0.6);
  fade(ctx, 0, 520, DARK_RGB, 0.82, 0);
  fade(ctx, 980, H, DARK_RGB, 0, 0.96, [0.42, 0.84]);

  drawLockup(ctx, input, W / 2, 110, true);

  const g = measureGreeting(ctx, input, W - 140, 300, 760, 3);
  const contactsY = H - 118;
  let y = contactsY - 74 - greetingHeight(g);
  if (g.kicker) {
    // "Happy" in a light serif above the gold word, rather than spaced capitals.
    ctx.font = serif(62);
    ctx.fillStyle = COLOR.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(g.kicker[0] + g.kicker.slice(1).toLowerCase(), W / 2, y + 56);
    y += KICKER_HEIGHT;
  }
  const mainTop = y;
  y = drawBlock(ctx, g.main, serifBold, W / 2, y, "center", goldFill(ctx, mainTop, g.main.height));
  drawOrnament(ctx, W / 2, y + 30, 190, COLOR.goldLight);
  drawBlock(ctx, g.line, serif, W / 2, y + 62, "center", "rgba(255,255,255,0.94)");

  ctx.fillStyle = "rgba(236,197,107,0.7)";
  ctx.fillRect(140, contactsY - 44, W - 280, 2);
  drawContacts(ctx, input, contactsY, W - 90);
}

/** Cream: greeting on a clean cream page, the picture in an arch below it. */
function drawArch(ctx: CanvasRenderingContext2D, input: StoryInput) {
  const { width: W } = STORY;
  ctx.fillStyle = COLOR.cream;
  ctx.fillRect(0, 0, W, STORY.height);
  const bandTop = STORY.height - BAND.plain;

  const y = drawLockup(ctx, input, W / 2, 110, false);
  const g = measureGreeting(ctx, input, W - 160, 230, 760, 3);
  const textBottom = drawGreeting(ctx, g, W / 2, y + 40, { kicker: COLOR.ink, main: COLOR.navy, line: COLOR.ink, ornament: COLOR.gold });

  const box = { x: 120, w: W - 240, top: Math.max(textBottom + 56, 800), bottom: bandTop };
  const r = box.w / 2;
  const arch = (inset: number) => {
    ctx.beginPath();
    ctx.moveTo(box.x - inset, box.bottom);
    ctx.lineTo(box.x - inset, box.top + r);
    ctx.arc(box.x + r, box.top + r, r + inset, Math.PI, 0);
    ctx.lineTo(box.x + box.w + inset, box.bottom);
    ctx.closePath();
  };
  ctx.save();
  arch(0);
  ctx.clip();
  ctx.fillStyle = COLOR.navy;
  ctx.fillRect(box.x, box.top, box.w, box.bottom - box.top);
  if (input.photo) drawCover(ctx, input.photo, box.x, box.top, box.w, box.bottom - box.top);
  else drawRipples(ctx, W / 2, box.top + (box.bottom - box.top) * 0.55, 330, 0.8);
  ctx.restore();
  ctx.strokeStyle = COLOR.gold;
  ctx.lineWidth = 5;
  arch(18);
  ctx.stroke();
  drawBand(ctx, input, false);
}

/** Navy: the picture in a gold ring on navy, the greeting in gold under it. */
function drawNavy(ctx: CanvasRenderingContext2D, input: StoryInput) {
  const { width: W, height: H } = STORY;
  ctx.fillStyle = COLOR.navy;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 700, 60, W / 2, 700, 900);
  glow.addColorStop(0, "rgba(60,96,160,0.5)"); glow.addColorStop(1, "rgba(11,29,63,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const lockupBottom = drawLockup(ctx, input, W / 2, 110, true);
  const cx = W / 2, r = 262, cy = lockupBottom + 70 + r;
  if (input.photo) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    drawCover(ctx, input.photo, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  } else drawRipples(ctx, cx, cy, 300, 0.85);
  ctx.strokeStyle = COLOR.gold; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(236,197,107,0.55)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r + 24, 0, Math.PI * 2); ctx.stroke();

  const g = measureGreeting(ctx, input, W - 160, 250, 780, 3);
  const top = cy + r + 70;
  const mainTop = top + (g.kicker ? KICKER_HEIGHT : 0);
  drawGreeting(ctx, g, cx, top, { kicker: COLOR.white, main: goldFill(ctx, mainTop, g.main.height), line: "rgba(255,255,255,0.92)", ornament: COLOR.goldLight });
  drawBand(ctx, input, false, COLOR.navyDeep);
}

const DRAW: Record<StoryLayout, (ctx: CanvasRenderingContext2D, input: StoryInput) => void> = { sky: drawSky, night: drawNight, arch: drawArch, navy: drawNavy };

/** Draws one story. The canvas must be STORY.width × STORY.height. */
export function drawStory(ctx: CanvasRenderingContext2D, layout: StoryLayout, input: StoryInput) {
  ctx.save();
  ctx.clearRect(0, 0, STORY.width, STORY.height);
  DRAW[layout](ctx, input);
  ctx.restore();
}

/**
 * The logo for dark backgrounds: its charcoal letters turned white, the gold drill and ripples kept.
 * Browser only.
 */
export function lightenLogo(logo: StoryPhoto): StoryPhoto {
  const canvas = document.createElement("canvas");
  canvas.width = logo.width; canvas.height = logo.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return logo;
  ctx.drawImage(logo.source, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const max = Math.max(px[i], px[i + 1], px[i + 2]), min = Math.min(px[i], px[i + 1], px[i + 2]);
    if (px[i + 3] > 0 && max < 120 && max - min < 45) { px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; }
  }
  ctx.putImageData(image, 0, 0);
  return { source: canvas, width: canvas.width, height: canvas.height };
}

/** "stbs-childrens-day-2.jpg" */
export function storyFileName(occasionId: string, index: number): string {
  return `stbs-${occasionId.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "status"}-${index + 1}.jpg`;
}
