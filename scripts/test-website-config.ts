import assert from "node:assert/strict";
import { resolveSettings, field, primaryPhone } from "../lib/website/public-config";
import { absolutePath, canonicalSiteUrl } from "../lib/site-url";
import { company } from "../lib/company";

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

console.log("settings resolution (no CMS row → verified fallbacks)");
check("null settings uses company name", () => assert.equal(resolveSettings(null).businessName, company.name));
check("null settings uses company phone", () => assert.equal(resolveSettings(null).phone, company.phones[0]));
check("null settings uses company second phone", () => assert.equal(resolveSettings(null).phone2, company.phones[1]));
check("null settings uses company email", () => assert.equal(resolveSettings(null).email, company.email));
check("null settings never fabricates an address", () => assert.equal(resolveSettings(null).address ?? "", ""));

console.log("settings resolution (CMS row present)");
check("explicit value wins over fallback", () => assert.equal(resolveSettings({ phone: "9999000011" }).phone, "9999000011"));
check("empty-string value means intentionally cleared (no restore)", () => assert.equal(resolveSettings({ phone: "" }).phone, ""));
check("null value means intentionally cleared (no restore)", () => assert.equal(resolveSettings({ phone: null }).phone, ""));
check("whitespace value treated as cleared", () => assert.equal(resolveSettings({ phone: "   " }).phone, ""));
check("missing key falls back", () => assert.equal(resolveSettings({}).email, company.email));
check("explicit empty email is not silently restored", () => assert.equal(resolveSettings({ email: "" }).email, ""));
check("absent address keys produce empty (never inferred)", () => assert.equal(resolveSettings({}).address ?? "", ""));
check("present address key is used when set", () => assert.equal(resolveSettings({ addressLine1: "Village Akbarpur Barota, Sonipat" }).address, "Village Akbarpur Barota, Sonipat"));
check("city/state only ever come from CMS", () => assert.equal(resolveSettings({ city: "", state: "" }).city ?? "", ""));

console.log("primaryPhone");
check("whatsapp preferred over phone", () => assert.equal(primaryPhone({ whatsapp: "911234567890", phone: "912345678901" }), "911234567890"));
check("phone used when no whatsapp", () => assert.equal(primaryPhone({ whatsapp: "", phone: "912345678901" }), "912345678901"));
check("both cleared → empty", () => assert.equal(primaryPhone({ whatsapp: "", phone: "" }), ""));

console.log("field primitive");
check("missing key returns fallback", () => assert.equal(field({}, "k", "fb"), "fb"));
check("present value returns value", () => assert.equal(field({ k: "v" }, "k", "fb"), "v"));
check("present empty returns empty", () => assert.equal(field({ k: "" }, "k", "fb"), ""));
check("present null returns empty", () => assert.equal(field({ k: null }, "k", "fb"), ""));

console.log("canonical URLs");
const prevSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
delete process.env.NEXT_PUBLIC_SITE_URL;
check("canonical default is https://stbs.in", () => assert.equal(canonicalSiteUrl(), "https://stbs.in"));
check("absolutePath joins canonically", () => assert.equal(absolutePath("/about"), "https://stbs.in/about"));
check("absolutePath normalizes missing leading slash", () => assert.equal(absolutePath("quote"), "https://stbs.in/quote"));
if (prevSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
else process.env.NEXT_PUBLIC_SITE_URL = prevSiteUrl;

console.log(`\n${passed} checks passed`);
if (process.exitCode) process.exit(process.exitCode);