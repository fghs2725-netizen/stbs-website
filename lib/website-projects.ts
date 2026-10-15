import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ProjectCase } from "@/lib/website/projects-data";

/**
 * The projects on the public site (homepage "Selected projects" and /projects), kept in the
 * WebsiteProject table and edited in Admin -> Website projects. A row with `published` set is live
 * as soon as it is saved. Everything that writes requires an admin session.
 */

export type ProjectPhoto = { url: string; alt: string };

export type ProjectInput = {
  id?: string;
  title: string;
  location: string;
  sector: string;
  summary: string;
  scope: string;
  depth: string;
  output: string;
  year: string;
  photos: ProjectPhoto[];
  published: boolean;
  /** Shown on the homepage; at most three projects can be, and only while published. */
  featured: boolean;
};

export type ProjectRow = ProjectInput & { id: string; position: number; updatedAt: string };

export class ProjectInputError extends Error {}

const MAX_PHOTOS = 12;
export const MAX_FEATURED = 3;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
}

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[ \t]+/g, " ").trim().slice(0, max);

/** Only our own uploads or plain https addresses: never a script or data URL. */
function safeUrl(v: unknown): string | null {
  const u = String(v ?? "").trim();
  if (u.length > 2000) return null;
  return /^https:\/\//i.test(u) || /^\/(?!\/)/.test(u) ? u : null;
}

function readPhotos(raw: unknown): ProjectPhoto[] {
  if (!Array.isArray(raw)) return [];
  const out: ProjectPhoto[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const url = safeUrl((p as Record<string, unknown>).url);
    if (!url) continue;
    out.push({ url, alt: clean((p as Record<string, unknown>).alt, 200) });
  }
  return out.slice(0, MAX_PHOTOS);
}

type Row = NonNullable<Awaited<ReturnType<typeof prisma.websiteProject.findFirst>>>;
const toRow = (r: Row): ProjectRow => ({
  id: r.id,
  title: r.title,
  location: r.location,
  sector: r.sector,
  summary: r.summary,
  scope: r.scope ?? "",
  depth: r.depth ?? "",
  output: r.output ?? "",
  year: r.year ?? "",
  photos: readPhotos(r.photos),
  published: r.published,
  featured: r.featured && r.published,
  position: r.position,
  updatedAt: r.updatedAt.toISOString(),
});

const ORDER = [{ position: "asc" as const }, { createdAt: "desc" as const }];

/**
 * The live projects for the public pages, in display order. Returns null when the table cannot be
 * read (for example before its migration has been applied), so the caller falls back to the built-in
 * list instead of an empty section.
 */
export async function getPublishedProjects(): Promise<ProjectCase[] | null> {
  try {
    const rows = await prisma.websiteProject.findMany({ where: { published: true, deletedAt: null }, orderBy: ORDER });
    return rows.map((r) => {
      const row = toRow(r);
      return {
        title: row.title,
        location: row.location,
        sector: row.sector,
        summary: row.summary,
        ...(row.scope ? { scope: row.scope } : {}),
        ...(row.depth ? { depth: row.depth } : {}),
        ...(row.output ? { output: row.output } : {}),
        ...(row.year ? { year: row.year } : {}),
        ...(row.featured ? { featured: true } : {}),
        ...(row.photos.length ? { images: row.photos.map((p, i) => ({ src: p.url, alt: p.alt || `${row.title}, photo ${i + 1}` })) } : {}),
      };
    });
  } catch {
    return null;
  }
}

export async function listProjects(): Promise<ProjectRow[]> {
  await requireAdmin();
  const rows = await prisma.websiteProject.findMany({ where: { deletedAt: null }, orderBy: ORDER });
  return rows.map(toRow);
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  await requireAdmin();
  const r = await prisma.websiteProject.findFirst({ where: { id, deletedAt: null } });
  return r ? toRow(r) : null;
}

function validate(input: ProjectInput) {
  const title = clean(input.title, 200);
  const location = clean(input.location, 200);
  if (!title) throw new ProjectInputError("Give the project a title.");
  if (!location) throw new ProjectInputError("Say where the project is.");
  return {
    title,
    location,
    sector: clean(input.sector, 80),
    summary: clean(input.summary, 600),
    scope: String(input.scope ?? "").split(/\r?\n/).map((l) => clean(l, 240)).filter(Boolean).slice(0, 30).join("\n") || null,
    depth: clean(input.depth, 60) || null,
    output: clean(input.output, 60) || null,
    year: clean(input.year, 12) || null,
    photos: readPhotos(input.photos),
    published: Boolean(input.published),
    // Only a project that is on the website can be on the homepage.
    featured: Boolean(input.published) && Boolean(input.featured),
  };
}

/** The homepage has room for three: refuse a fourth rather than quietly dropping one. */
async function assertHomepageRoom(excludeId: string | undefined) {
  const others = await prisma.websiteProject.count({ where: { published: true, featured: true, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) } });
  if (others >= MAX_FEATURED) throw new ProjectInputError(`Only ${MAX_FEATURED} projects fit on the homepage. Take one off the homepage first.`);
}

/** Creates or updates a project; returns its id. A new project takes the first place in the list. */
export async function saveProject(input: ProjectInput): Promise<string> {
  await requireAdmin();
  const data = validate(input);
  if (data.featured) await assertHomepageRoom(input.id);
  if (input.id) {
    const found = await prisma.websiteProject.findFirst({ where: { id: input.id, deletedAt: null }, select: { id: true } });
    if (!found) throw new ProjectInputError("That project no longer exists.");
    await prisma.websiteProject.update({ where: { id: input.id }, data });
    return input.id;
  }
  const first = await prisma.websiteProject.findFirst({ where: { deletedAt: null }, orderBy: { position: "asc" }, select: { position: true } });
  const created = await prisma.websiteProject.create({ data: { ...data, position: (first?.position ?? 1) - 1 } });
  return created.id;
}

export async function setProjectPublished(id: string, published: boolean) {
  await requireAdmin();
  // Taking a project off the website also takes it off the homepage.
  await prisma.websiteProject.update({ where: { id }, data: published ? { published } : { published, featured: false } });
}

export async function setProjectFeatured(id: string, featured: boolean) {
  await requireAdmin();
  const row = await prisma.websiteProject.findFirst({ where: { id, deletedAt: null }, select: { published: true } });
  if (!row) throw new ProjectInputError("That project no longer exists.");
  if (featured && !row.published) throw new ProjectInputError("Put the project on the website first.");
  if (featured) await assertHomepageRoom(id);
  await prisma.websiteProject.update({ where: { id }, data: { featured } });
}

/** Soft delete, like the rest of the admin: the row stays in the database but leaves the site and the list. */
export async function deleteProject(id: string) {
  await requireAdmin();
  await prisma.websiteProject.update({ where: { id }, data: { deletedAt: new Date(), published: false, featured: false } });
}

/** Swaps a project with its neighbour in the list. */
export async function moveProject(id: string, direction: -1 | 1) {
  await requireAdmin();
  const rows = await prisma.websiteProject.findMany({ where: { deletedAt: null }, orderBy: ORDER, select: { id: true } });
  const i = rows.findIndex((r) => r.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const ids = rows.map((r) => r.id);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  // Rewrite the whole order so equal positions can never leave the swap ambiguous.
  await prisma.$transaction(ids.map((rid, n) => prisma.websiteProject.update({ where: { id: rid }, data: { position: n + 1 } })));
}
