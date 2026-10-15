/**
 * Renders the per-page social cards (public/og/<slug>.jpg, 1200x630) in the catalogue brand.
 * Run with the dev server up: `node scripts/generate-og.mjs` (needs a Chromium; set CHROME_PATH).
 */
import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync } from "node:fs";

// Fonts are inlined: a page set via setContent has no origin, so fetching them would be blocked.
const font = (f) => `data:font/woff2;base64,${readFileSync(`public/fonts/${f}`).toString("base64")}`;

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";
const PAGES = [
  ["home", "Trusted since 1992", "Water infrastructure for *industrial & commercial* sites", "/hero/stbs-water-outlets-wide.webp"],
  ["water-testing", "Water testing", "Know the ground before you *drill*", "/services/water-testing-survey.webp"],
  ["borewell-drilling", "Borewell drilling", "Borewell drilling, planned around *your site*", "/services/borewell-rig-factory-site.webp"],
  ["tubewell-construction", "Tubewell construction", "End-to-end *tubewell* construction", "/services/tubewell-rig-pipes.webp"],
  ["borewell-material-supply", "Material supply", "Borewell material you can *rely on*", "/services/material-supply-yard-stock.webp"],
  ["rainwater-harvesting", "Rainwater harvesting", "Rainwater harvesting & *groundwater recharge*", "/services/rainwater-harvesting-recharge.webp"],
  ["projects", "Projects", "Selected *projects*", "/services/rainwater-harvesting-recharge.webp"],
  ["clients", "Clients", "Trusted on *demanding sites*", "/services/borewell-rig-factory-site.webp"],
  ["about", "About STBS", "Built from the *ground down*", "/services/tubewell-rig-pipes.webp"],
  ["contact", "Contact", "Start with the *requirement*", "/services/borewell-rig-factory-site.webp"],
  ["quote", "Request a proposal", "Share your site and *scope*", "/services/tubewell-rig-pipes.webp"],
];

const html = (eyebrow, title, img) => `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:Clash;src:url(${font("ClashDisplay-600.woff2")});font-weight:600}
@font-face{font-family:Satoshi;src:url(${font("Satoshi-700.woff2")});font-weight:700}
@font-face{font-family:Serif;src:url(${font("InstrumentSerif-400i.woff2")});font-style:italic}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;position:relative;overflow:hidden;background:#131819;color:#F6F2EA}
.bg{position:absolute;inset:0;background:url(${BASE}${img}) center/cover}
.sc{position:absolute;inset:0;background:linear-gradient(90deg,#131819 8%,rgba(19,24,25,.78) 55%,rgba(19,24,25,.25))}
.in{position:absolute;left:72px;bottom:72px;width:820px}
.e{font:700 20px Satoshi;letter-spacing:.2em;text-transform:uppercase;color:#D2A65A}
h1{font:600 68px/1.06 Clash;letter-spacing:-.02em;word-spacing:.1em;margin-top:22px}
em{font:italic 400 1em Serif;color:#D2A65A}
.l{position:absolute;left:72px;top:60px;width:150px}
.u{position:absolute;right:72px;bottom:72px;font:700 20px Satoshi;color:#F6F2EA;opacity:.8}
</style><div class=bg></div><div class=sc></div><img class=l src="${BASE}/stbs-logo-only.png"><div class=in><div class=e>${eyebrow}</div><h1>${title.replace(/\*([^*]+)\*/g, "<em>$1</em>")}</h1></div><div class=u>stbs.in</div>`;

mkdirSync("public/og", { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
for (const [slug, eyebrow, title, img] of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.setContent(html(eyebrow, title, img), { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/og/${slug}.jpg`, type: "jpeg", quality: 84 });
  await page.close();
  console.log("og", slug);
}
await browser.close();
