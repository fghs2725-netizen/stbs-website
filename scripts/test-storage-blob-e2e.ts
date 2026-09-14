/**
 * Storage e2e for the Website CMS + Vercel Blob provider.
 *
 * Runs against the local provider by default (offline-safe) and additionally
 * exercises a real Vercel Blob put/head/del round-trip when
 * BLOB_READ_WRITE_TOKEN is set.
 *
 * Verifies:
 *  1. upload stores the resolved public URL in StorageFile metadata
 *  2. deleteUrl() removes the object and soft-deletes the row (no orphans;
 *     row stays for audit, getObject returns null)
 *  3. re-deleting is a safe no-op
 *  4. (blob) real put returns an https *.blob.vercel-storage.com URL
 *  5. (blob) public URL streams the bytes with HTTP 200
 *  6. (blob) del removes the blob (head throws afterwards)
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

let passed = 0;
let failed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${name}`);
    console.error((err as Error).message);
  }
}

async function run() {
  // Run in an isolated temp root so the real `.storage` directory is untouched.
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "stbs-blob-"));
  process.env.STORAGE_LOCAL_DIR = tempRoot;
  process.env.STORAGE_PROVIDER = "local";

  const { storage } = await import("../lib/storage/storage-service");
  const { prisma } = await import("../lib/prisma");

  console.log("── Storage: Website CMS upload/delete (provider-agnostic) ──\n");

  const uploaded = await storage.upload({
    buffer: png,
    originalName: "qa.png",
    mimeType: "image/png",
    entityType: "website",
    entityId: "site",
  });

  check("upload succeeds", () => assert.equal(uploaded.success, true));
  check("key is nested under entity", () => assert.ok(uploaded.key && uploaded.key.startsWith("website/site/")));
  check("upload returns a URL", () => assert.ok(uploaded.url && uploaded.url.length > 0));

  const row = await prisma.storageFile.findUnique({ where: { key: uploaded.key! } });
  check("StorageFile row created", () => assert.ok(row));
  const meta = (row?.metadata ?? {}) as Record<string, unknown>;
  check("metadata records provider", () => assert.equal(meta.provider, "local"));
  check("metadata records blobUrl", () => assert.equal(meta.blobUrl, uploaded.url));

  const obj = await storage.getObject(uploaded.key!);
  check("getObject returns the stored bytes", () => assert.ok(obj && obj.body.equals(png)));

  const del = await storage.deleteUrl(uploaded.url!);
  check("deleteUrl succeeds", () => assert.equal(del.success, true));

  const after = await prisma.storageFile.findUnique({ where: { key: uploaded.key! } });
  check("row is soft-deleted (not removed)", () => assert.ok(after && after.deletedAt !== null));

  const gone = await storage.getObject(uploaded.key!);
  check("getObject returns null after delete", () => assert.equal(gone, null));

  const again = await storage.deleteUrl(uploaded.url!);
  check("re-delete is a safe no-op", () => assert.equal(again.success, true));

  check("deleteUrl rejects non-website URL", async () => {
    const r = await storage.deleteUrl("not-a-url");
    assert.equal(r.success, false);
  });

  const missing = await storage.deleteUrl("https://stbs.in/robots.txt");
  check("deleteUrl reports unknown URL", () => assert.equal(missing.success, false));

  await fs.rm(tempRoot, { recursive: true, force: true });

  // ── Real Vercel Blob round-trip (only when a token is available) ────────
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("\n── Storage: Vercel Blob real round-trip ──");
    const { put, head, del } = await import("@vercel/blob");

    const key = `website/site/test-blob-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const blob = await put(key, png, { access: "public", addRandomSuffix: false, contentType: "image/png", cacheControlMaxAge: 60 });

    check("put returns https blob URL", () => {
      const u = new URL(blob.url);
      assert.equal(u.protocol, "https:");
      assert.ok(u.hostname.endsWith(".blob.vercel-storage.com"));
    });
    check("pathname matches key", () => assert.equal(new URL(blob.url).pathname.slice(1), key));

    const res = await fetch(blob.url);
    check("public URL streams bytes with HTTP 200", () => assert.equal(res.status, 200));
    check("public URL returns the exact bytes", () => res.arrayBuffer().then((buf) => assert.ok(Buffer.from(buf).equals(png))));
    check("response is image/png", () => assert.equal(res.headers.get("content-type"), "image/png"));

    const h = await head(key);
    check("head returns metadata", () => {
      assert.equal(h.size, png.length);
      assert.equal(h.contentType, "image/png");
    });

    await del(key);
    let deleted = false;
    try {
      await head(key);
    } catch {
      deleted = true;
    }
    check("del removes the blob", () => assert.ok(deleted));
  } else {
    console.log("\n(No BLOB_READ_WRITE_TOKEN — skipping real Vercel Blob round-trip.)");
  }

  console.log(`\n${passed} checks passed, ${failed} failed`);
  if (failed) process.exit(1);
}

void run().catch((err) => {
  console.error(err);
  process.exit(1);
});