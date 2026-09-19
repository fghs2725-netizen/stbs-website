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
 *   2. cta      "Request a quote" / "Request quote" / "Request A Quote" -> "Request a proposal"
 *               (whole-string matches only, inside section content/publishedContent).
 *
 * Before --apply it writes every original row it will change to backups/homepage-<ts>.json
 * (including ids of rows it creates), so any step can be reverted by hand.
 * NOTE: .env may point at the PRODUCTION database — always read the dry run first.
 */
import fs from "node:fs";
import { prisma } from "../lib/prisma";
import { HOME_HERO, HOME_SECTORS, HOME_SERVICES, HOME_STATS } from "../lib/website/home-defaults";
import { HOME_PROJECTS, PROJECTS } from "../lib/website/projects-data";

type Op = { label: string; before: unknown; run: () => Promise<unknown> };
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
        run: () => prisma.websiteNavItem.update({ where: { id: existing.id }, data: { label: n.label, position, visible: true, status: "PUBLISHED", publishedAt: existing.publishedAt ?? new Date(), publishedData: snap(n.label, n.url, position, existing) } }),
      });
    } else {
      console.log(`  + nav "${n.label}" (${n.url}) at position ${position} [new row, published]`);
      ops.push({
        label: `nav create ${n.url}`, before: null,
        run: async () => {
          const row = await prisma.websiteNavItem.create({ data: { label: n.label, url: n.url, position, visible: true, status: "PUBLISHED", publishedAt: new Date(), publishedData: snap(n.label, n.url, position) } });
          created.push(row.id);
        },
      });
    }
  });
  for (const r of rows.filter((r) => !NAV.some((n) => n.url === r.url))) {
    console.log(`  - nav "${r.label}" (${r.url}) removed from navbar (soft-deleted; footer still links it)`);
    ops.push({ label: `nav remove ${r.id}`, before: r, run: () => prisma.websiteNavItem.update({ where: { id: r.id }, data: { deletedAt: new Date() } }) });
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
    if (Object.keys(data).length) ops.push({ label: `section ${s.id}`, before, run: () => prisma.websiteSection.update({ where: { id: s.id }, data: data as never }) });
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
  if (Object.keys(data).length) ops.push({ label: `hero ${hero.id}`, before, run: () => prisma.websiteSection.update({ where: { id: hero.id }, data: data as never }) });
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
  if (Object.keys(data).length) ops.push({ label: `stats ${sec.id}`, before, run: () => prisma.websiteSection.update({ where: { id: sec.id }, data: data as never }) });
}

// ── 5. client logos ───────────────────────────────────────────────────────
const LOGOS: Array<{ name: string; logoUrl: string; altText: string }> = [
  { name: "Ashoka University", logoUrl: "/clients/ashoka-university.png", altText: "Ashoka University logo" },
  { name: "Amul Milk, Murthal", logoUrl: "/clients/amul.svg", altText: "Amul logo" },
  { name: "BigBasket, Sonipat Site", logoUrl: "/clients/bigbasket.png", altText: "BigBasket logo" },
  { name: "LT Overseas Pvt. Ltd. (Dawat Rice Mill)", logoUrl: "/clients/lt-foods.svg", altText: "LT Foods logo" },
  { name: "Voestalpine VAE VKN India Pvt. Ltd.", logoUrl: "/clients/voestalpine.svg", altText: "voestalpine logo" },
  { name: "Coral Drugs Pvt. Ltd.", logoUrl: "/clients/coral-drugs.svg", altText: "Coral Drugs logo" },
  { name: "Rishi Laser Limited", logoUrl: "/clients/rishi-laser.webp", altText: "Rishi Laser Limited logo" },
];
const NEW_CLIENT = { name: "O.P. Jindal Global University", sector: "Institutional", logoUrl: "/clients/op-jindal-global-university.webp", altText: "O.P. Jindal Global University logo", featured: true };

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
      run: () => prisma.websiteClient.update({ where: { id: row.id }, data: { logoUrl: l.logoUrl, altText: l.altText, ...(ps ? { publishedData: { ...ps, logoUrl: l.logoUrl, altText: l.altText } } : {}) } }),
    });
  }
  if (rows.some((r) => r.name === NEW_CLIENT.name)) return;
  const position = rows.reduce((m, r) => Math.max(m, r.position), 0) + 1;
  console.log(`  + client "${NEW_CLIENT.name}" (${NEW_CLIENT.sector}, featured, published) at position ${position}`);
  ops.push({
    label: `client create ${NEW_CLIENT.name}`, before: null,
    run: async () => {
      const snap = { name: NEW_CLIENT.name, logoUrl: NEW_CLIENT.logoUrl, websiteUrl: null, altText: NEW_CLIENT.altText, description: null, sector: NEW_CLIENT.sector, featured: true, position, visible: true };
      const row = await prisma.websiteClient.create({ data: { ...snap, status: "PUBLISHED", publishedAt: new Date(), publishedData: snap } });
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
    run: async () => {
      const row = await prisma.websiteSection.create({ data: { pageId: home.id, type: "sectors", name: "Sectors served", content, publishedContent: content, publishedAt: new Date(), position: 100, visible: true } });
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
    if (Object.keys(data).length) ops.push({ label: `services section ${sec.id}`, before, run: () => prisma.websiteSection.update({ where: { id: sec.id }, data: data as never }) });
  }
  const row = await prisma.websiteService.findFirst({ where: { slug: "borewell-material-supply", deletedAt: null } });
  if (row && row.title !== "Material Supply") {
    const ps = row.publishedData as Record<string, unknown> | null;
    console.log(`  ~ service "${row.title}" -> "Material Supply" (slug ${row.slug} unchanged)`);
    ops.push({ label: `service ${row.id}`, before: row, run: () => prisma.websiteService.update({ where: { id: row.id }, data: { title: "Material Supply", ...(ps ? { publishedData: { ...ps, title: "Material Supply" } } : {}) } }) });
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
    run: async () => {
      const row = await prisma.websiteSection.create({ data: { pageId: home.id, type: "case_studies", name: "Featured projects", content, publishedContent: content, publishedAt: new Date(), position: 101, visible: true } });
      created.push(row.id);
    },
  });
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log("Step 1: navigation"); await planNav();
  console.log("Step 2: CTA label");  await planCta();
  console.log("Step 3: hero copy");  await planHero();
  console.log("Step 4: stats strip"); await planStats();
  console.log("Step 5: client logos"); await planLogos();
  console.log("Step 6: sectors section"); await planSectors();
  console.log("Step 7: services cards"); await planServices();
  console.log("Step 8: featured projects"); await planProjects();
  console.log(`\n${ops.length} change(s) planned.`);
  if (!apply) { console.log("DRY RUN — nothing written. Re-run with --apply to write."); await prisma.$disconnect(); return; }
  if (!ops.length) { await prisma.$disconnect(); return; }

  fs.mkdirSync("backups", { recursive: true });
  const file = `backups/homepage-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(file, JSON.stringify({ ops: ops.map((o) => ({ label: o.label, before: o.before })) }, null, 2));
  console.log("Backup written:", file);
  for (const o of ops) { await o.run(); console.log("  done", o.label); }
  fs.writeFileSync(file, JSON.stringify({ ops: ops.map((o) => ({ label: o.label, before: o.before })), createdIds: created }, null, 2));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
