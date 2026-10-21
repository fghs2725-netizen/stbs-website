import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AREAS, areaBySlug, type AreaClient } from "@/lib/website/areas";
import { invoiceKey, workLabel, yearSpan } from "@/lib/website/area-work";

/**
 * Who appears on each town page (/areas/<area>). The owner switches a client on in Admin -> Website
 * town pages (a WebsiteAreaClient row); the work done and the years then come from that client's
 * issued invoices, so a new invoice updates the page with no further step. Amounts, invoice numbers
 * and clients who are not switched on never reach the website.
 */

const COUNTED = { notIn: ["DRAFT" as const, "CANCELLED" as const] };

/**
 * The clients for a town page, newest work first. Falls back to the list built into areas.ts when the
 * table cannot be read (for example before its migration is applied), so the page never goes empty.
 */
export async function getAreaClients(slug: string): Promise<AreaClient[]> {
  const fallback = areaBySlug(slug)?.clients ?? [];
  try {
    const rows = await prisma.websiteAreaClient.findMany({ where: { area: slug }, orderBy: { name: "asc" } });
    const keys = new Set(rows.flatMap((r) => r.invoiceNames));
    const invoices = await prisma.invoice.findMany({
      where: { status: COUNTED },
      select: { clientCompanyName: true, date: true, items: { select: { description: true } } },
    });
    const byName = new Map<string, typeof invoices>();
    for (const inv of invoices) {
      const k = invoiceKey(inv.clientCompanyName);
      if (keys.has(k)) byName.set(k, [...(byName.get(k) ?? []), inv]);
    }
    const out = rows.map((r) => {
      const own = r.invoiceNames.flatMap((n) => byName.get(n) ?? []);
      const work = workLabel(own.flatMap((i) => i.items.map((it) => it.description)));
      return [r.name, work, r.locality, yearSpan(own.map((i) => i.date))] as AreaClient;
    });
    // Most recent work first.
    return out.sort((a, b) => b[3].slice(-4).localeCompare(a[3].slice(-4)) || a[0].localeCompare(b[0]));
  } catch {
    return fallback;
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
}

export type InvoiceClientRow = {
  /** Upper-cased invoice name: the key the switch is stored under. */
  key: string;
  invoiceName: string;
  city: string;
  invoices: number;
  lastDate: string;
  /** The row that shows this client, if it is switched on. */
  shown: { id: string; name: string; area: string; locality: string } | null;
};

/** Everyone invoiced (drafts and cancelled invoices aside), newest first, with their town-page setting. */
export async function listInvoiceClients(): Promise<InvoiceClientRow[]> {
  await requireAdmin();
  const [invoices, rows] = await Promise.all([
    prisma.invoice.findMany({ where: { status: COUNTED }, select: { clientCompanyName: true, clientCity: true, clientAddressLine1: true, date: true } }),
    prisma.websiteAreaClient.findMany(),
  ]);
  const shownBy = new Map(rows.flatMap((r) => r.invoiceNames.map((n) => [n, { id: r.id, name: r.name, area: r.area, locality: r.locality }] as const)));
  const byKey = new Map<string, InvoiceClientRow>();
  for (const inv of invoices) {
    const key = invoiceKey(inv.clientCompanyName);
    const row = byKey.get(key) ?? { key, invoiceName: inv.clientCompanyName.trim(), city: "", invoices: 0, lastDate: "", shown: shownBy.get(key) ?? null };
    row.invoices += 1;
    if (inv.date > row.lastDate) {
      row.lastDate = inv.date;
      row.city = (inv.clientCity || inv.clientAddressLine1 || "").trim();
    }
    byKey.set(key, row);
  }
  return [...byKey.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

export class AreaClientInputError extends Error {}

/**
 * Switches one invoice client on (area set) or off (area empty). A client invoiced under several
 * spellings shares one row, so switching one spelling off only drops that spelling from the row.
 */
export async function setInvoiceClientArea(input: { key: string; area: string; name: string; locality: string }) {
  await requireAdmin();
  const key = invoiceKey(input.key);
  if (!key) throw new AreaClientInputError("Pick a client.");
  const area = input.area.trim();
  if (area && !AREAS.some((a) => a.slug === area)) throw new AreaClientInputError("Pick a town from the list.");
  const name = input.name.replace(/\s+/g, " ").trim().slice(0, 120);
  const locality = input.locality.replace(/\s+/g, " ").trim().slice(0, 80);
  if (area && !name) throw new AreaClientInputError("Give the name to show on the website.");

  const existing = await prisma.websiteAreaClient.findFirst({ where: { invoiceNames: { has: key } } });
  if (!area) {
    if (!existing) return;
    const rest = existing.invoiceNames.filter((n) => n !== key);
    if (rest.length) await prisma.websiteAreaClient.update({ where: { id: existing.id }, data: { invoiceNames: rest } });
    else await prisma.websiteAreaClient.delete({ where: { id: existing.id } });
    return;
  }
  if (existing) await prisma.websiteAreaClient.update({ where: { id: existing.id }, data: { name, area, locality } });
  else await prisma.websiteAreaClient.create({ data: { name, area, locality, invoiceNames: [key] } });
}
