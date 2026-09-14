/**
 * Storage e2e smoke test (local provider).
 *
 * Runs in an isolated temp root so the real `.storage` directory is untouched:
 *  1. uploads a PNG via StorageService (writes file + DB metadata row)
 *  2. reads it back with getObject() and verifies bytes + mime type
 *  3. deletes it and verifies the object is gone
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}

void (async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "stbs-storage-"));
  process.env.STORAGE_LOCAL_DIR = tempRoot;

  const { storage } = await import("../lib/storage/storage-service");

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  const entityId = "site";
  const result = await storage.upload({
    buffer: png,
    originalName: "qa.png",
    mimeType: "image/png",
    entityType: "website",
    entityId,
  });

  check("upload succeeds", () => assert.equal(result.success, true));
  check("url points at the public local route", () =>
    assert.ok(result.url && result.url.startsWith("/api/storage/local/website/"))
  );
  check("key is nested under entity", () =>
    assert.ok(result.key && result.key.startsWith(`website/${entityId}/`))
  );

  const key = result.key!;
  const obj = await storage.getObject(key);
  check("getObject returns the stored bytes", () => assert.ok(obj && obj.body.equals(png)));
  check("getObject resolves mimeType from DB", () => assert.equal(obj?.contentType, "image/png"));

  if (result.fileId) {
    const del = await storage.delete(result.fileId);
    check("delete removes the file", () => assert.equal(del.success, true));
    const gone = await storage.getObject(key);
    check("getObject returns null after delete", () => assert.equal(gone, null));
  }

  await fs.rm(tempRoot, { recursive: true, force: true });

  console.log(`\n${passed} checks passed`);
  if (process.exitCode) process.exit(process.exitCode);
})();