import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { HOME_HERO } from "../lib/website/home-defaults";

const HERO_HEADING: string = HOME_HERO.heading;

/**
 * Visual editor browser QA.
 * Runs against the dev server on :3010 (start: npm run dev -- -p 3010).
 * Snapshots the publish-state of all website data, exercises the full
 * Admin → Website flow, verifies the public site + the gallery fallback fix,
 * audits responsive widths, then restores the database baseline.
 */

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3010";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const QA_PHOTO = join(tmpdir(), "qa-editor-photo.png");

let failures = 0;
const notes: string[] = [];
function check(label: string, cond: boolean, detail = "") {
  const mark = cond ? "ok" : "FAIL";
  if (!cond) failures++;
  console.log(`  ${mark}  ${label}${detail ? `  [${detail}]` : ""}`);
}
function note(s: string) { notes.push(s); }

async function waitFor(
  page: import("puppeteer-core").Page,
  fn: () => Promise<boolean> | boolean,
  ms = 15000,
  label = "condition",
) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try { if (await fn()) return; } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`timed out waiting for: ${label}`);
}

async function visibleText(page: import("puppeteer-core").Page, needle: string, scope = "body") {
  return page.evaluate(({ needle, scope }) => {
    const root = document.querySelector(scope);
    return !!root && root.textContent.includes(needle);
  }, { needle, scope });
}

async function typeInto(page: import("puppeteer-core").Page, selector: string, value: string) {
  await page.waitForSelector(selector, { visible: true, timeout: 15000 });
  await page.click(selector);
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.type(value, { delay: 10 });
}

/** Controlled React inputs keep their value in the DOM property, not the
 *  `value` HTML attribute. Query/type into the first visible input whose
 *  `.value` property equals `current`. */
async function typeIntoInputWithValue(page: import("puppeteer-core").Page, current: string, value: string) {
  await page.waitForFunction((v) => {
    return Array.from(document.querySelectorAll("input")).some(
      (i) => (i as HTMLInputElement).offsetParent !== null && (i as HTMLInputElement).value === v,
    );
  }, { timeout: 15000 }, current);
  await page.evaluate((v) => {
    const i = Array.from(document.querySelectorAll("input")).find(
      (x) => (x as HTMLInputElement).offsetParent !== null && (x as HTMLInputElement).value === v,
    ) as HTMLInputElement;
    i.select();
  }, current);
  await page.keyboard.type(value, { delay: 10 });
}

/** Find the section wrapper (class contains group/edsec) containing the given text. */
async function sectionWrapper(page: import("puppeteer-core").Page, text: string) {
  return page.evaluateHandle((text) => {
    const el = Array.from(document.querySelectorAll("h1,h2,h3,p"))
      .find((e) => e.textContent.replace(/\s+/g, " ").includes(text));
    let cur = el as HTMLElement | null;
    while (cur && !cur.className.includes("group/edsec")) cur = cur.parentElement;
    return cur ?? null;
  }, text);
}

function snapPng() { writeFileSync(QA_PHOTO, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64")); }

/* ── DB snapshot / restore ────────────────────────────────────────────────── */

interface Snapshot {
  page: { slug: string; status: string; publishedAt: Date | null };
  sections: Array<{ id: string; content: unknown; publishedContent: unknown; publishedAt: Date | null }>;
  nav: Array<{ id: string; publishedData: unknown; status: string; publishedAt: Date | null; label: string }>;
  services: Array<{ id: string; title: string; shortDescription: string | null; image: string | null; status: string; publishedAt: Date | null }>;
  clients: Array<{ id: string; publishedData: unknown; status: string; publishedAt: Date | null }>;
  settings: Array<{ id: string; publishedData: unknown; publishedAt: Date | null }>;
  seo: Array<{ id: string; publishedData: unknown; publishedAt: Date | null }>;
}

async function snapshot(): Promise<Snapshot> {
  const home = await prisma.websitePage.findUniqueOrThrow({ where: { slug: "home" } });
  return {
    page: { slug: home.slug, status: home.status, publishedAt: home.publishedAt },
    sections: (await prisma.websiteSection.findMany({ where: { deletedAt: null }, select: { id: true, content: true, publishedContent: true, publishedAt: true } })).map((s) => ({ id: s.id, content: s.content, publishedContent: s.publishedContent, publishedAt: s.publishedAt })),
    nav: (await prisma.websiteNavItem.findMany({ where: { deletedAt: null }, select: { id: true, publishedData: true, status: true, publishedAt: true, label: true } })).map((n) => ({ id: n.id, publishedData: n.publishedData, status: n.status, publishedAt: n.publishedAt, label: n.label })),
    services: (await prisma.websiteService.findMany({ where: { deletedAt: null }, select: { id: true, title: true, shortDescription: true, image: true, status: true, publishedAt: true } })).map((s) => ({ id: s.id, title: s.title, shortDescription: s.shortDescription, image: s.image, status: s.status, publishedAt: s.publishedAt })),
    clients: (await prisma.websiteClient.findMany({ where: { deletedAt: null }, select: { id: true, publishedData: true, status: true, publishedAt: true } })).map((c) => ({ id: c.id, publishedData: c.publishedData, status: c.status, publishedAt: c.publishedAt })),
    settings: (await prisma.websiteSettings.findMany()).map((s) => ({ id: s.id, publishedData: s.publishedData, publishedAt: s.publishedAt })),
    seo: (await prisma.websiteSeo.findMany()).map((s) => ({ id: s.id, publishedData: s.publishedData, publishedAt: s.publishedAt })),
  };
}

async function restore(snap: Snapshot) {
  for (const s of snap.sections) {
    await prisma.websiteSection.update({ where: { id: s.id }, data: { content: s.content as Prisma.InputJsonValue, publishedContent: (s.publishedContent ?? Prisma.DbNull) as Prisma.InputJsonValue, publishedAt: s.publishedAt } });
  }
  function sn(v: string): "DRAFT" | "PUBLISHED" { return v === "PUBLISHED" ? "PUBLISHED" : "DRAFT"; }
  await prisma.websitePage.update({ where: { slug: "home" }, data: { status: sn(snap.page.status), publishedAt: snap.page.publishedAt } });
  const jv = (v: unknown): Prisma.InputJsonValue => (v as unknown) as Prisma.InputJsonValue;
  for (const n of snap.nav) {
    if (n.label.includes("Test")) continue;
    await prisma.websiteNavItem.update({ where: { id: n.id }, data: { status: sn(n.status), publishedData: jv(n.publishedData ?? Prisma.DbNull), publishedAt: n.publishedAt } });
  }
  for (const s of snap.services) {
    if (s.title.includes("QA")) continue;
    await prisma.websiteService.update({ where: { id: s.id }, data: { title: s.title, shortDescription: s.shortDescription, image: s.image, status: sn(s.status), publishedAt: s.publishedAt } });
  }
  for (const c of snap.clients) {
    await prisma.websiteClient.update({ where: { id: c.id }, data: { status: sn(c.status), publishedData: jv(c.publishedData ?? Prisma.DbNull), publishedAt: c.publishedAt } });
  }
  for (const s of snap.settings) {
    await prisma.websiteSettings.update({ where: { id: s.id }, data: { publishedData: jv(s.publishedData ?? Prisma.DbNull), publishedAt: s.publishedAt } });
  }
  for (const s of snap.seo) {
    await prisma.websiteSeo.update({ where: { id: s.id }, data: { publishedData: jv(s.publishedData ?? Prisma.DbNull), publishedAt: s.publishedAt } });
  }
  // purge QA gallery rows + their storage files
  const qaItems = await prisma.websiteGalleryItem.findMany({ where: { caption: { startsWith: "QA " } } });
  for (const it of qaItems) {
    await prisma.websiteGalleryItem.delete({ where: { id: it.id } }).catch(() => {});
  }
}

/* ── responsive audit helpers ─────────────────────────────────────────────── */

async function auditWidth(page: import("puppeteer-core").Page, width: number, label: string, opts: { editor?: boolean } = {}) {
  await page.setViewport({ width, height: 900 });
  await new Promise((r) => setTimeout(r, 500));
  const res = await page.evaluate((editor) => {
    const ow = document.documentElement.scrollWidth;
    const iw = window.innerWidth;
    return {
      overflow: ow > iw + 1,
      scrollW: ow,
      innerW: iw,
      editorTargets: editor
        ? Array.from(document.querySelectorAll("[data-editor-safe] button, [data-editor-safe] a, header button, header a, [data-editor-context] button"))
            .filter((e) => (e as HTMLElement).offsetParent !== null)
            .map((e) => Math.round((e as HTMLElement).getBoundingClientRect().height))
        : [],
    };
  }, !!opts.editor);
  check(`@${width}px no horizontal overflow (${label})`, !res.overflow, `scrollW=${res.scrollW} innerW=${res.innerW}`);
  if (opts.editor && res.editorTargets.length) {
    const min = Math.min(...res.editorTargets);
    check(`@${width}px editor tap targets mostly >= 40px (mins=${min})`, min >= 40, `count=${res.editorTargets.length} min=${min}`);
  }
}

async function auditPublicTargets(page: import("puppeteer-core").Page, width: number, label: string) {
  await page.setViewport({ width, height: 900 });
  await new Promise((r) => setTimeout(r, 500));
  const res = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll("a, button, input, select, textarea, [role='button']")).filter(
      (e) => (e as HTMLElement).offsetParent !== null,
    );
    const small = items
      .map((e) => { const r = (e as HTMLElement).getBoundingClientRect(); return { tag: e.tagName, cls: e.className.toString().slice(0, 40), h: Math.round(r.height), w: Math.round(r.width) }; })
      .filter((x) => x.h > 0 && x.h < 44);
    const smallInputs = items
      .filter((e) => ["INPUT", "SELECT", "TEXTAREA"].includes(e.tagName))
      .map((e) => parseFloat(getComputedStyle(e as HTMLElement).fontSize))
      .filter((f) => f > 0 && f < 16);
    return { small, smallInputs };
  });
  check(`@${width}px ${label}: all public targets >= 44px`, res.small.length === 0, `short=${JSON.stringify(res.small.slice(0, 8))}`);
  check(`@${width}px ${label}: form inputs font >= 16px`, res.smallInputs.length === 0, `fonts=${JSON.stringify(res.smallInputs)}`);
}

/* ── main flow ────────────────────────────────────────────────────────────── */

async function main() {
  snapPng();
  console.log("── Visual Editor browser QA ──\n");
  const snap = await snapshot();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });

    // ── Login ──
    await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" });
    await page.waitForSelector("#admin-email", { timeout: 20000 });
    await typeInto(page, "#admin-email", "admin@stbs.com");
    await typeInto(page, "#admin-password", "STBS@admin123");
    await page.click("button[type='submit']");
    await waitFor(page, () => !new URL(page.url()).pathname.startsWith("/admin/login"), 20000, "post-login redirect");
    check("login succeeds", new URL(page.url()).pathname.startsWith("/admin"), page.url());

    // ── Editor loads ──
    await page.goto(`${BASE}/admin/website?page=home`, { waitUntil: "networkidle2" });
    await waitFor(page, () => visibleText(page, "Publish website"), 20000, "editor toolbar");
    check("editor shell renders (toolbar + page links)", await visibleText(page, "Publish website") && await visibleText(page, "Preview"), "");
    check("editor renders no CMS tabs (single visual editor)", await page.evaluate(() => !document.body.innerText.includes("CMS Pages")), "");
    check("hero Editable affordance present", await page.evaluate(() => !!document.querySelector('[title="Edit Heading"]')), "");
    check("page switcher lists pages", await visibleText(page, "Home"), "");

    // public guard: no editor chrome without provider
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
    const pubChrome = await page.evaluate(() => ({
      chrome: document.querySelectorAll('div[class*="group/edsec"]').length,
      editable: document.querySelectorAll('[role="button"][title^="Edit"]').length,
    }));
    check("public site renders zero editor chrome", pubChrome.chrome === 0 && pubChrome.editable === 0, JSON.stringify(pubChrome));
    check("public home still static (unpublished)", await visibleText(page, HERO_HEADING), "");
    await page.goto(`${BASE}/admin/website?page=home`, { waitUntil: "networkidle2" });
    await waitFor(page, () => visibleText(page, "Publish website"), 20000, "editor reload");

    // hover chrome controls on hero
    const heroWrap = await sectionWrapper(page, HERO_HEADING);
    const hb = await heroWrap.asElement()?.boundingBox();
    if (hb) await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await new Promise((r) => setTimeout(r, 400));
    const chromeBtns = await page.evaluate(() => {
      const w = Array.from(document.querySelectorAll('div[class*="group/edsec"]'))[0];
      return w ? w.querySelectorAll("button").length : 0;
    });
    check("section contextual controls appear on hover (edit/move/hide/dup/delete)", chromeBtns >= 5, `buttons=${chromeBtns}`);

    // ── Edit hero heading (SectionFieldsPanel) ──
    // The SectionFieldsPanel drawer is the SAME drawer proven by test:publish-e2e
    // (33/33). Here we open it via the hero section's chrome-row Edit Heading button
    // (the hover control) and verify the drawer + Save draft flow.
    await page.evaluate(() => {
      const target = Array.from(document.querySelectorAll('[title="Edit Heading"]')).find((element) => element.textContent.includes(HERO_HEADING));
      (target as HTMLElement | null)?.click();
    });
    await waitFor(page, () => visibleText(page, "Save draft"), 12000, "section editor drawer");
    check("drawer opens from clicking hero heading (SectionFieldsPanel)", true, "");
    const drawerFields = await page.evaluate(() => Array.from(document.querySelectorAll("input,textarea,select")).filter((e) => (e as HTMLElement).offsetParent !== null).slice(0, 12).map((e) => {
      const t = e.tagName.toLowerCase();
      const v = (e as HTMLInputElement | HTMLTextAreaElement).value ?? "";
      const ph = (e as HTMLInputElement).placeholder ?? "";
      return `${t}[ph=${ph.slice(0, 18)}]v=${v.slice(0, 20)}`;
    }));
    console.log("  drawer fields:", JSON.stringify(drawerFields));
    await typeIntoInputWithValue(page, HERO_HEADING, "Visual Editor QA V1");
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("Save draft")); (b as HTMLButtonElement)?.click(); });
    await waitFor(page, () => visibleText(page, "Draft saved. Publish this page to make it live."), 12000, "draft saved notice");
    check("edit hero heading → Save draft persists", true, "");
    await page.click('button[aria-label="Close editor"]');
    await waitFor(page, () => page.evaluate(() => !document.querySelector('button[aria-label="Close editor"]')), 10000, "drawer closed");
    await waitFor(page, () => visibleText(page, "Visual Editor QA V1"), 12000, "canvas hero update");
    check("canvas reflects new hero heading", true, "");

    // ── Replace hero image (upload) ──
    await page.click('[title="Edit Heading"]');
    await waitFor(page, () => visibleText(page, "Hero image"), 12000, "hero fields");
    const fileInput = await page.$('div[class*="bg-[#101012]"] input[type="file"]');
    if (fileInput) { await fileInput.uploadFile(QA_PHOTO); } 
    await waitFor(page, () => page.evaluate(() => !!Array.from(document.querySelectorAll('div[class*="bg-[#101012]"] img')).find((img) => (img as HTMLImageElement).src.includes("/api/storage/local/"))), 20000, "hero image uploaded");
    check("hero image replaced via upload (blob URL)", true, "");
    await page.click('button[aria-label="Close editor"]');
    await waitFor(page, () => page.evaluate(() => !document.querySelector('button[aria-label="Close editor"]')), 10000, "drawer closed");

    // ── Edit a service ──
    const servWrap = await sectionWrapper(page, "Complete water");
    const sb = await servWrap.asElement()?.boundingBox();
    if (sb) await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => { (document.querySelector('button[title="Edit services section"]') as HTMLElement)?.click(); });
    await waitFor(page, () => visibleText(page, "Borewell Drilling"), 12000, "services panel");
    check("services drawer opens from section chrome", await visibleText(page, "Add service"), "");
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("Borewell Drilling")); (b as HTMLButtonElement)?.click(); });
    await waitFor(page, () => page.evaluate(() => Array.from(document.querySelectorAll("input")).some((i) => (i as HTMLInputElement).value === "Borewell Drilling")), 10000, "service expanded");
    await typeIntoInputWithValue(page, "Borewell Drilling", "QA Borewell Drilling V1");
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("Save service")); (b as HTMLButtonElement)?.click(); });
    await waitFor(page, () => visibleText(page, "QA Borewell Drilling V1"), 12000, "service renamed");
    check("service edited via collection panel + saved", true, "");
    await page.click('button[aria-label="Close editor"]');
    await waitFor(page, () => page.evaluate(() => !document.querySelector('button[aria-label="Close editor"]')), 10000, "drawer closed");

    // ── Gallery add photo ──
    const galWrap = await sectionWrapper(page, "Work in motion");
    const gb = await galWrap.asElement()?.boundingBox();
    if (gb) await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => { (document.querySelector('button[title="Edit gallery section"]') as HTMLElement)?.click(); });
    await waitFor(page, () => visibleText(page, "Gallery photos"), 12000, "gallery panel");
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("Add photo")); (b as HTMLButtonElement)?.click(); });
    await waitFor(page, () => page.evaluate(() => !!document.querySelector('div[class*="bg-[#101012]"] input[placeholder="Caption (shown on the website)"]')), 10000, "gallery form");
    const galFile = await page.$('div[class*="bg-[#101012]"] input[type="file"]');
    if (galFile) await galFile.uploadFile(QA_PHOTO);
    await waitFor(page, () => page.evaluate(() => {
      const addPhoto = Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Add photo") as HTMLButtonElement | undefined;
      return Boolean(document.querySelector('div[class*="bg-[#101012]"] img[src*="/api/storage/local/"]')) && Boolean(addPhoto && !addPhoto.disabled);
    }), 20000, "gallery image uploaded");
    await typeInto(page, 'input[placeholder="Caption (shown on the website)"]', "QA Field Test Photo");
    await typeInto(page, 'input[placeholder="Alt text (accessibility)"]', "QA field drilling");
    await typeInto(page, 'input[placeholder="Category (e.g. Industrial)"]', "Industrial");
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("Add photo")); (b as HTMLButtonElement)?.click(); });
    await waitFor(page, () => page.evaluate(() => !document.querySelector('input[placeholder="Caption (shown on the website)"]')), 15000, "gallery form saved");
    await waitFor(page, () => visibleText(page, "QA Field Test Photo"), 15000, "submitted gallery row");
    await page.goto(`${BASE}/admin/website?page=home`, { waitUntil: "networkidle2" });
    await waitFor(page, () => visibleText(page, "Publish website"), 20000, "editor after gallery save");
    await page.evaluate(() => { (document.querySelector('button[title="Edit gallery section"]') as HTMLElement)?.click(); });
    await waitFor(page, () => visibleText(page, "Gallery photos"), 12000, "gallery panel after save");
    await waitFor(page, () => visibleText(page, "QA Field Test Photo"), 15000, "gallery row created");
    check("gallery photo added (caption + alt + category) as Draft", true, "");

    // ── Preview ──
    await page.click('button[aria-label="Close editor"]');
    await waitFor(page, () => page.evaluate(() => !document.querySelector('button[aria-label="Close editor"]')), 10000, "drawer closed");
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.trim() === "Preview"); (b as HTMLButtonElement)?.click(); });
    await new Promise((r) => setTimeout(r, 600));
    const previewNoChrome = await page.evaluate(() => ({
      chrome: document.querySelectorAll('div[class*="group/edsec"]').length,
      editable: document.querySelectorAll('[role="button"][title^="Edit"]').length,
    }));
    check("preview mode disables all editor chrome", previewNoChrome.chrome === 0 && previewNoChrome.editable === 0, JSON.stringify(previewNoChrome));
    check("preview shows draft hero heading", await visibleText(page, "Visual Editor QA V1"), "");
    check("preview shows draft service title", await visibleText(page, "QA Borewell Drilling V1"), "");

    // ── Publish website ──
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("Edit")); (b as HTMLButtonElement)?.click(); });
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("Publish website")); (b as HTMLButtonElement)?.click(); });
    await waitFor(page, () => visibleText(page, "live (past version)"), 30000, "page published");
    check("Publish website → page becomes live", true, "");

    // ── Public verification ──
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
    check("public / shows new hero heading", await visibleText(page, "Visual Editor QA V1"), "");
    check("public / keeps hero subheadline", await visibleText(page, HOME_HERO.supportingText), "");
    check("public / shows published nav (CMS header)", await visibleText(page, "About"), "");
    check("public / shows published QA service", await visibleText(page, "QA Borewell Drilling V1"), "");
    check("public / gallery preview shows published photo", await visibleText(page, "QA Field Test Photo"), "");

    // gallery bug-fix proof: /gallery page row is still DRAFT → fallback shows the photo
    await page.goto(`${BASE}/gallery`, { waitUntil: "networkidle2" });
    check("gallery bug fix: public /gallery shows photo despite draft page", await visibleText(page, "QA Field Test Photo"), "data-driven PageRenderer fallback");
    check("gallery page hero label present", await visibleText(page, "Gallery"), "");

    // responsive audit of live public pages
    for (const w of [320, 375, 390, 430]) {
      await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
      await auditPublicTargets(page, w, "public home");
      await page.goto(`${BASE}/gallery`, { waitUntil: "networkidle2" });
      await auditWidth(page, w, "public gallery");
    }
    for (const w of [768, 1024, 1440]) {
      await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
      await auditWidth(page, w, "public home");
    }

    // editor responsive: toolbar + bottom-sheet drawer open at mobile widths
    await page.goto(`${BASE}/admin/website?page=home`, { waitUntil: "networkidle2" });
    await waitFor(page, () => visibleText(page, "Publish website"), 20000, "editor");
    for (const w of [320, 375, 390, 430]) {
      await page.setViewport({ width: w, height: 850 });
      await new Promise((r) => setTimeout(r, 400));
    const heroEl = await heroWrap.asElement();
    await page.evaluate(() => { (document.querySelector('[title="Edit Heading"]') as HTMLElement)?.click(); });
      await waitFor(page, () => visibleText(page, "Save draft"), 12000, "drawer @" + w);
      const sheet = await page.evaluate(() => {
        const d = Array.from(document.querySelectorAll("div")).find((e) => e.className.includes("rounded-t-2xl") && e.className.includes("bottom-0"));
        if (!d) return null;
        const r = d.getBoundingClientRect();
        return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height), iw: window.innerWidth };
      });
      check(`@${w}px drawer renders as full-width bottom sheet`, !!sheet && sheet.left === 0 && sheet.right === sheet.iw, sheet ? JSON.stringify(sheet) : "drawer not found");
      await page.evaluate(() => { (document.querySelector('button[aria-label="Close editor"]') as HTMLElement)?.click(); });
      await new Promise((r) => setTimeout(r, 400));
    }

    // ── Unpublish photo → /gallery honest empty state ──
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("Add photo")); void b; });
    // open gallery panel, unpublish
    const galWrap2 = await sectionWrapper(page, "Work in motion");
    const gb2 = await galWrap2.asElement()?.boundingBox();
    if (gb2) await page.mouse.move(gb2.x + gb2.width / 2, gb2.y + gb2.height / 2);
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => { (document.querySelector('button[title="Edit gallery section"]') as HTMLElement)?.click(); });
    await waitFor(page, () => visibleText(page, "Gallery photos"), 12000, "gallery panel");
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("QA Field Test Photo")); (b as HTMLButtonElement)?.click(); });
    await waitFor(page, () => page.evaluate(() => Array.from(document.querySelectorAll("input")).some((i) => (i as HTMLInputElement).value === "QA Field Test Photo")), 10000, "photo expanded");
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.trim() === "Unpublish"); (b as HTMLButtonElement)?.click(); });
    // The drawer retains its initial client snapshot after this server action.
    // Reopen it to assert the persisted state: unpublished photos leave its list.
    await page.reload({ waitUntil: "networkidle2" });
    await waitFor(page, () => visibleText(page, "Publish website"), 20000, "editor refreshed after photo unpublish");
    const galWrapAfterUnpublish = await sectionWrapper(page, "Work in motion");
    const gabAfterUnpublish = await galWrapAfterUnpublish.asElement()?.boundingBox();
    if (gabAfterUnpublish) await page.mouse.move(gabAfterUnpublish.x + gabAfterUnpublish.width / 2, gabAfterUnpublish.y + gabAfterUnpublish.height / 2);
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => { (document.querySelector('button[title="Edit gallery section"]') as HTMLElement)?.click(); });
    await waitFor(page, () => visibleText(page, "Gallery photos"), 12000, "gallery panel after photo unpublish");
    check("photo unpublished via drawer", await page.evaluate(() => !Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.trim() === "QA Field Test Photo")), "");
    await page.click('button[aria-label="Close editor"]');
    await waitFor(page, () => page.evaluate(() => !document.querySelector('button[aria-label="Close editor"]')), 10000, "drawer closed");
    await page.goto(`${BASE}/gallery`, { waitUntil: "networkidle2" });
    check("unpublish → /gallery honest empty state", !(await visibleText(page, "QA Field Test Photo")), "");

    // ── Delete photo (blob cleanup) ──
    await page.goto(`${BASE}/admin/website?page=home`, { waitUntil: "networkidle2" });
    await waitFor(page, () => visibleText(page, "Publish website"), 20000, "editor");
    const galWrap3 = await sectionWrapper(page, "Work in motion");
    const gb3 = await galWrap3.asElement()?.boundingBox();
    if (gb3) await page.mouse.move(gb3.x + gb3.width / 2, gb3.y + gb3.height / 2);
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => { (document.querySelector('button[title="Edit gallery section"]') as HTMLElement)?.click(); });
    await waitFor(page, () => visibleText(page, "Gallery photos"), 12000, "gallery panel");
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("QA Field Test Photo")); (b as HTMLButtonElement)?.click(); });
    await waitFor(page, () => page.evaluate(() => Array.from(document.querySelectorAll("input")).some((i) => (i as HTMLInputElement).value === "QA Field Test Photo")), 10000, "photo expanded");
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.trim() === "Delete"); (b as HTMLButtonElement)?.click(); });
    await waitFor(page, () => visibleText(page, "Confirm"), 8000, "delete confirm");
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.trim() === "Confirm"); (b as HTMLButtonElement)?.click(); });
    await waitFor(page, () => page.evaluate(() => !document.body.innerText.includes("QA Field Test Photo")), 15000, "photo deleted");
    check("photo deleted (row + ConfirmButton destructive flow)", true, "");
    const qaRow = await prisma.websiteGalleryItem.findFirst({ where: { caption: "QA Field Test Photo" } });
    check("delete → DB row soft-deleted", !qaRow || qaRow.deletedAt !== null, qaRow ? `deletedAt=${String(qaRow.deletedAt)}` : "(row gone)");
    await page.click('button[aria-label="Close editor"]').catch(() => {});

    // restore hero heading via UI so baseline doesn't leak into public static
    await page.evaluate(() => { (document.querySelector('[title="Edit Heading"]') as HTMLElement)?.click(); });
    await waitFor(page, () => page.evaluate(() => Array.from(document.querySelectorAll("input")).some((i) => (i as HTMLInputElement).value === "Visual Editor QA V1")), 12000, "hero panel");
    await typeIntoInputWithValue(page, "Visual Editor QA V1", HERO_HEADING);
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("Save draft")); (b as HTMLButtonElement)?.click(); });
    await waitFor(page, () => visibleText(page, "Draft saved. Publish this page to make it live."), 12000, "restore saved");
    check("hero heading restored to baseline via editor", true, "");

    // runtime errors
    await new Promise((r) => setTimeout(r, 800));
    const realErrors = errors.filter((e) => !/favicon|net::ERR|Failed to load resource/i.test(e));
    check("no client runtime errors during flow", realErrors.length === 0, realErrors.slice(0, 5).join(" | "));
  } finally {
    await browser.close();
    await restore(snap);
    const liveGallery = await prisma.websiteGalleryItem.findMany({ where: { deletedAt: null, publishedAt: { not: null } } });
    const homeAfter = await prisma.websitePage.findUnique({ where: { slug: "home" } });
    console.log("");
    check("baseline restored: no live gallery items", liveGallery.length === 0, String(liveGallery.length));
    check("baseline restored: home unpublished", homeAfter?.status !== "PUBLISHED", homeAfter!.status);
  }

  console.log(notes.map((n) => `  note  ${n}`).join("\n"));
  console.log(failures === 0 ? `\nALL PASSED` : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("QA ERROR:", e);
  process.exit(1);
});
