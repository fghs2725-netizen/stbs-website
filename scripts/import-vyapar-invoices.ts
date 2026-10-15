/**
 * Import past sale invoices from a Vyapar backup into the invoice section, so earlier bills can be
 * looked up in one place.
 *
 * Behavior (the owner's choices, 2026-10-15):
 *  - Every sale invoice in the backup is imported as PAID: Vyapar's own payment status was not kept
 *    up to date, so importing it would show years of settled bills as overdue. A single payment for the
 *    full amount, dated the invoice date, records that.
 *  - Vyapar's invoice numbers are kept (1 to 764). New invoices already continue from 765, so the
 *    series do not clash. A number already taken in the database, or repeated within the backup, is
 *    left blank and reported rather than overwriting anything.
 *  - Ids are "vyapar-<txn id>", so a re-run skips what is already imported and never duplicates.
 *  - Each invoice's total is recomputed with the app's own arithmetic and compared with Vyapar's.
 *    The few switches needed to reproduce Vyapar's figures (per-line GST, per-line discount, no
 *    rounding to the rupee) are set on that invoice alone, never globally.
 *  - Created and updated times are set to the invoice date, so imported bills sit behind new ones
 *    in the list instead of all appearing as just edited.
 *  - The backup is read locally and written straight to the database: no customer data is copied
 *    into the repository.
 *
 * Usage:
 *   npx tsx scripts/import-vyapar-invoices.ts <backup.vyb | backup.vyp>            (dry run, writes nothing)
 *   npx tsx scripts/import-vyapar-invoices.ts <backup.vyb | backup.vyp> --apply
 *   Add --list to print each invoice's number, date, client, state, GSTIN and total.
 *
 * Env:
 *   DATABASE_URL  required for --apply (read from .env)
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient, Prisma } from "@prisma/client";
import { calcInvoiceTotals, type InvoiceItem } from "../components/invoice/invoice-model";
import { effectiveInvoiceSettings, resolveSettings, type InvoiceSettingsOverride } from "../components/invoice/invoice-settings";
import { encodeItemText } from "../components/quotation/item-text";
import { stateFromGstin } from "../lib/india-gst";

const APPLY = process.argv.includes("--apply");
const LIST = process.argv.includes("--list");
const SOURCE = process.argv.slice(2).find((a) => !a.startsWith("--"));

/* ────────────────────────── reading the backup ────────────────────────── */

/** A .vyb is a zip holding one SQLite file (.vyp). Returns the path of a readable SQLite file. */
function openBackup(path: string): { file: string; cleanup: () => void } {
  const buf = readFileSync(path);
  if (buf.subarray(0, 15).toString("latin1") === "SQLite format 3") return { file: path, cleanup: () => {} };
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error(`${path} is neither a Vyapar backup (.vyb) nor a SQLite file (.vyp)`);
  let at = 0;
  while (at + 30 <= buf.length && buf.readUInt32LE(at) === 0x04034b50) {
    const flags = buf.readUInt16LE(at + 6), method = buf.readUInt16LE(at + 8);
    const size = buf.readUInt32LE(at + 18), nameLen = buf.readUInt16LE(at + 26), extraLen = buf.readUInt16LE(at + 28);
    const name = buf.subarray(at + 30, at + 30 + nameLen).toString("utf8");
    const start = at + 30 + nameLen + extraLen;
    if (flags & 0x08) throw new Error("This backup's zip layout is not supported; unzip it and pass the .vyp file instead");
    if (name.toLowerCase().endsWith(".vyp")) {
      const raw = buf.subarray(start, start + size);
      const data = method === 0 ? raw : method === 8 ? inflateRawSync(raw) : null;
      if (!data) throw new Error(`Unsupported compression in ${name}; unzip it and pass the .vyp file instead`);
      const dir = mkdtempSync(join(tmpdir(), "vyapar-"));
      const file = join(dir, basename(name));
      writeFileSync(file, data);
      return { file, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
    }
    at = start + size;
  }
  throw new Error(`No .vyp database found inside ${path}`);
}

/* ────────────────────────── mapping ────────────────────────── */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clean = (s: unknown) => String(s ?? "").replace(/[\ufeff]/g, "").replace(/\ufffd/g, "-").replace(/\s+/g, " ").trim();

// Vyapar's units, spelled the way lib/units.ts spells them.
const UNIT: Record<string, string> = { kg: "Kg", ltr: "Litre", mtr: "Mtr", nos: "No.", sqf: "Sq.ft", days: "Day", ft: "Rft", hr: "Hour" };
const unitFor = (u: string | null) => UNIT[(u ?? "").toLowerCase()] ?? "No.";

const GSTIN_RE = /\b\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9A-Z]\b/i;
// Vyapar's display name is the client's name followed by a hand-typed address. The name ends at the
// first of: a legal suffix (kept), an address word, a comma, a house or plot number, or a town name.
const LEGAL_SUFFIX = /\b(?:private limited|pvt\.? ?ltd\.?|limited|ltd\.?|llp)(?=\W|$)/i;
const NAME_END = /\s*(?:\b(?:postal address|address|adress|add|plot|building|bldg|khewat|khasra|killa|kh\.? ?no|vill(?:age)?|sector|gst(?:in)?(?:\/uin)?|gst no)\b|[,\n]|(?<=\D)\d{2,}|-\s*\d{6}\b)/i;
const PLACE = /\s+\b(?:sonipat|sonepat|haryana|kundli|bahalgarh|narela|delhi|gurgaon|gurugram|jhajjar|bahadurgarh|tulip city)\b/i;
const GST_LABEL = /\bGST(?:IN)?(?:\/UIN)?(?:\.|\s*(?:NO|Number))?\s*[:\-.]*\s*[0-9A-Z]{15}\b/gi;

function nameEnd(text: string): number {
  const legal = text.match(LEGAL_SUFFIX);
  if (legal?.index !== undefined && legal.index > 0) return legal.index + legal[0].length;
  const cuts = [text.search(NAME_END), text.search(PLACE)].filter((i) => i > 0);
  return cuts.length ? Math.min(...cuts) : -1;
}

function parseParty(display: string, shortName: string) {
  const text = (clean(display) || clean(shortName)).replace(/^bill details\s*/i, "");
  const gstin = (text.match(GSTIN_RE)?.[0] ?? "").toUpperCase();
  const cut = nameEnd(text);
  let company = (cut > 0 ? text.slice(0, cut) : text).replace(/[\s,:\-.(]+$/, "").trim();
  if (company.length < 3) company = clean(shortName) || "Unknown";
  const address = (cut > 0 ? text.slice(cut) : "")
    .replace(GST_LABEL, "").replace(GSTIN_RE, "").replace(/\bCIN NO\.?\s*\S+/i, "")
    .replace(/^[\s,:\-.]*(?:postal address|address|adress|add)\b[\s:\-.]*/i, "")
    .replace(/\s*,\s*,/g, ",").replace(/^[\s,:\-.]+|[\s,:\-.]+$/g, "").slice(0, 300);
  const pin = address.match(/\b\d{6}\b/)?.[0] ?? "";
  const state = gstin ? stateFromGstin(gstin)?.name ?? "" : "";
  return { company: company.slice(0, 200), address, pin, state, gstin };
}

type Txn = {
  txn_id: number; txn_ref_number_char: string | null; txn_date: string; txn_display_name: string | null; full_name: string;
  txn_cash_amount: number; txn_balance_amount: number; txn_discount_amount: number;
};
type Line = {
  lineitem_id: number; item_name: string; lineitem_description: string | null; quantity: number; priceperunit: number;
  total_amount: number; lineitem_tax_amount: number; lineitem_discount_amount: number; unit: string | null;
  tax_rate: number | null; tax_name: string | null;
};

const BASE_SETTINGS = resolveSettings({});

function mapInvoice(t: Txn, lines: Line[]) {
  const total = round2(t.txn_cash_amount + t.txn_balance_amount);
  const rates = lines.map((l) => l.tax_rate ?? 0);
  const taxed = rates.some((r) => r > 0);
  const igst = lines.some((l) => (l.tax_name ?? "").toUpperCase().startsWith("IGST"));
  const mixed = new Set(rates).size > 1;
  const common = [...rates].sort((a, b) => rates.filter((x) => x === b).length - rates.filter((x) => x === a).length)[0] ?? 18;

  const items: InvoiceItem[] = lines.map((l, n) => {
    // Vyapar stores the price before tax even on a tax-inclusive bill, so it is used as the rate as is.
    const r = l.tax_rate ?? 0;
    // Vyapar item names sometimes run onto a second line (brand, weight); that part becomes the details.
    const [first, ...more] = String(l.item_name ?? "").replace(/\ufeff/g, "").split(/\r?\n/);
    const extra = [...more, l.lineitem_description ?? ""].map((x) => x.trim()).filter(Boolean);
    const unit = unitFor(l.unit);
    const base = { id: `vyapar-${l.lineitem_id}`, description: clean(first).slice(0, 500) || `Item ${n + 1}`, gstRate: r };
    if (l.lineitem_discount_amount > 0) {
      // A two-decimal discount percentage cannot reproduce Vyapar's rupee discount exactly, so a
      // discounted line becomes one lump sum at its net amount, with the working kept in the details.
      const net = round2(l.total_amount - l.lineitem_tax_amount);
      const working = `${l.quantity} ${unit} at Rs ${round2(l.priceperunit)}, less discount Rs ${round2(l.lineitem_discount_amount)}`;
      return { ...base, details: [...extra, working].join("\n"), unit: "LS", quantity: 1, rate: net };
    }
    return { ...base, details: extra.join("\n") || undefined, unit, quantity: l.quantity, rate: round2(l.priceperunit) };
  });

  // Vyapar takes the bill discount off the total after tax; the app takes it off before tax, so it is
  // converted at the bill's effective tax rate.
  const lineTax = lines.reduce((s, l) => s + l.lineitem_tax_amount, 0);
  const lineBase = lines.reduce((s, l) => s + l.total_amount - l.lineitem_tax_amount, 0);
  const effRate = lineBase > 0 ? lineTax / lineBase : 0;
  const discountValue = t.txn_discount_amount > 0 ? round2(t.txn_discount_amount / (1 + effRate)) : 0;

  const override: InvoiceSettingsOverride = {};
  if (mixed) override.columns = { ...override.columns, lineGst: true };
  if (Math.abs(total - Math.round(total)) > 0.001) override.blocks = { roundOff: false };

  const inv = {
    items,
    discountType: discountValue > 0 ? ("FLAT" as const) : null,
    discountValue,
    gstEnabled: taxed,
    gstMode: igst ? ("IGST" as const) : ("CGST_SGST" as const),
    gstRate: taxed ? (common || 18) : 18,
    payments: [],
  };
  const totals = calcInvoiceTotals(inv, effectiveInvoiceSettings(BASE_SETTINGS, override));
  return { inv, override, total, computed: totals.grandTotal };
}

/* ────────────────────────── run ────────────────────────── */

async function main() {
  if (!SOURCE) {
    console.error("Usage: npx tsx scripts/import-vyapar-invoices.ts <backup.vyb | backup.vyp> [--apply]");
    process.exit(1);
  }
  const { file, cleanup } = openBackup(SOURCE);
  const db = new DatabaseSync(file, { readOnly: true });
  const txns = db.prepare(`
    SELECT t.txn_id, t.txn_ref_number_char, substr(t.txn_date, 1, 10) AS txn_date, t.txn_display_name, n.full_name,
           t.txn_cash_amount, t.txn_balance_amount, t.txn_discount_amount
      FROM kb_transactions t JOIN kb_names n ON n.name_id = t.txn_name_id
     WHERE t.txn_type = 1
     ORDER BY t.txn_date, t.txn_id`).all() as unknown as Txn[];
  const lineStmt = db.prepare(`
    SELECT l.lineitem_id, i.item_name, l.lineitem_description, l.quantity, l.priceperunit, l.total_amount,
           l.lineitem_tax_amount, l.lineitem_discount_amount, u.unit_short_name AS unit, tc.tax_rate, tc.tax_code_name AS tax_name
      FROM kb_lineitems l
      JOIN kb_items i ON i.item_id = l.item_id
      LEFT JOIN kb_item_units u ON u.unit_id = l.lineitem_unit_id
      LEFT JOIN kb_tax_code tc ON tc.tax_code_id = l.lineitem_tax_id
     WHERE l.lineitem_txn_id = ?
     ORDER BY l.lineitem_id`);

  const prisma = APPLY ? new PrismaClient() : null;
  const taken = new Map<number, string>();
  if (prisma) {
    for (const r of await prisma.invoice.findMany({ where: { number: { not: null } }, select: { id: true, number: true } })) taken.set(r.number!, r.id);
  }

  let imported = 0, skipped = 0, mismatched = 0;
  const notes: string[] = [];
  const seen = new Set<number>();
  for (const t of txns) {
    const id = `vyapar-${t.txn_id}`;
    const lines = lineStmt.all(t.txn_id) as unknown as Line[];
    const { inv, override, total, computed } = mapInvoice(t, lines);
    const party = parseParty(t.txn_display_name ?? "", t.full_name);

    const ref = clean(t.txn_ref_number_char);
    let number: number | null = /^\d+$/.test(ref) ? Number(ref) : null;
    if (number !== null && (seen.has(number) || (taken.has(number) && taken.get(number) !== id))) {
      notes.push(`#${ref} (${t.txn_date}, ${party.company}): number already used, imported without a number`);
      number = null;
    }
    if (number !== null) seen.add(number);
    if (!ref) notes.push(`(${t.txn_date}, ${party.company}): no number in Vyapar, imported without one`);
    if (Math.abs(computed - total) > 0.01) {
      mismatched++;
      notes.push(`#${ref} ${party.company}: Vyapar total ${total}, recomputed ${computed}`);
    }

    if (LIST) console.log(`${ref || "-"}	${t.txn_date}	${party.company}	${party.state}	${party.gstin}	${total}`);
    if (!prisma) { imported++; continue; }
    if (await prisma.invoice.findUnique({ where: { id }, select: { id: true } })) { skipped++; continue; }
    const at = new Date(`${t.txn_date}T12:00:00+05:30`);
    await prisma.invoice.create({
      data: {
        id,
        number,
        date: t.txn_date,
        status: "PAID",
        clientCompanyName: party.company,
        clientAddressLine1: party.address || null,
        clientState: party.state || null,
        clientPinCode: party.pin || null,
        clientGstin: party.gstin || null,
        discountType: inv.discountType,
        discountValue: new Prisma.Decimal(inv.discountValue),
        gstEnabled: inv.gstEnabled,
        gstMode: inv.gstMode,
        gstRate: new Prisma.Decimal(inv.gstRate),
        settingsOverride: Object.keys(override).length ? (override as object) : undefined,
        issuedAt: at,
        createdAt: at,
        updatedAt: at,
        items: {
          create: inv.items.map((it, n) => ({
            id: it.id,
            position: n,
            description: it.details ? `${it.description}\n${it.details}` : it.description,
            unit: it.unit,
            quantity: new Prisma.Decimal(it.quantity),
            rate: new Prisma.Decimal(it.rate),
            gstRate: new Prisma.Decimal(it.gstRate ?? 0),
          })),
        },
        payments: { create: [{ id: `vyapar-pay-${t.txn_id}`, date: t.txn_date, amount: new Prisma.Decimal(computed), note: "Marked paid when imported from Vyapar" }] },
        edits: { create: [{ field: "import", newValue: `Imported from Vyapar backup ${basename(SOURCE)}`, editedBy: "import script" }] },
      },
    });
    imported++;
  }

  db.close();
  cleanup();
  await prisma?.$disconnect();
  for (const n of notes) console.log(`  - ${n}`);
  console.log(`${APPLY ? "Imported" : "Would import"} ${imported} invoices${skipped ? `, skipped ${skipped} already imported` : ""}. ` +
    `${mismatched ? `${mismatched} totals differ from Vyapar (listed above).` : "Every total matches Vyapar."}`);
  if (!APPLY) console.log("Dry run: nothing was written. Add --apply to import.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
