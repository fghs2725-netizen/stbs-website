import { prisma } from "@/lib/prisma";
import { providersFromEnv } from "@/lib/assistant/providers";
import { listClients, saveQuotation } from "@/lib/quotation-management";
import { getInvoiceConfig, listCustomUnits, saveInvoice } from "@/lib/invoice-management";
import { listPresets } from "@/lib/quotation-preset-store";
import { getDefaultRef } from "@/lib/quotation-templates";
import { mergeUnits } from "@/lib/units";
import { todayIST } from "@/lib/worker-ledger";
import { decodeItemText } from "@/components/quotation/item-text";
import { buildDraft as buildQuotation, serviceOptions } from "@/components/quotation/quotation-model";
import { buildDraft as buildInvoice } from "@/components/invoice/invoice-model";
import type { Preset } from "@/lib/quotation-presets";
import { askJson } from "./llm";
import { DraftError, normaliseInvoice, normaliseQuotation, pdfText, poPrompt, quotationPrompt, type RateLine } from "./drafts";

export { DraftError };

export type DraftResult = { url: string; items: number; notes: string[]; provider: string };

const NO_AI = "The AI is not answering right now (no key set, or today's free allowance is used up). Please try again later.";

/** What the owner has charged before: preset rates by size, then the latest distinct quoted and billed lines. */
async function pastRates(presets: Preset[]): Promise<RateLine[]> {
  const out: RateLine[] = [];
  for (const p of presets) {
    for (const i of p.items) {
      const bySize = Object.entries(i.lastRates ?? {}).filter(([, v]) => typeof v === "number" && v > 0);
      if (bySize.length) for (const [size, rate] of bySize) out.push({ item: `${i.description} [${size}]`, unit: i.unit, rate });
      else if ((i.lastRate ?? 0) > 0) out.push({ item: i.description, unit: i.unit, rate: i.lastRate! });
    }
  }
  const select = { description: true, unit: true, rate: true } as const;
  const [quoted, billed] = await Promise.all([
    prisma.quotationItem.findMany({ where: { rate: { gt: 0 }, quotation: { deletedAt: null } }, orderBy: { updatedAt: "desc" }, take: 250, select }),
    prisma.invoiceItem.findMany({ where: { rate: { gt: 0 }, invoice: { deletedAt: null } }, orderBy: { updatedAt: "desc" }, take: 250, select }),
  ]);
  const seen = new Set(out.map((r) => r.item.toLowerCase()));
  for (const row of [...quoted, ...billed]) {
    const { description, details } = decodeItemText(row.description);
    const item = `${description}${details ? ` (${details.replace(/\n/g, ", ")})` : ""}`.slice(0, 120);
    if (seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    out.push({ item, unit: row.unit, rate: Number(row.rate) });
  }
  return out.slice(0, 140);
}

export async function makeQuotationDraft(text: string): Promise<DraftResult> {
  const requirement = text.trim().slice(0, 6000);
  if (requirement.length < 5) throw new DraftError("Paste the customer's requirement first.", 400);
  const [clients, presets, template, custom] = await Promise.all([listClients(), listPresets(), getDefaultRef(), listCustomUnits()]);
  const units = mergeUnits(custom);
  const rates = await pastRates(presets);

  const reply = await askJson(providersFromEnv(), [
    { role: "system", content: quotationPrompt({ serviceOptions, units, rates }) },
    { role: "user", content: requirement },
  ]);
  if (!reply) throw new DraftError(NO_AI, 503);

  const d = normaliseQuotation(reply.json, { serviceOptions, units, clients });
  if (!d.items.length) throw new DraftError("No items could be read from that text. Write one requirement per line and try again.");

  const today = new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
  const saved = await saveQuotation(
    buildQuotation({
      quotationDate: today, templateId: template.id, template, validity: template.content.validity,
      client: d.client, clientId: d.clientId, serviceType: d.serviceType, customServiceType: d.customServiceType,
      subject: d.subject, items: d.items,
    }),
  );
  return { url: `/admin/quotations/${saved.id}/edit`, items: d.items.length, notes: d.notes, provider: reply.provider };
}

export async function makeInvoiceDraft(pdf: Uint8Array): Promise<DraftResult> {
  const text = (await pdfText(pdf)).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (text.replace(/\s/g, "").length < 40) {
    throw new DraftError("This PDF has no readable text (it looks like a scan or photo). Ask the client for the original PDF, or start a new invoice and type the items.");
  }
  const [{ settings }, clients, custom] = await Promise.all([getInvoiceConfig(), listClients(), listCustomUnits()]);
  const units = mergeUnits(custom);

  const reply = await askJson(
    providersFromEnv(),
    [
      { role: "system", content: poPrompt({ units }) },
      { role: "user", content: `Purchase order text:\n\n${text.slice(0, 14_000)}` },
    ],
    { maxTokens: 3500, timeoutMs: 50_000 },
  );
  if (!reply) throw new DraftError(NO_AI, 503);

  const d = normaliseInvoice(reply.json, { units, clients, defaultGstRate: settings.gstRate, gstOnByDefault: settings.gstEnabled });
  if (!d.items.length) throw new DraftError("No item lines could be read from this PO.");
  if (text.length > 14_000) d.notes.push("The PO is long; check that every line came through.");

  const saved = await saveInvoice(
    buildInvoice(settings, todayIST(), {
      client: d.client, shipTo: d.shipTo, purchaseOrder: d.purchaseOrder, items: d.items,
      gstEnabled: d.gstEnabled, gstRate: d.gstRate, gstMode: d.gstMode,
      ...(d.perLineGst ? { settingsOverride: { columns: { lineGst: true } } } : {}),
    }),
  );
  return { url: `/admin/invoices/${saved.id}/edit`, items: d.items.length, notes: d.notes, provider: reply.provider };
}
