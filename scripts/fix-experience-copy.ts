/**
 * One-off content fix: make every experience claim say "34 years" (1992 -> 2026).
 *
 *   npx tsx --env-file=.env scripts/fix-experience-copy.ts            # DRY RUN (default)
 *   npx tsx --env-file=.env scripts/fix-experience-copy.ts --apply    # writes, after backing up
 *
 * Touches only exact known phrases inside WebsiteSection.content/publishedContent and
 * WebsiteSettings (founderBio + publishedData). Before --apply it writes the original
 * values of every row it will change to backups/experience-copy-<timestamp>.json.
 * NOTE: .env may point at the production database — always read the dry-run first.
 */
import fs from "node:fs";
import { prisma } from "../lib/prisma";

// Ordered: specific phrases first, exact-string headings last.
const PHRASES: Array<[string, string]> = [
  ["More than three decades in the field", "34 years in the field"],
  ["Decades of hands-on expertise in water infrastructure.", "34 years of hands-on expertise in water infrastructure."],
  ["Three decades of hands-on field experience", "34 years of hands-on field experience"],
  ["With over 30 years of hands-on experience", "With 34 years of hands-on experience"],
];
const EXACT: Array<[string, string]> = [["Three decades", "34 years"]];

function fixString(s: string): string {
  for (const [from, to] of EXACT) if (s === from) return to;
  let out = s;
  for (const [from, to] of PHRASES) out = out.split(from).join(to);
  return out;
}

function fixJson<T>(v: T): T {
  if (typeof v === "string") return fixString(v) as unknown as T;
  if (Array.isArray(v)) return v.map(fixJson) as unknown as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, fixJson(x)])) as T;
  }
  return v;
}

const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

async function main() {
  const apply = process.argv.includes("--apply");
  const plan: Array<{ label: string; run: () => Promise<unknown>; before: unknown }> = [];

  const sections = await prisma.websiteSection.findMany({ include: { page: { select: { slug: true } } } });
  for (const s of sections) {
    const data: Record<string, unknown> = {};
    const before: Record<string, unknown> = {};
    for (const col of ["content", "publishedContent"] as const) {
      const fixed = fixJson(s[col]);
      if (changed(s[col], fixed)) { before[col] = s[col]; data[col] = fixed; console.log(`  ~ section ${s.page.slug}/${s.type} ${col}`); }
    }
    if (Object.keys(data).length) plan.push({ label: `section ${s.id}`, before: { id: s.id, ...before }, run: () => prisma.websiteSection.update({ where: { id: s.id }, data: data as never }) });
  }

  const st = await prisma.websiteSettings.findFirst();
  if (st) {
    const data: Record<string, unknown> = {};
    const before: Record<string, unknown> = {};
    if (typeof st.founderBio === "string") {
      const f = fixString(st.founderBio);
      if (f !== st.founderBio) { before.founderBio = st.founderBio; data.founderBio = f; console.log("  ~ settings.founderBio"); }
    }
    const f = fixJson(st.publishedData);
    if (changed(st.publishedData, f)) { before.publishedData = st.publishedData; data.publishedData = f; console.log("  ~ settings.publishedData"); }
    if (Object.keys(data).length) plan.push({ label: "settings", before: { id: st.id, ...before }, run: () => prisma.websiteSettings.update({ where: { id: st.id }, data: data as never }) });
  }

  console.log(`\n${plan.length} row(s) would change.`);
  if (!apply) { console.log("DRY RUN — nothing written. Re-run with --apply to write."); await prisma.$disconnect(); return; }
  if (!plan.length) { await prisma.$disconnect(); return; }

  fs.mkdirSync("backups", { recursive: true });
  const file = `backups/experience-copy-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(file, JSON.stringify(plan.map(p => ({ label: p.label, before: p.before })), null, 2));
  console.log("Backup written:", file);
  for (const p of plan) { await p.run(); console.log("  updated", p.label); }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
