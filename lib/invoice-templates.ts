/**
 * Invoice templates: the wording an invoice prints, managed the same way quotation templates are.
 *
 * A proforma is a template with `isProforma` set. It prints a different title and, being a request
 * rather than a tax document, it takes no number from the GST series.
 *
 * Reads are deliberately forgiving: any failure here falls back to the built-in wording, because a
 * templates problem must never be the reason an invoice cannot be printed.
 */
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/quotation-management";
import {
  BUILT_IN_TEMPLATE, BUILT_IN_TEMPLATE_ID, CLEAN_CONTENT, DEFAULT_LAYOUT, LIMITS, PROFORMA_CONTENT,
  contentOrNull, copyName, isKnownLayout, resolveTemplate,
  type InvoiceTemplateContent, type InvoiceTemplateRef,
} from "@/components/invoice/template/invoice-template-model";

/** A template as the admin screens use it: plain data, safe to hand to a client component. */
export type InvoiceTemplateRow = {
  id: string;
  name: string;
  layout: string;
  isDefault: boolean;
  isProforma: boolean;
  archived: boolean;
  updatedAt: string;
  invoiceCount: number;
  content: InvoiceTemplateContent;
};

type DbTemplate = {
  id: string; name: string; layout: string; content: unknown; isDefault: boolean; isProforma: boolean;
  archivedAt: Date | null; updatedAt: Date; _count?: { invoices: number };
};

const toRow = (t: DbTemplate): InvoiceTemplateRow => ({
  id: t.id,
  name: t.name,
  layout: isKnownLayout(t.layout) ? t.layout : DEFAULT_LAYOUT,
  isDefault: t.isDefault,
  isProforma: t.isProforma,
  archived: t.archivedAt !== null,
  updatedAt: t.updatedAt.toISOString(),
  invoiceCount: t._count?.invoices ?? 0,
  // A row that no longer validates (hand-edited JSON) must not break the screens.
  content: contentOrNull(t.content) ?? CLEAN_CONTENT,
});

export const toRef = (t: InvoiceTemplateRow): InvoiceTemplateRef =>
  ({ id: t.id, name: t.name, layout: t.layout, isProforma: t.isProforma, content: t.content });

const LOCK_KEY = 4242002;

/**
 * First visit creates the two templates the owner asked for — the tax invoice and a proforma — from
 * the wording compiled into the app, with the tax invoice as default, so nothing changes for anyone.
 * Idempotent and safe under concurrent requests.
 */
export async function ensureInvoiceTemplates(): Promise<void> {
  const count = await prisma.invoiceTemplate.count();
  if (count > 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    if ((await tx.invoiceTemplate.count()) === 0) {
      await tx.invoiceTemplate.createMany({
        data: [
          { name: BUILT_IN_TEMPLATE.name, layout: DEFAULT_LAYOUT, content: CLEAN_CONTENT as object, isDefault: true, isProforma: false },
          { name: "Proforma Invoice", layout: DEFAULT_LAYOUT, content: PROFORMA_CONTENT as object, isDefault: false, isProforma: true },
        ],
      });
    }
  });
}

export async function listInvoiceTemplates(): Promise<InvoiceTemplateRow[]> {
  await requireAdmin();
  await ensureInvoiceTemplates();
  const rows = await prisma.invoiceTemplate.findMany({
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { isDefault: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { invoices: true } } },
  });
  return rows.map(toRow);
}

export async function getInvoiceTemplate(id: string): Promise<InvoiceTemplateRow | null> {
  await requireAdmin();
  const t = await prisma.invoiceTemplate.findUnique({ where: { id }, include: { _count: { select: { invoices: true } } } });
  return t ? toRow(t) : null;
}

/** Templates an invoice can be switched to (archived ones hidden), default first. */
export async function listPickerTemplates(): Promise<InvoiceTemplateRef[]> {
  const all = await listInvoiceTemplates();
  return all.filter((t) => !t.archived).map(toRef);
}

/**
 * The wording a stored invoice prints with. An ISSUED invoice renders from the snapshot frozen when
 * it was issued, so changing a template never rewrites a document a client already holds.
 */
export async function resolveInvoiceTemplate(inv: {
  status: string; templateId: string | null; templateSnapshot: unknown;
}): Promise<InvoiceTemplateRef> {
  try {
    if (inv.status !== "DRAFT") {
      const frozen = contentOrNull(inv.templateSnapshot);
      if (frozen) return { ...BUILT_IN_TEMPLATE, content: frozen };
    }
    const [chosen, fallback] = await Promise.all([
      inv.templateId ? prisma.invoiceTemplate.findUnique({ where: { id: inv.templateId } }) : null,
      prisma.invoiceTemplate.findFirst({ where: { isDefault: true, archivedAt: null } }),
    ]);
    const pick = chosen ?? fallback;
    return pick ? resolveTemplate(null, toRef(toRow(pick as DbTemplate))) : BUILT_IN_TEMPLATE;
  } catch {
    return BUILT_IN_TEMPLATE;
  }
}

/** The same resolution, by invoice id: for pages that show an invoice but did not already fetch its templating fields. */
export async function resolveInvoiceTemplateById(id: string): Promise<InvoiceTemplateRef> {
  const head = await prisma.invoice.findUnique({ where: { id }, select: { status: true, templateId: true, templateSnapshot: true } });
  return head ? resolveInvoiceTemplate(head) : BUILT_IN_TEMPLATE;
}

/* ---------- editing ---------- */

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; errors: string[] };
const fail = (...errors: string[]): { ok: false; errors: string[] } => ({ ok: false, errors });

const cleanName = (raw: string) => raw.replace(/\s+/g, " ").trim();

export async function saveInvoiceTemplate(id: string, input: { name: string; content: unknown }): Promise<ActionResult<InvoiceTemplateRow>> {
  await requireAdmin();
  const name = cleanName(input.name ?? "");
  if (!name) return fail("Give the template a name.");
  if (name.length > LIMITS.name) return fail(`The name is too long (${name.length}/${LIMITS.name} characters).`);
  const content = contentOrNull(input.content);
  if (!content) return fail("That wording could not be saved. Check the title and that no field is over its limit.");
  const existing = await prisma.invoiceTemplate.findUnique({ where: { id } });
  if (!existing) return fail("That template no longer exists.");
  const row = await prisma.invoiceTemplate.update({
    where: { id },
    data: { name, content: content as object },
    include: { _count: { select: { invoices: true } } },
  });
  return { ok: true, data: toRow(row) };
}

export async function duplicateInvoiceTemplate(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const source = await prisma.invoiceTemplate.findUnique({ where: { id } });
  if (!source) return fail("That template no longer exists.");
  const names = (await prisma.invoiceTemplate.findMany({ select: { name: true } })).map((t) => t.name);
  const created = await prisma.invoiceTemplate.create({
    data: {
      name: copyName(source.name, names),
      layout: source.layout,
      content: source.content as object,
      isProforma: source.isProforma,
      isDefault: false,
    },
  });
  return { ok: true, data: { id: created.id } };
}

export async function setDefaultInvoiceTemplate(id: string): Promise<ActionResult> {
  await requireAdmin();
  const t = await prisma.invoiceTemplate.findUnique({ where: { id } });
  if (!t) return fail("That template no longer exists.");
  if (t.archivedAt) return fail("Restore this template before making it the default.");
  // A proforma is not a tax invoice, so it must never become what every new invoice starts from.
  if (t.isProforma) return fail("A proforma cannot be the default. Choose it on an individual invoice instead.");
  await prisma.$transaction([
    prisma.invoiceTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    prisma.invoiceTemplate.update({ where: { id }, data: { isDefault: true } }),
  ]);
  return { ok: true, data: undefined };
}

export async function archiveInvoiceTemplate(id: string): Promise<ActionResult> {
  await requireAdmin();
  const t = await prisma.invoiceTemplate.findUnique({ where: { id } });
  if (!t) return fail("That template no longer exists.");
  if (t.isDefault) return fail("Make another template the default before archiving this one.");
  await prisma.invoiceTemplate.update({ where: { id }, data: { archivedAt: new Date() } });
  return { ok: true, data: undefined };
}

export async function restoreInvoiceTemplate(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.invoiceTemplate.update({ where: { id }, data: { archivedAt: null } });
  return { ok: true, data: undefined };
}

/** The built-in id is not a row, so it is never stored on an invoice. */
export const storableTemplateId = (id: string | undefined | null) =>
  (id && id !== BUILT_IN_TEMPLATE_ID ? id : null);
