/**
 * Migrate website media (entityType = "website") from local filesystem storage
 * to Vercel Blob.
 *
 * Behavior:
 *  - Reads every StorageFile row for the website entity.
 *  - Skips rows that are already migrated (metadata.provider === "vercel-blob"
 *    or blobUrl points at a *.blob.vercel-storage.com host) → idempotent, safe
 *    to re-run.
 *  - If the same key already exists in the Blob store, reuses that URL instead
 *    of re-uploading (safe against partial runs).
 *  - Otherwise reads the existing local object bytes (using the local storage
 *    root) and uploads them to Vercel Blob under the same key.
 *  - Updates the StorageFile row (metadata.blobUrl / provider / migratedAt,
 *    etag) keeping originalName / mimeType / size.
 *  - Rewrites every website table column that references the old URL
 *    (gallery, clients, testimonials, services, settings, seo, pages,
 *    section content/publishedContent JSON) to the new Blob URL.
 *  - Skips rows whose local object cannot be found (report them — those
 *    require manual upload or re-uploading).
 *
 * Usage:
 *   npx tsx scripts/migrate-website-media-to-blob.ts [--dry-run]
 *
 * Env:
 *   BLOB_READ_WRITE_TOKEN  required unless --dry-run
 *   STORAGE_LOCAL_DIR      optional local storage root (defaults to .storage)
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { put, head } from "@vercel/blob";

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const LOCAL_ROOT = process.env.STORAGE_LOCAL_DIR || join(process.cwd(), ".storage");
const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

// ─── Helpers ────────────────────────────────────────────────────────────────

function isBlobUrl(value: string): boolean {
  try {
    return new URL(value).hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

type FileMeta = Record<string, unknown>;

function rowMetadata(file: { metadata: unknown }): FileMeta {
  return (file.metadata as FileMeta) || {};
}

function isMigrated(file: { metadata: unknown }): boolean {
  const meta = rowMetadata(file);
  if (meta.provider === "vercel-blob") return true;
  return typeof meta.blobUrl === "string" && isBlobUrl(meta.blobUrl);
}

function oldUrl(meta: FileMeta, key: string): string {
  return typeof meta.blobUrl === "string" && meta.blobUrl
    ? meta.blobUrl
    : `/api/storage/local/${key}`;
}

function localObjectPath(bucket: string, key: string): string {
  const parts = key.split("/").map((p) => (p === ".." ? "" : p));
  return join(LOCAL_ROOT, bucket, ...parts);
}

/**
 * Deep string replacement across a JSON value (sections content / publishedData).
 */
function deepReplace(value: unknown, from: string, to: string): unknown {
  if (typeof value === "string") {
    return value.includes(from) ? value.split(from).join(to) : value;
  }
  if (Array.isArray(value)) return value.map((v) => deepReplace(v, from, to));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        deepReplace(v, from, to),
      ])
    );
  }
  return value;
}

// Columns on each website table that can reference a media URL.
const WEBSITE_TABLES = [
  { table: "WebsiteGalleryItem" as const, columns: ["mediaUrl", "thumbnailUrl", "publishedData"] },
  { table: "WebsiteClient" as const, columns: ["logoUrl", "publishedData"] },
  { table: "WebsiteTestimonial" as const, columns: ["photo"] },
  { table: "WebsiteService" as const, columns: ["image"] },
  {
    table: "WebsiteSettings" as const,
    columns: [
      "primaryLogoUrl",
      "lightLogoUrl",
      "darkLogoUrl",
      "mobileLogoUrl",
      "faviconUrl",
      "defaultOgImage",
      "founderPhoto",
      "publishedData",
    ],
  },
  {
    table: "WebsiteSeo" as const,
    columns: ["defaultOgImage", "twitterImage", "structuredData", "publishedData"],
  },
  { table: "WebsitePage" as const, columns: ["ogImage"] },
  { table: "WebsiteSection" as const, columns: ["content", "publishedContent"] },
];

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!DRY_RUN && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "BLOB_READ_WRITE_TOKEN is not set. Refusing to run without it (or use --dry-run)."
    );
    process.exit(1);
  }

  console.log(DRY_RUN ? "── Website media → Vercel Blob (DRY RUN) ──" : "── Website media → Vercel Blob ──");
  console.log(`Local object root: ${LOCAL_ROOT}`);

  const files = await prisma.storageFile.findMany({
    where: { entityType: "website" },
    orderBy: { createdAt: "asc" },
  });

  let migrated = 0;
  let skippedAlready = 0;
  let skippedNotFound = 0;
  const created: Array<{ key: string; from: string; to: string }> = [];

  for (const file of files) {
    if (file.deletedAt) {
      skippedAlready++;
      continue;
    }
    if (isMigrated(file)) {
      console.log(`  skip  ${file.key}  (already on Blob)`);
      skippedAlready++;
      continue;
    }

    const meta = rowMetadata(file);
    const from = oldUrl(meta, file.key);

    let to: string | null = null;
    let etag: string | undefined;
    if (DRY_RUN) {
      to = `blob://${file.key}`;
    } else {
      // Idempotency guard: a previous partial run may already have uploaded
      // this key even though the DB row is not flagged yet.
      const existing = await head(file.key).catch(() => null);
      if (existing) {
        to = existing.url;
        etag = existing.etag;
      } else {
        let body: Buffer;
        try {
          body = await readFile(localObjectPath(file.bucket, file.key));
        } catch {
          console.error(`  noop  ${file.key}  (local object not found — requires manual upload)`);
          skippedNotFound++;
          continue;
        }
        const blob = await put(file.key, body, {
          access: "public",
          addRandomSuffix: false,
          contentType: file.mimeType,
          cacheControlMaxAge: 31536000,
        });
        to = blob.url;
        etag = blob.etag;
      }
      await prisma.storageFile.update({
        where: { id: file.id },
        data: {
          etag: etag ?? file.etag,
          metadata: {
            ...meta,
            provider: "vercel-blob",
            blobUrl: to,
            migratedAt: new Date().toISOString(),
          },
        },
      });
    }

    created.push({ key: file.key, from, to });
    migrated++;
    console.log(`  ${DRY_RUN ? "plan" : "ok"}  ${file.key}  →  ${to}`);
  }

  // ── Rewrite dependent website table columns ─────────────────────────────
  if (!DRY_RUN) {
    for (const { key, from, to } of created) {
      for (const spec of WEBSITE_TABLES) {
        const model = (prisma as Record<string, any>)[spec.table];
        const rows: Array<Record<string, unknown>> = await model.findMany();
        for (const row of rows) {
          const data: Record<string, unknown> = {};
          for (const col of spec.columns) {
            const value = row[col];
            if (value === null || value === undefined) continue;
            if (typeof value === "string") {
              if ((value as string).includes(from)) data[col] = (value as string).split(from).join(to);
            } else if (typeof value === "object") {
              const replaced = deepReplace(value, from, to);
              if (JSON.stringify(replaced) !== JSON.stringify(value)) data[col] = replaced;
            }
          }
          if (Object.keys(data).length > 0) {
            await model.update({ where: { id: row.id }, data });
          }
        }
      }
      console.log(`  refs  ${key}  URL references rewritten`);
    }
  }

  console.log(
    `\nSummary: ${migrated} migrated, ${skippedAlready} already on Blob/skipped, ${skippedNotFound} local object(s) not found`
  );
  if (DRY_RUN) {
    console.log("\nDry run only — no changes were made. Run without --dry-run to migrate.");
  } else {
    console.log("\nDone.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });