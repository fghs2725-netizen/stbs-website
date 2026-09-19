import assert from "node:assert/strict";
import { altLooksLikeFilename, compressedNotice, formatBytes, MAX_UPLOAD_BYTES, pickSmaller, plannedSize, shouldCompress, validateImageFile } from "../lib/website/image-guard";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }
const f = (type: string, size: number, name = "a.jpg") => ({ name, type, size });

check("supported types pass", () => {
  for (const t of ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]) assert.equal(validateImageFile(f(t, 1000)).ok, true, t);
});
check("SVG and icon files are refused with a clear message (by type and by extension)", () => {
  for (const x of [f("image/svg+xml", 1000, "a.svg"), f("", 1000, "logo.SVG"), f("image/x-icon", 1000, "a.ico"), f("", 1000, "favicon.ico")]) {
    const r = validateImageFile(x);
    assert.equal(r.ok, false);
    assert.match((r as { message: string }).message, /can't be uploaded/);
  }
});
check("non-images and empty files are refused", () => {
  assert.equal(validateImageFile(f("application/pdf", 1000, "a.pdf")).ok, false);
  assert.equal(validateImageFile(f("image/jpeg", 0)).ok, false);
});
check("over 10 MB is refused and states both sizes", () => {
  const r = validateImageFile(f("image/png", MAX_UPLOAD_BYTES + 1));
  assert.equal(r.ok, false);
  assert.match((r as { message: string }).message, /10\.0 MB/);
  assert.equal(validateImageFile(f("image/png", MAX_UPLOAD_BYTES)).ok, true);
});
check("over 2 MB warns (not blocks); a large GIF does not promise compression", () => {
  const r = validateImageFile(f("image/jpeg", 3 * 1024 * 1024));
  assert.equal(r.ok, true);
  assert.match((r as { warning?: string }).warning ?? "", /compressed/);
  assert.equal((validateImageFile(f("image/gif", 3 * 1024 * 1024)) as { warning?: string }).warning, undefined);
  assert.equal((validateImageFile(f("image/jpeg", 100 * 1024)) as { warning?: string }).warning, undefined);
});
check("plannedSize scales the long edge to the limit, keeps aspect ratio, and never enlarges", () => {
  assert.deepEqual(plannedSize(4800, 2400, 2400), { width: 2400, height: 1200, scaled: true });
  assert.deepEqual(plannedSize(2000, 3000, 2400), { width: 1600, height: 2400, scaled: true });
  assert.deepEqual(plannedSize(1000, 500, 2400), { width: 1000, height: 500, scaled: false });
  assert.deepEqual(plannedSize(2400, 2400, 2400), { width: 2400, height: 2400, scaled: false });
});
check("plannedSize survives degenerate input", () => {
  const r = plannedSize(0, 0, 2400);
  assert.ok(r.width >= 1 && r.height >= 1);
  assert.ok(plannedSize(100000, 1, 2400).height >= 1);
});
check("compression is skipped for GIFs and for files already under 300 KB", () => {
  assert.equal(shouldCompress({ type: "image/gif", size: 5_000_000 }), false);
  assert.equal(shouldCompress({ type: "image/png", size: 200 * 1024 }), false);
  assert.equal(shouldCompress({ type: "image/png", size: 2_600_000 }), true);
});
check("the smaller file wins; a bigger or empty result falls back to the original", () => {
  assert.equal(pickSmaller(1000, 400), "compressed");
  assert.equal(pickSmaller(1000, 1000), "original");
  assert.equal(pickSmaller(1000, 1500), "original");
  assert.equal(pickSmaller(1000, 0), "original");
});
check("size wording", () => {
  assert.equal(formatBytes(2_664_665), "2.5 MB");
  assert.equal(formatBytes(340 * 1024), "340 KB");
  assert.equal(formatBytes(10), "1 KB");
  assert.equal(compressedNotice(2_664_665, 340 * 1024), "Compressed 2.5 MB to 340 KB.");
});

check("alt text that is empty or just a file name is flagged; real descriptions are not", () => {
  for (const a of ["", "   ", "IMG_2043", "DSC0012.jpg", "pxl-20260101", "WhatsApp Image 2026-09-19 at 10.11", "site_pic.jpeg", "photo1234"]) assert.equal(altLooksLikeFilename(a), true, a);
  for (const a of ["Crew lowering precast concrete rings into a trench", "Drilling rig at the BigBasket site", "Borewell casing pipes stacked beside the rig"]) assert.equal(altLooksLikeFilename(a), false, a);
  assert.equal(altLooksLikeFilename(null), true);
});

console.log(`\n${passed} checks passed`);
