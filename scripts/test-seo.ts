import assert from "node:assert/strict";
import { businessInfo } from "../lib/company";
import { SEO } from "../lib/website/seo-copy";
import { buildLocalBusiness } from "../lib/website/structured-data";

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${label}`);
}

const ld = buildLocalBusiness() as Record<string, unknown>;
const json = JSON.stringify(ld);

check("it is valid JSON-LD with the LocalBusiness type and an @id", () => {
  assert.equal(ld["@context"], "https://schema.org");
  assert.equal(ld["@type"], "HomeAndConstructionBusiness");
  assert.match(String(ld["@id"]), /#business$/);
});
check("all phone numbers are in E.164 form", () => assert.deepEqual(ld.telephone, ["+919812003001", "+918708128632", "+917988814808"]));
check("founding year is 1992", () => assert.equal(ld.foundingDate, "1992"));
check("all five services are listed as serviceType and as offers with absolute URLs", () => {
  assert.equal((ld.serviceType as string[]).length, 5);
  const offers = (ld.hasOfferCatalog as { itemListElement: Array<{ itemOffered: { url: string } }> }).itemListElement;
  assert.equal(offers.length, 5);
  for (const o of offers) assert.match(o.itemOffered.url, /^https:\/\/www\.stbs\.in\/[a-z-]+$/);
});
check("areas served include Haryana, each named place and Delhi NCR (Gurugram from the owner's list)", () => {
  const names = (ld.areaServed as Array<{ name: string }>).map((a) => a.name);
  for (const n of ["Haryana", "Sonipat", "Panipat", "Kundli", "Rohtak", "Gurugram", "Delhi NCR"]) assert.ok(names.includes(n), n);
});
check("logo and image are absolute URLs on the canonical host", () => {
  assert.match(String(ld.logo), /^https:\/\/www\.stbs\.in\//);
  assert.match(String(ld.image), /^https:\/\/www\.stbs\.in\//);
});

// The guard that matters most: unverified owner data must not be invented.
check("address, pincode, hours, map pin and link match the owner's Google listing", () => {
  assert.equal(businessInfo.registeredOffice, "12, New market, Bahalgarh, Sonipat");
  assert.equal(businessInfo.pinCode, "131021");
  assert.equal(businessInfo.legalName, "Saini Tubewell Boring Service");
  const address = ld.address as Record<string, string>;
  assert.equal(address.streetAddress, "12, New market, Bahalgarh, Sonipat");
  assert.equal(address.postalCode, "131021");
  assert.equal(ld.legalName, "Saini Tubewell Boring Service");
  const hours = ld.openingHoursSpecification as { dayOfWeek: string[]; opens: string; closes: string };
  assert.equal(hours.dayOfWeek.length, 7);
  assert.deepEqual([hours.opens, hours.closes], ["00:00", "23:59"]);
  assert.deepEqual(ld.alternateName, ["STBS", "STBS- Saini Tubewell Boring Service"]);
  assert.deepEqual(ld.geo, { "@type": "GeoCoordinates", latitude: 28.962924, longitude: 77.093266 });
  assert.equal(ld.hasMap, "https://maps.google.com/?cid=13861624936793150977");
  assert.deepEqual(ld.sameAs, ["https://maps.google.com/?cid=13861624936793150977"]);
  // The GSTIN is shown in the footer but is not part of the structured data; the old pincode and hours are gone.
  assert.doesNotMatch(json, /06AWTPS|131001|Dipalpur|19:00/i);
});
check("no undefined / null values leak into the JSON", () => assert.doesNotMatch(json, /undefined|null/));

check("every page has a title and description", () => {
  for (const [k, v] of Object.entries(SEO)) {
    assert.ok(v.title.length > 10 && v.description.length > 40, k);
  }
});
check("titles fit a search result (<= 65 chars) and descriptions are <= 165 chars", () => {
  for (const [k, v] of Object.entries(SEO)) {
    assert.ok(v.title.length <= 65, `${k} title ${v.title.length}`);
    assert.ok(v.description.length <= 165, `${k} description ${v.description.length}`);
  }
});
check("every title carries the brand exactly once (pages use the title as-is)", () => {
  for (const [k, v] of Object.entries(SEO)) assert.equal((v.title.match(/Saini Tubewell/g) ?? []).length, 1, k);
});
check("titles and descriptions are unique across pages", () => {
  const t = Object.values(SEO).map((v) => v.title);
  const d = Object.values(SEO).map((v) => v.description);
  assert.equal(new Set(t).size, t.length);
  assert.equal(new Set(d).size, d.length);
});
check("local keywords appear naturally: Sonipat on the service pages, no keyword stuffing", () => {
  for (const k of ["borewell-drilling", "rainwater-harvesting", "borewell-material-supply", "tubewell-construction"] as const) assert.match(SEO[k].title, /Sonipat/, k);
  for (const [k, v] of Object.entries(SEO)) {
    const sonipat = (v.title + " " + v.description).match(/Sonipat/g)?.length ?? 0;
    assert.ok(sonipat <= 2, `${k} repeats Sonipat ${sonipat} times`);
  }
});
check("no unearned promises: no price, guarantee, 'best', 'cheapest', turnaround or 24/7 claims", () => {
  const all = Object.values(SEO).map((v) => v.title + " " + v.description).join(" ");
  assert.doesNotMatch(all, /\bbest\b|cheapest|lowest|guarantee|24\s*\/\s*7|within \d+|₹|\bRs\b|%/i);
});

console.log(`\n${passed} checks passed`);
