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
 *   2. cta      "Request a quote" / "Request quote" / "Request A Quote" -> "Request a proposal"
 *               (whole-string matches only, inside section content/publishedContent).
 *
 * Before --apply it writes every original row it will change to backups/homepage-<ts>.json
 * (including ids of rows it creates), so any step can be reverted by hand.
 * NOTE: .env may point at the PRODUCTION database — always read the dry run first.
 */
import fs from "node:fs";
import { prisma } from "../lib/prisma";
import { HOME_HERO } from "../lib/website/home-defaults";

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

async function main() {
  const apply = process.argv.includes("--apply");
  console.log("Step 1: navigation"); await planNav();
  console.log("Step 2: CTA label");  await planCta();
  console.log("Step 3: hero copy");  await planHero();
  console.log(`\n${ops.length} change(s) planned.`);
  if (!apply) { console.log("DRY RUN — nothing written. Re-run with --apply to write."); await prisma.$disconnect(); return; }
  if (!ops.length) { await prisma.$disconnect(); return; }

  fs.mkdirSync("backups", { recursive: true });
  const file = `backups/homepage-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(file, JSON.stringify({ ops: ops.map((o) => ({ label: o.label, before: o.before })) }, null, 2));
  console.log("Backup written:", file);
  for (const o of ops) { await o.run(); console.log("  done", o.label); }
  fs.writeFileSync(file, JSON.stringify({ ops: ops.map((o) => ({ label: o.label, before: o.before })), createdNavIds: created }, null, 2));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
