/**
 * Reading and writing quotation presets.
 *
 * Kept apart from `lib/quotation-presets.ts`, which is pure and testable without a database: this
 * file is the part that talks to one.
 */
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/quotation-management";
import { SEED_PRESETS, type Preset, type PresetField } from "@/lib/quotation-presets";

/** The presets on offer, each already carrying its questions and its items in order. */
export async function listPresets(): Promise<Preset[]> {
  const rows = await prisma.quotationPreset.findMany({
    where: { archived: false },
    orderBy: { position: "asc" },
    include: {
      fields: { orderBy: { position: "asc" } },
      items: { orderBy: { position: "asc" } },
    },
  });
  return rows.map((p) => ({
    key: p.key,
    name: p.name,
    subject: p.subject ?? undefined,
    fields: p.fields.map((f) => ({
      key: f.key,
      label: f.label,
      options: Array.isArray(f.options) ? (f.options as string[]) : [],
      allowCustom: f.allowCustom,
    })),
    items: p.items.map((i) => ({
      id: i.id,
      description: i.description,
      unit: i.unit,
      lastRate: i.lastRate === null ? null : Number(i.lastRate),
    })),
  }));
}

/**
 * Puts the shipped presets in, for a database that has none.
 *
 * Only ever creates: a preset the owner has since reworded, or deliberately emptied, must not be
 * quietly written back over. Running it twice is a no-op.
 */
export async function seedPresets(): Promise<number> {
  let created = 0;
  for (const [n, preset] of SEED_PRESETS.entries()) {
    const existing = await prisma.quotationPreset.findUnique({ where: { key: preset.key } });
    if (existing) continue;
    await prisma.quotationPreset.create({
      data: {
        key: preset.key,
        name: preset.name,
        subject: preset.subject ?? null,
        position: n,
        fields: {
          create: preset.fields.map((f: PresetField, i) => ({
            key: f.key, label: f.label, options: f.options as object, allowCustom: f.allowCustom, position: i,
          })),
        },
        items: {
          create: preset.items.map((item, i) => ({
            position: i, description: item.description, unit: item.unit,
          })),
        },
      },
    });
    created++;
  }
  return created;
}

/* ────────────────────────── the setup page ────────────────────────── */

export async function updatePresetItem(id: string, data: { description?: string; unit?: string; lastRate?: number | null }) {
  await requireAdmin();
  await prisma.quotationPresetItem.update({
    where: { id },
    data: {
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      ...(data.unit !== undefined ? { unit: data.unit.trim() } : {}),
      ...(data.lastRate !== undefined ? { lastRate: data.lastRate } : {}),
    },
  });
}

export async function addPresetItem(presetId: string) {
  await requireAdmin();
  const last = await prisma.quotationPresetItem.findFirst({ where: { presetId }, orderBy: { position: "desc" } });
  await prisma.quotationPresetItem.create({
    data: { presetId, position: (last?.position ?? -1) + 1, description: "", unit: "LS" },
  });
}

export async function deletePresetItem(id: string) {
  await requireAdmin();
  await prisma.quotationPresetItem.delete({ where: { id } });
}

/** Moves an item one place, swapping positions with its neighbour so the order stays contiguous. */
export async function movePresetItem(id: string, by: -1 | 1) {
  await requireAdmin();
  const item = await prisma.quotationPresetItem.findUnique({ where: { id } });
  if (!item) throw new Error("NOT_FOUND");
  const neighbour = await prisma.quotationPresetItem.findFirst({
    where: { presetId: item.presetId, position: by < 0 ? { lt: item.position } : { gt: item.position } },
    orderBy: { position: by < 0 ? "desc" : "asc" },
  });
  if (!neighbour) return;
  await prisma.$transaction([
    prisma.quotationPresetItem.update({ where: { id: item.id }, data: { position: neighbour.position } }),
    prisma.quotationPresetItem.update({ where: { id: neighbour.id }, data: { position: item.position } }),
  ]);
}

export async function updatePresetField(id: string, data: { label?: string; options?: string[]; allowCustom?: boolean }) {
  await requireAdmin();
  await prisma.quotationPresetField.update({
    where: { id },
    data: {
      ...(data.label !== undefined ? { label: data.label.trim() } : {}),
      ...(data.options !== undefined ? { options: data.options.map((o) => o.trim()).filter(Boolean) as object } : {}),
      ...(data.allowCustom !== undefined ? { allowCustom: data.allowCustom } : {}),
    },
  });
}
