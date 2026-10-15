/**
 * One-off website content update (October 2026): brings the published CMS rows in line with the
 * company catalogue.
 *
 *  - Settings: second phone 79880 24114 -> 87081 28632 (the third number, 79888 14808, comes from
 *    lib/company.ts)
 *  - Home hero: catalogue cover photo (wide + phone crops), supporting line naming all five services
 *  - Home stats: 20+ -> 22+ clients
 *  - Services: adds "Water Testing" and orders the five in the order a job runs
 *  - Quotation template "STBS Classic": the phone line printed on quotations
 *
 * Dry run by default. `--apply` writes, after saving every row it touches to backups/.
 *   npx tsx scripts/update-website-content-2026-10.ts [--apply]
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";

for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=("?)(.*)\2$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[3];
}
const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const OLD_PHONE = "7988024114";
const NEW_PHONE2 = "8708128632";
const ORDER = ["water-testing", "borewell-drilling", "tubewell-construction", "borewell-material-supply", "rainwater-harvesting"];
const HERO = {
  heroImage: "/hero/stbs-water-outlets-wide.webp",
  mobileImage: "/hero/stbs-water-outlets.webp",
  heroImageAlt: "Water gushing from a row of green industrial outlet pipes into a channel at dusk",
  supportingText: "Water testing, borewell drilling, tubewell construction, material supply and rainwater recharge across Haryana & NCR.",
};
const WATER_TESTING = {
  title: "Water Testing",
  slug: "water-testing",
  shortDescription: "Ground survey up to 800 m before drilling; yield and water-quality tests after.",
  fullDescription: null,
  features: ["Survey up to 800 m", "Drilling point and depth fixed before drilling", "Yield, water level and quality results"],
  faqs: null,
  ctaText: null,
  ctaUrl: null,
  image: null,
  icon: null,
  seoTitle: null,
  seoDescription: null,
  visible: true,
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const log = (s: string) => console.log((APPLY ? "APPLY  " : "DRY    ") + s);

(async () => {
  const backup: Obj = { at: new Date().toISOString() };

  // 1. Settings phone2
  const settings = await prisma.websiteSettings.findFirst();
  if (settings) {
    backup.settings = settings;
    const pub = obj(settings.publishedData);
    log(`settings phone2 ${settings.phone2} / published ${pub.phone2 as string} -> ${NEW_PHONE2}`);
    if (APPLY) await prisma.websiteSettings.update({ where: { id: settings.id }, data: { phone2: NEW_PHONE2, publishedData: { ...pub, phone2: NEW_PHONE2 } as Prisma.InputJsonValue } });
  }

  // 2 + 3. Home hero and stats
  const home = await prisma.websitePage.findFirst({ where: { slug: "home", deletedAt: null }, include: { sections: true } });
  backup.homeSections = home?.sections.filter((s) => s.type === "hero" || s.type === "stats") ?? [];
  for (const s of home?.sections ?? []) {
    if (s.type === "hero") {
      log(`home hero image ${obj(s.publishedContent).heroImage as string} -> ${HERO.heroImage}`);
      if (APPLY) await prisma.websiteSection.update({ where: { id: s.id }, data: { content: { ...obj(s.content), ...HERO } as Prisma.InputJsonValue, publishedContent: { ...obj(s.publishedContent), ...HERO } as Prisma.InputJsonValue } });
    }
    if (s.type === "stats") {
      const fix = (c: unknown) => { const o = obj(c); const items = Array.isArray(o.items) ? (o.items as Obj[]).map((i) => (i.value === "20+" ? { ...i, value: "22+" } : i)) : o.items; return { ...o, items } as Prisma.InputJsonValue; };
      log("home stats 20+ -> 22+");
      if (APPLY) await prisma.websiteSection.update({ where: { id: s.id }, data: { content: fix(s.content), publishedContent: fix(s.publishedContent) } });
    }
  }

  // 4. Services: add Water Testing, then order all five
  const services = await prisma.websiteService.findMany({ where: { deletedAt: null } });
  backup.services = services;
  if (!services.some((s) => s.slug === "water-testing")) {
    log("services: create Water Testing (published)");
    if (APPLY) {
      const now = new Date();
      const { faqs: _faqs, ...columns } = WATER_TESTING; // a Json column takes Prisma.JsonNull, not null: leave it unset
      await prisma.websiteService.create({ data: { ...columns, position: 0, status: "PUBLISHED", publishedAt: now, publishedData: { ...WATER_TESTING, position: 0 } as Prisma.InputJsonValue } });
    }
  }
  for (const s of services) {
    const pos = ORDER.indexOf(s.slug);
    if (pos < 0) continue;
    log(`services: ${s.slug} position ${s.position} -> ${pos}`);
    if (APPLY) await prisma.websiteService.update({ where: { id: s.id }, data: { position: pos, publishedData: { ...obj(s.publishedData), position: pos } as Prisma.InputJsonValue } });
  }

  // 5. Quotation template phone line (drafts and new quotations; finalised ones keep their frozen copy)
  const templates = await prisma.quotationTemplate.findMany();
  for (const t of templates) {
    const json = JSON.stringify(t.content);
    if (!json.includes(OLD_PHONE)) continue;
    (backup.quotationTemplates ??= [] as unknown[]) && (backup.quotationTemplates as unknown[]).push(t);
    log(`quotation template "${t.name}": phone line updated`);
    if (APPLY) await prisma.quotationTemplate.update({ where: { id: t.id }, data: { content: JSON.parse(json.split(`9812003001 / ${OLD_PHONE}`).join(`9812003001 / ${NEW_PHONE2} / 7988814808`).split(OLD_PHONE).join(NEW_PHONE2)) } });
  }

  if (APPLY) {
    const file = path.join("backups", `website-content-before-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
    console.log("backup:", file);
  }
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
