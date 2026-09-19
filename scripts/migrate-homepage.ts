/**
 * Live-CMS migration for the homepage rebuild. Each Phase 3 section appends its own step.
 *
 *   npx tsx --env-file=.env scripts/migrate-homepage.ts            # DRY RUN (default)
 *   npx tsx --env-file=.env scripts/migrate-homepage.ts --apply    # writes, after backing up
 *
 * Steps so far:
 *   1. nav      navbar becomes Services, Clients, Projects, Contact (About/Gallery leave the
 *               nav table; the footer links them from code). Draft + published snapshot kept in sync.

 *   3. hero     home/hero copy -> commercial headline, subheadline, "Get a site assessment" +
 *               "Download company profile" (/company-profile placeholder). The uploaded hero
 *               image is KEPT; only its alt text is corrected. Draft + published stay in sync.
 *   4. stats    home/stats items -> the four headline stats (34+, 1200+, 20+, Haryana & NCR),
 *               replacing the six current items (incl. "Modern fleet", "Water infra").
 *   5. logos    attach the staged client logos (public/clients/*) to the matching WebsiteClient rows
 *               (draft + published snapshot) and add O.P. Jindal Global University, which the
 *               owner named as a client but which is not in the CMS. Rows without a logo are untouched.
 *   6. sectors  create the home "Sectors served" section (Industrial, Real estate, Government & tenders,
 *               Residential) with draft + published content. Its position is provisional (100):
 *               the final ordering step places every home section.
 *   7. services home/services content -> "Services / What we deliver" (icon + title cards; the old
 *               description and highlighted-word fields are dropped), and the CMS service
 *               "Borewell Material Supply" is renamed "Material Supply" (draft + snapshot) so the
 *               card matches the brief. Slugs/URLs are untouched.
 *   8. projects create the home "Featured Projects" section holding the three real projects from the
 *               owner's work orders (BigBasket Kundli, Ashoka University North Campus, EOC Polymers).
 *               /projects reads the same rows. Position is provisional (101) until the ordering step.
 *   9. closing  home/cta content -> "Planning a project?" + supporting line + "Request a proposal"
 *               (drops the decorative "1992" watermark field).
 *  10. order    FINAL ordering of the live home page (position/visible take effect immediately):
 *               hero, stats, sectors, services, projects, CTA. Sections not in the brief's order
 *               (why_choose, process, gallery) are HIDDEN, not deleted: their content stays in the
 *               CMS. The testimonials section MOVES to the clients page (approval-gated: it shows
 *               nothing until a testimonial is approved). The five-step process already lives on
 *               the Borewell Drilling and Tubewell Construction pages.
 *  11. about    about-page copy fixes in the CMS rows: the two photo alt texts (the old ones did not
 *               describe the images) and the unmeasurable "100% Focus" stat card -> "20+ Clients".
 *   2. cta      "Request a quote" / "Request quote" / "Request A Quote" -> "Request a proposal"
 *               (whole-string matches only, inside section content/publishedContent).
 *
 * Before --apply it writes every original row it will change to backups/homepage-<ts>.json
 * (including ids of rows it creates), so any step can be reverted by hand.
 * NOTE: .env may point at the PRODUCTION database — always read the dry run first.
 */
import fs from "node:fs";
import { Prisma, PrismaClient } from "@prisma/client";

// Direct (unpooled) connection: an interactive transaction must hold one connection for its whole life.
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
import { HOME_CTA, HOME_HERO, HOME_SECTORS, HOME_SERVICES, HOME_STATS } from "../lib/website/home-defaults";
import { HOME_PROJECTS, PROJECTS } from "../lib/website/projects-data";
import { CLIENT_LOGOS } from "../lib/website/client-logos";

type Db = Prisma.TransactionClient;
type Op = { label: string; before: unknown; run: (db: Db) => Promise<unknown> };
class Rollback extends Error {}
const ops: Op[] = [];
const created: string[] = [];

// ── 1. nav ────────────────────────────────────────────────────────────────
const NAV = [
  { label: "Services", url: "/services" },
  { label: "Clients", url: "/clients" },
  { label: "Projects", url: "/projects" },
  { label: "Contact", url: "/contact" },
];

async function planNav() {
  const rows = await prisma.websiteNavItem.findMany({ where: { deletedAt: null }, orderBy: { position: "asc" } });
  const snap = (label: string, url: string, position: number, r?: (typeof rows)[number]) => ({
    label, url, position, visible: true, openNewTab: r?.openNewTab ?? false, parentId: r?.parentId ?? null,
  });
  NAV.forEach((n, position) => {
    const existing = rows.find((r) => r.url === n.url);
    if (existing) {
      const ps = existing.publishedData as Record<string, unknown> | null;
      if (existing.position === position && existing.label === n.label && ps?.position === position && ps?.label === n.label) return;
      console.log(`  ~ nav "${n.label}" position ${existing.position} -> ${position}`);
      ops.push({
        label: `nav ${existing.id}`, before: existing,
        run: (db) => db.websiteNavItem.update({ where: { id: existing.id }, data: { label: n.label, position, visible: true, status: "PUBLISHED", publishedAt: existing.publishedAt ?? new Date(), publishedData: snap(n.label, n.url, position, existing) } }),
      });
    } else {
      console.log(`  + nav "${n.label}" (${n.url}) at position ${position} [new row, published]`);
      ops.push({
        label: `nav create ${n.url}`, before: null,
        run: async (db) => {
          const row = await db.websiteNavItem.create({ data: { label: n.label, url: n.url, position, visible: true, status: "PUBLISHED", publishedAt: new Date(), publishedData: snap(n.label, n.url, position) } });
          created.push(row.id);
        },
      });
    }
  });
  for (const r of rows.filter((r) => !NAV.some((n) => n.url === r.url))) {
    console.log(`  - nav "${r.label}" (${r.url}) removed from navbar (soft-deleted; footer still links it)`);
    ops.push({ label: `nav remove ${r.id}`, before: r, run: (db) => db.websiteNavItem.update({ where: { id: r.id }, data: { deletedAt: new Date() } }) });
  }
}

// ── 2. cta labels ─────────────────────────────────────────────────────────
const CTA_OLD = new Set(["Request a quote", "Request quote", "Request A Quote", "Request a Quote"]);
const CTA_NEW = "Request a proposal";
function fixCta<T>(v: T): T {
  if (typeof v === "string") return (CTA_OLD.has(v) ? CTA_NEW : v) as unknown as T;
  if (Array.isArray(v)) return v.map(fixCta) as unknown as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, fixCta(x)])) as T;
  return v;
}
const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

async function planCta() {
  const sections = await prisma.websiteSection.findMany({ include: { page: { select: { slug: true } } } });
  for (const s of sections) {
    const data: Record<string, unknown> = {};
    const before: Record<string, unknown> = { id: s.id };
    for (const col of ["content", "publishedContent"] as const) {
      const fixed = fixCta(s[col]);
      if (changed(s[col], fixed)) { before[col] = s[col]; data[col] = fixed; console.log(`  ~ cta ${s.page.slug}/${s.type} ${col}`); }
    }
    if (Object.keys(data).length) ops.push({ label: `section ${s.id}`, before, run: (db) => db.websiteSection.update({ where: { id: s.id }, data: data as never }) });
  }
}

// ── 3. hero ───────────────────────────────────────────────────────────────
async function planHero() {
  const hero = await prisma.websiteSection.findFirst({ where: { type: "hero", page: { slug: "home" }, deletedAt: null } });
  if (!hero) { console.log("  (no home hero section found)"); return; }
  const data: Record<string, unknown> = {};
  const before: Record<string, unknown> = { id: hero.id };
  for (const col of ["content", "publishedContent"] as const) {
    const cur = hero[col] as Record<string, unknown> | null;
    if (!cur) continue; // never published -> nothing live to migrate
    const next: Record<string, unknown> = { ...cur, ...HOME_HERO };
    if (typeof cur.heroImage === "string" && cur.heroImage) next.heroImage = cur.heroImage; // keep the uploaded photo
    if (cur.mobileImage) next.mobileImage = cur.mobileImage;
    const keys = Object.keys(HOME_HERO).filter((k) => JSON.stringify(cur[k]) !== JSON.stringify(next[k]));
    if (keys.length) {
      before[col] = cur; data[col] = next;
      console.log(`  ~ hero ${col}:`);
      for (const k of keys) console.log(`      ${k}: ${JSON.stringify(cur[k])?.slice(0, 70)}  ->  ${JSON.stringify(next[k]).slice(0, 70)}`);
    }
  }
  if (Object.keys(data).length) ops.push({ label: `hero ${hero.id}`, before, run: (db) => db.websiteSection.update({ where: { id: hero.id }, data: data as never }) });
}

// ── 4. stats ──────────────────────────────────────────────────────────────
async function planStats() {
  const sec = await prisma.websiteSection.findFirst({ where: { type: "stats", page: { slug: "home" }, deletedAt: null } });
  if (!sec) { console.log("  (no home stats section found)"); return; }
  const items = HOME_STATS.map((s) => ({ label: s.label, value: s.value }));
  const data: Record<string, unknown> = {};
  const before: Record<string, unknown> = { id: sec.id };
  for (const col of ["content", "publishedContent"] as const) {
    const cur = sec[col] as Record<string, unknown> | null;
    if (!cur) continue;
    if (JSON.stringify(cur.items) === JSON.stringify(items)) continue;
    before[col] = cur; data[col] = { ...cur, items };
    const old = Array.isArray(cur.items) ? (cur.items as Array<{ value?: string; label?: string }>).map((i) => `${i.value} ${i.label}`).join(" | ") : "(none)";
    console.log(`  ~ stats ${col}:
      was: ${old}
      now: ${items.map((i) => `${i.value} ${i.label}`).join(" | ")}`);
  }
  if (Object.keys(data).length) ops.push({ label: `stats ${sec.id}`, before, run: (db) => db.websiteSection.update({ where: { id: sec.id }, data: data as never }) });
}

// ── 5. client logos ───────────────────────────────────────────────────────
const LOGOS = CLIENT_LOGOS.filter((l) => l.name !== "O.P. Jindal Global University");
const JINDAL = CLIENT_LOGOS.find((l) => l.name === "O.P. Jindal Global University")!;
const NEW_CLIENT = { name: JINDAL.name, sector: "Institutional", logoUrl: JINDAL.logoUrl, altText: JINDAL.altText, featured: true };

async function planLogos() {
  const rows = await prisma.websiteClient.findMany({ where: { deletedAt: null }, orderBy: { position: "asc" } });
  for (const l of LOGOS) {
    const row = rows.find((r) => r.name === l.name);
    if (!row) { console.log(`  ! no CMS client named "${l.name}" (skipped)`); continue; }
    const ps = row.publishedData as Record<string, unknown> | null;
    if (row.logoUrl === l.logoUrl && ps?.logoUrl === l.logoUrl) continue;
    console.log(`  ~ logo "${row.name}": ${row.logoUrl ?? "(none)"} -> ${l.logoUrl}`);
    ops.push({
      label: `client ${row.id}`, before: row,
      run: (db) => db.websiteClient.update({ where: { id: row.id }, data: { logoUrl: l.logoUrl, altText: l.altText, ...(ps ? { publishedData: { ...ps, logoUrl: l.logoUrl, altText: l.altText } } : {}) } }),
    });
  }
  if (rows.some((r) => r.name === NEW_CLIENT.name)) return;
  const position = rows.reduce((m, r) => Math.max(m, r.position), 0) + 1;
  console.log(`  + client "${NEW_CLIENT.name}" (${NEW_CLIENT.sector}, featured, published) at position ${position}`);
  ops.push({
    label: `client create ${NEW_CLIENT.name}`, before: null,
    run: async (db) => {
      const snap = { name: NEW_CLIENT.name, logoUrl: NEW_CLIENT.logoUrl, websiteUrl: null, altText: NEW_CLIENT.altText, description: null, sector: NEW_CLIENT.sector, featured: true, position, visible: true };
      const row = await db.websiteClient.create({ data: { ...snap, status: "PUBLISHED", publishedAt: new Date(), publishedData: snap } });
      created.push(row.id);
    },
  });
}

// ── 6. sectors ────────────────────────────────────────────────────────────
async function planSectors() {
  const home = await prisma.websitePage.findUnique({ where: { slug: "home" } });
  if (!home) { console.log("  (no home page found)"); return; }
  const existing = await prisma.websiteSection.findFirst({ where: { pageId: home.id, type: "sectors", deletedAt: null } });
  if (existing) { console.log("  = home already has a sectors section (left as is)"); return; }
  const content = { eyebrow: HOME_SECTORS.eyebrow, heading: HOME_SECTORS.heading, sectors: HOME_SECTORS.sectors.map((s) => ({ name: s.name })) };
  console.log(`  + home/sectors "${HOME_SECTORS.heading}": ${HOME_SECTORS.sectors.map((s) => s.name).join(" | ")}  [published, position 100 = provisional]`);
  ops.push({
    label: "sectors create", before: null,
    run: async (db) => {
      const row = await db.websiteSection.create({ data: { pageId: home.id, type: "sectors", name: "Sectors served", content, publishedContent: content, publishedAt: new Date(), position: 100, visible: true } });
      created.push(row.id);
    },
  });
}

// ── 7. services ───────────────────────────────────────────────────────────
async function planServices() {
  const sec = await prisma.websiteSection.findFirst({ where: { type: "services", page: { slug: "home" }, deletedAt: null } });
  if (!sec) console.log("  (no home services section found)");
  else {
    const next = { eyebrow: HOME_SERVICES.eyebrow, heading: HOME_SERVICES.heading };
    const data: Record<string, unknown> = {};
    const before: Record<string, unknown> = { id: sec.id };
    for (const col of ["content", "publishedContent"] as const) {
      const cur = sec[col] as Record<string, unknown> | null;
      if (!cur || JSON.stringify(cur) === JSON.stringify(next)) continue;
      before[col] = cur; data[col] = next;
      console.log(`  ~ services section ${col}: "${cur.eyebrow}" / "${cur.heading}${cur.headingHighlight ? " " + cur.headingHighlight : ""}"  ->  "${next.eyebrow}" / "${next.heading}"  (drops: ${Object.keys(cur).filter((k) => !(k in next)).join(", ")})`);
    }
    if (Object.keys(data).length) ops.push({ label: `services section ${sec.id}`, before, run: (db) => db.websiteSection.update({ where: { id: sec.id }, data: data as never }) });
  }
  const row = await prisma.websiteService.findFirst({ where: { slug: "borewell-material-supply", deletedAt: null } });
  if (row && row.title !== "Material Supply") {
    const ps = row.publishedData as Record<string, unknown> | null;
    console.log(`  ~ service "${row.title}" -> "Material Supply" (slug ${row.slug} unchanged)`);
    ops.push({ label: `service ${row.id}`, before: row, run: (db) => db.websiteService.update({ where: { id: row.id }, data: { title: "Material Supply", ...(ps ? { publishedData: { ...ps, title: "Material Supply" } } : {}) } }) });
  }
}

// ── 8. featured projects ──────────────────────────────────────────────────
async function planProjects() {
  const home = await prisma.websitePage.findUnique({ where: { slug: "home" } });
  if (!home) { console.log("  (no home page found)"); return; }
  const existing = await prisma.websiteSection.findFirst({ where: { pageId: home.id, type: "case_studies", deletedAt: null } });
  if (existing) { console.log("  = home already has a Featured Projects section (left as is)"); return; }
  const content = { ...HOME_PROJECTS, projects: PROJECTS.map((p) => ({ ...p })) };
  console.log(`  + home/case_studies "${HOME_PROJECTS.heading}" [published, position 101 = provisional]`);
  for (const p of PROJECTS) console.log(`      - ${p.title}  |  ${p.location}  |  ${p.sector}  |  ${p.year}`);
  ops.push({
    label: "projects create", before: null,
    run: async (db) => {
      const row = await db.websiteSection.create({ data: { pageId: home.id, type: "case_studies", name: "Featured projects", content, publishedContent: content, publishedAt: new Date(), position: 101, visible: true } });
      created.push(row.id);
    },
  });
}

// ── 9. closing CTA ────────────────────────────────────────────────────────
async function planClosingCta() {
  const sec = await prisma.websiteSection.findFirst({ where: { type: "cta", page: { slug: "home" }, deletedAt: null } });
  if (!sec) { console.log("  (no home cta section found)"); return; }
  const next = { heading: HOME_CTA.heading, text: HOME_CTA.text, ctaText: HOME_CTA.ctaText, ctaUrl: HOME_CTA.ctaUrl };
  const data: Record<string, unknown> = {};
  const before: Record<string, unknown> = { id: sec.id };
  for (const col of ["content", "publishedContent"] as const) {
    const cur = sec[col] as Record<string, unknown> | null;
    if (!cur || JSON.stringify(cur) === JSON.stringify(next)) continue;
    before[col] = cur; data[col] = next;
    console.log(`  ~ home/cta ${col}: "${cur.heading}" / "${cur.ctaText}"  ->  "${next.heading}" / "${next.ctaText}"  (drops: ${Object.keys(cur).filter((k) => !(k in next)).join(", ") || "-"})`);
  }
  if (Object.keys(data).length) ops.push({ label: `cta ${sec.id}`, before, run: (db) => db.websiteSection.update({ where: { id: sec.id }, data: data as never }) });
}

// ── 10. final order + relocations ─────────────────────────────────────────
const HOME_ORDER = ["hero", "stats", "sectors", "services", "case_studies", "cta"];
const HOME_HIDE = ["why_choose", "process", "gallery"];

async function planOrder() {
  const home = await prisma.websitePage.findUnique({ where: { slug: "home" } });
  const clients = await prisma.websitePage.findUnique({ where: { slug: "clients" } });
  if (!home) { console.log("  (no home page found)"); return; }
  // Sections this run will create are not in the DB yet during a dry run; note that honestly.
  const willCreate = new Set<string>();
  if (!(await prisma.websiteSection.findFirst({ where: { pageId: home.id, type: "sectors", deletedAt: null } }))) willCreate.add("sectors");
  if (!(await prisma.websiteSection.findFirst({ where: { pageId: home.id, type: "case_studies", deletedAt: null } }))) willCreate.add("case_studies");

  const rows = await prisma.websiteSection.findMany({ where: { pageId: home.id, deletedAt: null }, orderBy: { position: "asc" } });
  const byType = (t: string) => rows.find((r) => r.type === t);
  console.log("  current home order: " + rows.map((r) => `${r.position}:${r.type}${r.visible ? "" : "(hidden)"}`).join("  "));
  console.log("  target  home order: " + HOME_ORDER.join(" > ") + `   |  hidden: ${HOME_HIDE.join(", ")}`);

  // Positions/visibility must be applied AFTER the create steps (they run earlier in this script),
  // so resolve rows at run time rather than from this snapshot.
  ops.push({
    label: "home order", before: rows.map((r) => ({ id: r.id, type: r.type, position: r.position, visible: r.visible })),
    run: async (db) => {
      const live = await db.websiteSection.findMany({ where: { pageId: home.id, deletedAt: null } });
      let pos = 0;
      for (const type of HOME_ORDER) {
        const r = live.find((x) => x.type === type);
        if (!r) { console.log(`    ! no "${type}" section to place`); continue; }
        await db.websiteSection.update({ where: { id: r.id }, data: { position: pos++, visible: true } });
      }
      for (const type of HOME_HIDE) {
        const r = live.find((x) => x.type === type);
        if (r) await db.websiteSection.update({ where: { id: r.id }, data: { position: 100 + pos++, visible: false } });
      }
    },
  });
  for (const t of HOME_ORDER) if (!byType(t) && !willCreate.has(t)) console.log(`  ! home has no "${t}" section`);

  // testimonials: move to the clients page
  const testi = byType("testimonials");
  if (testi && clients) {
    const max = await prisma.websiteSection.aggregate({ where: { pageId: clients.id, deletedAt: null }, _max: { position: true } });
    console.log(`  -> testimonials section moves home -> clients (position ${(max._max.position ?? -1) + 1}); renders only APPROVED testimonials (currently 0)`);
    ops.push({ label: `testimonials move ${testi.id}`, before: { id: testi.id, pageId: testi.pageId, position: testi.position, visible: testi.visible },
      run: (db) => db.websiteSection.update({ where: { id: testi.id }, data: { pageId: clients.id, position: (max._max.position ?? -1) + 1, visible: true } }) });
  } else if (!testi) console.log("  = no testimonials section on home (nothing to move)");
}

/** Read back what the live site would look like, from INSIDE the transaction. */
async function report(db: Db) {
  const home = await db.websitePage.findUnique({ where: { slug: "home" } });
  const clients = await db.websitePage.findUnique({ where: { slug: "clients" } });
  const sec = async (pageId?: string) => (pageId ? db.websiteSection.findMany({ where: { pageId, deletedAt: null }, orderBy: { position: "asc" } }) : []);
  const fmt = (rows: Array<{ position: number; type: string; visible: boolean }>) => rows.map((r) => `${r.position}:${r.type}${r.visible ? "" : "(hidden)"}`).join("  ");
  console.log("\n  RESULT home    : " + fmt(await sec(home?.id)));
  console.log("  RESULT clients : " + fmt(await sec(clients?.id)));
  const nav = await db.websiteNavItem.findMany({ where: { deletedAt: null }, orderBy: { position: "asc" } });
  console.log("  RESULT navbar  : " + nav.map((n) => `${n.label}(${n.url})`).join(" | "));
  const logos = await db.websiteClient.findMany({ where: { deletedAt: null, logoUrl: { not: null } } });
  console.log(`  RESULT clients with logos: ${logos.length}  |  total clients: ${await db.websiteClient.count({ where: { deletedAt: null } })}`);
  const svc = await db.websiteService.findMany({ where: { deletedAt: null }, orderBy: { position: "asc" } });
  console.log("  RESULT services: " + svc.map((x) => `${x.title}(${x.slug})`).join(" | "));
}

// ── 11. about-page copy ───────────────────────────────────────────────────
const ABOUT_ALTS: Record<string, string> = {
  "Industrial engineer at work": "Worker in a ringed concrete pit guiding a pipe above a gravel bed",
  "Professional drilling team at work": "Crew lowering precast concrete rings into a trench beside a drilling rig",
};
const FOCUS_OLD = { title: "100% Focus", subtitle: "Quality commitment" };
const FOCUS_NEW = { title: "20+ Clients", subtitle: "Named clients", description: "Industrial, commercial and institutional sites across Haryana." };
function fixAbout<T>(v: T): T {
  if (typeof v === "string") return (ABOUT_ALTS[v] ?? v) as unknown as T;
  if (Array.isArray(v)) return v.map(fixAbout) as unknown as T;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (o.title === FOCUS_OLD.title && o.subtitle === FOCUS_OLD.subtitle) return { ...FOCUS_NEW } as unknown as T;
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, fixAbout(x)])) as T;
  }
  return v;
}
async function planAbout() {
  const secs = await prisma.websiteSection.findMany({ where: { page: { slug: "about" }, deletedAt: null } });
  for (const s of secs) {
    const data: Record<string, unknown> = {};
    const before: Record<string, unknown> = { id: s.id };
    for (const col of ["content", "publishedContent"] as const) {
      const fixed = fixAbout(s[col]);
      if (changed(s[col], fixed)) { before[col] = s[col]; data[col] = fixed; console.log(`  ~ about/${s.type} ${col}`); }
    }
    if (Object.keys(data).length) ops.push({ label: `about ${s.id}`, before, run: (db) => db.websiteSection.update({ where: { id: s.id }, data: data as never }) });
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const rehearse = process.argv.includes("--rehearse");
  console.log("Step 1: navigation"); await planNav();
  console.log("Step 2: CTA label");  await planCta();
  console.log("Step 3: hero copy");  await planHero();
  console.log("Step 4: stats strip"); await planStats();
  console.log("Step 5: client logos"); await planLogos();
  console.log("Step 6: sectors section"); await planSectors();
  console.log("Step 7: services cards"); await planServices();
  console.log("Step 8: featured projects"); await planProjects();
  console.log("Step 9: closing CTA"); await planClosingCta();
  console.log("Step 11: about-page copy"); await planAbout();
  console.log("Step 10: final order + relocations"); await planOrder();   // must stay LAST
  console.log(`\n${ops.length} change(s) planned.`);
  if (!apply && !rehearse) { console.log("DRY RUN — nothing written. Re-run with --rehearse (rolled back) or --apply (writes)."); await prisma.$disconnect(); return; }
  if (!ops.length) { await prisma.$disconnect(); return; }

  if (apply) {
    fs.mkdirSync("backups", { recursive: true });
    const file = `backups/homepage-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    fs.writeFileSync(file, JSON.stringify({ ops: ops.map((o) => ({ label: o.label, before: o.before })) }, null, 2));
    console.log("Backup written:", file);
  } else console.log("REHEARSAL: every step runs for real inside one transaction, then everything is rolled back.");

  try {
    // One transaction: either every step lands or none does (a failure leaves the live site untouched).
    await prisma.$transaction(async (db) => {
      for (const o of ops) { await o.run(db); console.log("  done", o.label); }
      await report(db);
      if (rehearse) throw new Rollback();
    }, { timeout: 120_000, maxWait: 30_000 });
    console.log("\nAPPLIED: all steps committed in a single transaction.");
  } catch (e) {
    if (e instanceof Rollback) console.log("\nREHEARSAL COMPLETE: rolled back, nothing was persisted.");
    else { console.error("\nFAILED and rolled back automatically; the live site is unchanged.\n", e); process.exitCode = 1; }
  } finally { await prisma.$disconnect(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
