import assert from "node:assert/strict";
import { SERVICE_PAGES, serviceHref, servicePageFor } from "../lib/website/service-pages";

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${label}`);
}

// The brief fixes these four URLs; they must never change.
const EXPECTED: Array<[string, string]> = [
  ["borewell-drilling", "/borewell-drilling"],
  ["rainwater-harvesting", "/rainwater-harvesting"],
  ["borewell-material-supply", "/borewell-material-supply"],
  ["tubewell-construction", "/tubewell-construction"],
];

check("exactly four service pages, in brief order", () => {
  assert.deepEqual(SERVICE_PAGES.map((p) => p.slug), EXPECTED.map(([s]) => s));
});

for (const [slug, href] of EXPECTED) {
  check(`bare CMS slug "${slug}" -> ${href}`, () => assert.equal(serviceHref(slug), href));
  check(`slash-prefixed "/${slug}" -> ${href}`, () => assert.equal(serviceHref(`/${slug}`), href));
}

check("whitespace and trailing slash are tolerated", () => assert.equal(serviceHref("  borewell-drilling/ "), "/borewell-drilling"));
check("unknown slug degrades to /services, never a 404 route", () => assert.equal(serviceHref("water-testing"), "/services"));
check("empty / null / undefined -> /services", () => {
  assert.equal(serviceHref(""), "/services");
  assert.equal(serviceHref(null), "/services");
  assert.equal(serviceHref(undefined), "/services");
});
check("no partial-match leakage (prefix of a real slug)", () => assert.equal(serviceHref("borewell"), "/services"));
check("servicePageFor returns the page for a known slug only", () => {
  assert.equal(servicePageFor("tubewell-construction")?.title, "Tubewell Construction");
  assert.equal(servicePageFor("nope"), undefined);
});
check("card titles are short (icon + short title only)", () => {
  for (const p of SERVICE_PAGES) assert.ok(p.title.length <= 24, `${p.title} too long`);
  assert.equal(SERVICE_PAGES[2].title, "Material Supply");
});
check("every route is unique and site-root relative", () => {
  const hrefs = SERVICE_PAGES.map((p) => p.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  for (const h of hrefs) assert.match(h, /^\/[a-z-]+$/);
});

console.log(`\n${passed} checks passed`);
