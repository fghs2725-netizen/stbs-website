import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  BUILT_IN_TEMPLATE,
  BUILT_IN_TEMPLATE_ID,
  CLASSIC_CONTENT,
  DEFAULT_LAYOUT,
  LIMITS,
  contentOrNull,
  copyName,
  isKnownLayout,
  resolveTemplate,
  validateContent,
  type QuotationTemplateRef,
  type TemplateContent,
} from "@/components/quotation/template/template-model";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
}

/** A template as the admin screens use it: plain data, safe to hand to a client component. */
export type TemplateRow = {
  id: string;
  name: string;
  layout: string;
  isDefault: boolean;
  archived: boolean;
  updatedAt: string;
  quotationCount: number;
  content: TemplateContent;
};

type DbTemplate = { id: string; name: string; layout: string; content: unknown; isDefault: boolean; archivedAt: Date | null; updatedAt: Date; _count?: { quotations: number } };

const toRow = (t: DbTemplate): TemplateRow => ({
  id: t.id,
  name: t.name,
  layout: isKnownLayout(t.layout) ? t.layout : DEFAULT_LAYOUT,
  isDefault: t.isDefault,
  archived: t.archivedAt !== null,
  updatedAt: t.updatedAt.toISOString(),
  quotationCount: t._count?.quotations ?? 0,
  // A stored row that no longer validates (hand-edited JSON) must not break the screens: show the built-in wording.
  content: contentOrNull(t.content) ?? CLASSIC_CONTENT,
});

export const toRef = (t: TemplateRow): QuotationTemplateRef => ({ id: t.id, name: t.name, layout: t.layout, content: t.content });

const LOCK_KEY = 4242001;

/**
 * First visit to the templates feature creates "STBS Classic" from the wording that was compiled into the
 * app, marked default, so nothing changes for anyone. Idempotent and safe under concurrent requests.
 */
export async function ensureTemplates(): Promise<void> {
  const count = await prisma.quotationTemplate.count();
  if (count > 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    if ((await tx.quotationTemplate.count()) === 0) {
      await tx.quotationTemplate.create({ data: { name: BUILT_IN_TEMPLATE.name, layout: DEFAULT_LAYOUT, content: CLASSIC_CONTENT as object, isDefault: true } });
    }
  });
}

export async function listTemplates(): Promise<TemplateRow[]> {
  await requireAdmin();
  await ensureTemplates();
  const rows = await prisma.quotationTemplate.findMany({
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { isDefault: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { quotations: true } } },
  });
  return rows.map(toRow);
}

export async function getTemplate(id: string): Promise<TemplateRow | null> {
  await requireAdmin();
  const t = await prisma.quotationTemplate.findUnique({ where: { id }, include: { _count: { select: { quotations: true } } } });
  return t ? toRow(t) : null;
}

/** Templates a quotation can be switched to (archived ones are hidden), default first. */
export async function listPickerTemplates(): Promise<QuotationTemplateRef[]> {
  const all = await listTemplates();
  return all.filter((t) => !t.archived).map(toRef);
}

export async function getDefaultRef(): Promise<QuotationTemplateRef> {
  await requireAdmin();
  await ensureTemplates();
  const t = (await prisma.quotationTemplate.findFirst({ where: { isDefault: true, archivedAt: null } }))
    ?? (await prisma.quotationTemplate.findFirst({ where: { archivedAt: null }, orderBy: { createdAt: "asc" } }));
  return t ? toRef(toRow(t)) : BUILT_IN_TEMPLATE;
}

/**
 * The wording a stored quotation renders with. Deliberately forgiving: any failure (table missing,
 * unreachable) falls back to the built-in wording, so a PDF is never lost to a templates problem.
 */
export async function resolveQuotationTemplate(q: { status: string; templateId: string | null; templateSnapshot: unknown }): Promise<QuotationTemplateRef> {
  const status = q.status === "FINAL" ? "FINAL" : "DRAFT";
  try {
    if (status === "FINAL") return resolveTemplate({ status, snapshot: q.templateSnapshot as never });
    const [chosen, fallback] = await Promise.all([
      q.templateId ? prisma.quotationTemplate.findUnique({ where: { id: q.templateId } }) : null,
      prisma.quotationTemplate.findFirst({ where: { isDefault: true, archivedAt: null } }),
    ]);
    return resolveTemplate({ status, chosen, fallback });
  } catch {
    return BUILT_IN_TEMPLATE;
  }
}

/* ---------- Editing (admin only) ---------- */

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; errors: string[] };
const fail = (...errors: string[]): { ok: false; errors: string[] } => ({ ok: false, errors });

const cleanName = (raw: string) => raw.replace(/\s+/g, " ").trim();
function nameProblem(name: string): string | null {
  if (!name) return "Give the template a name.";
  if (name.length > LIMITS.name) return `The name is too long (${name.length}/${LIMITS.name} characters).`;
  return null;
}

export async function duplicateTemplate(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const source = await prisma.quotationTemplate.findUnique({ where: { id } });
  if (!source) return fail("That template no longer exists.");
  const names = (await prisma.quotationTemplate.findMany({ select: { name: true } })).map((t) => t.name);
  const created = await prisma.quotationTemplate.create({
    data: { name: copyName(source.name, names), layout: source.layout, content: source.content as object, isDefault: false },
  });
  return { ok: true, data: { id: created.id } };
}

export async function saveTemplate(id: string, input: { name: string; content: unknown }): Promise<ActionResult<TemplateRow>> {
  await requireAdmin();
  const name = cleanName(input.name ?? "");
  const problem = nameProblem(name);
  const valid = validateContent(input.content);
  const errors = [...(problem ? [problem] : []), ...(valid.ok ? [] : valid.errors)];
  if (errors.length || !valid.ok) return fail(...errors);
  const existing = await prisma.quotationTemplate.findUnique({ where: { id } });
  if (!existing) return fail("That template no longer exists.");
  const clash = await prisma.quotationTemplate.findFirst({ where: { id: { not: id }, name: { equals: name, mode: "insensitive" }, archivedAt: null } });
  if (clash) return fail(`There is already a template called “${clash.name}”.`);
  const updated = await prisma.quotationTemplate.update({ where: { id }, data: { name, content: valid.content as object }, include: { _count: { select: { quotations: true } } } });
  return { ok: true, data: toRow(updated) };
}

export async function setDefaultTemplate(id: string): Promise<ActionResult> {
  await requireAdmin();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    const t = await tx.quotationTemplate.findUnique({ where: { id } });
    if (!t) return fail("That template no longer exists.");
    if (t.archivedAt) return fail("Restore this template before making it the default.");
    await tx.quotationTemplate.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
    await tx.quotationTemplate.update({ where: { id }, data: { isDefault: true } });
    return { ok: true as const, data: undefined };
  });
}

export async function archiveTemplate(id: string): Promise<ActionResult> {
  await requireAdmin();
  const t = await prisma.quotationTemplate.findUnique({ where: { id } });
  if (!t) return fail("That template no longer exists.");
  if (t.isDefault) return fail("This is the default template. Make another one the default first.");
  await prisma.quotationTemplate.update({ where: { id }, data: { archivedAt: new Date() } });
  return { ok: true, data: undefined };
}

export async function restoreTemplate(id: string): Promise<ActionResult> {
  await requireAdmin();
  const t = await prisma.quotationTemplate.findUnique({ where: { id } });
  if (!t) return fail("That template no longer exists.");
  await prisma.quotationTemplate.update({ where: { id }, data: { archivedAt: null } });
  return { ok: true, data: undefined };
}

/** The template id to store on a quotation: real rows only (the built-in fallback has no row). */
export const storableTemplateId = (id: string | undefined | null) => (id && id !== BUILT_IN_TEMPLATE_ID ? id : null);
