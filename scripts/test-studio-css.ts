import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Guards against a class-name collision that shipped once: `.qs-sr` was both the screen-reader-only helper
 * (1px, clipped, absolutely positioned) and the price table's row-number cell. The row number vanished from
 * the grid and every other cell in the row slid one column left, so the description box was 34px wide and
 * typed values landed under the wrong headings.
 */
let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }

const css = readFileSync("components/quotation/studio/studio.css", "utf8");
const rules = [...css.matchAll(/(^|\n)\s*((?:\.[\w-]+(?:\s*,\s*)?)+)\s*\{([^}]*)\}/g)].map((m) => ({ selectors: m[2].split(",").map((s) => s.trim()), body: m[3] }));

// A class is "visually hidden" if any rule for it clips it to nothing.
const hiddenClasses = new Set<string>();
for (const r of rules) if (/clip:\s*rect\(\s*0/.test(r.body)) for (const s of r.selectors) hiddenClasses.add(s);

check("the screen-reader-only helper exists (the test would be vacuous otherwise)", () => {
  assert.ok(hiddenClasses.has(".qs-sr"), [...hiddenClasses].join(","));
});
check("a visually-hidden class has no other styling rule that gives it a layout job", () => {
  for (const cls of hiddenClasses) {
    const defs = rules.filter((r) => r.selectors.includes(cls));
    assert.equal(defs.length, 1, `${cls} is defined ${defs.length} times; a second rule means it is being used for something visible`);
  }
});
check("no table cell or row element in the price table uses a visually-hidden class", () => {
  const tsx = readFileSync("components/quotation/studio/line-items.tsx", "utf8");
  for (const cls of hiddenClasses) {
    const name = cls.slice(1);
    assert.ok(!new RegExp(`role="(cell|row|columnheader)"[^>]*className="[^"]*\b${name}\b`).test(tsx), `${name} is used on a table cell`);
  }
});
check("the row number has its own class, and the mobile layout places that same class", () => {
  const tsx = readFileSync("components/quotation/studio/line-items.tsx", "utf8");
  assert.match(tsx, /className="qs-rownum"/);
  assert.match(css, /\.qs-rownum\s*\{\s*grid-area:\s*sr/);
});
check("the desktop grid has one track for every child of a row (so nothing can shift into the wrong column)", () => {
  const tsx = readFileSync("components/quotation/studio/line-items.tsx", "utf8");
  // minmax(0, 1fr) is one track, so collapse it before counting.
  const tracks = css.match(/\.qs-items-head,\s*\.qs-row\s*\{[^}]*grid-template-columns:\s*([^;]+);/)![1].replace(/minmax\([^)]*\)/g, "x").trim().split(/\s+/).length;
  const rowStart = tsx.indexOf('className="it-row qs-row"');
  const rowEnd = tsx.indexOf("{shown.length > 0", rowStart);
  const cells = (tsx.slice(rowStart, rowEnd).match(/role="cell"/g) ?? []).length;
  assert.equal(cells, tracks, `${cells} cells in a row, ${tracks} grid tracks`);
});

console.log(`\n${passed} checks passed`);
