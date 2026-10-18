import assert from "node:assert/strict";
import { WEBSITE_PHONES, currentBusinessContactText, currentBusinessCtaLinks, currentBusinessSettings } from "../lib/website/business-contact";
import { company } from "../lib/company";
import { prisma } from "../lib/prisma";
import { getPublishedPage, getPublishedPageMeta, getPublishedSettings } from "../lib/website/queries";
import { resolveSettings } from "../lib/website/public-config";

async function main() {
  assert.deepEqual(WEBSITE_PHONES, ["7988814808", "9812003001", "8708128632"]);
  assert.deepEqual(company.phones, ["9812003001", "8708128632", "7988814808"], "shared document contact order stays unchanged");
  for (const old of ["9812003001", "+91 98120 03001", "919812003001", "09812003001"]) {
    const settings = resolveSettings({ phone: old, whatsapp: old, phone2: "8708128632" });
    assert.equal(settings.phone, "7988814808");
    assert.equal(settings.whatsapp, "7988814808");
    assert.equal(settings.phone2, "8708128632");
  }
  const custom = { phone: "9999000011", whatsapp: "", phone2: "9812003001", email: "stbs2025@gmail.com" };
  assert.deepEqual(currentBusinessSettings(custom), custom);
  assert.deepEqual(currentBusinessSettings({ phone: null, whatsapp: "" }), { phone: null, whatsapp: "" });
  assert.equal(currentBusinessContactText("Call +91 98120 03001 for a proposal."), "Call +91 79888 14808 for a proposal.");
  const list = "Primary 7988814808; secondary 9812003001";
  assert.equal(currentBusinessContactText(list), list);
  const source = { ctaUrl: "tel:+919812003001", phones: ["9812003001", "8708128632"], nested: { href: "https://wa.me/919812003001?text=Hello" }, url: "https://example.com/9812003001" };
  const links = currentBusinessCtaLinks(source);
  assert.equal(links.ctaUrl, "tel:+917988814808");
  assert.equal(links.nested.href, "https://wa.me/917988814808?text=Hello");
  assert.deepEqual(links.phones, source.phones);
  assert.equal(source.ctaUrl, "tel:+919812003001");
  assert.equal(links.url, source.url);

  // Exercise the public query boundary with a legacy published snapshot, without any database access.
  const findSettings = prisma.websiteSettings.findFirst;
  const findPages = prisma.websitePage.findMany;
  try {
    prisma.websiteSettings.findFirst = (async () => ({ phone: "9999000011", publishedData: { phone: "9812003001", whatsapp: "9812003001", phone2: "8708128632" } })) as unknown as typeof findSettings;
    const published = await getPublishedSettings();
    assert.equal(published?.phone, "7988814808");
    assert.equal(published?.whatsapp, "7988814808");
    assert.equal(published?.phone2, "8708128632");
    prisma.websitePage.findMany = (async () => [{ slug: "contact-draft", publishedData: { slug: "contact", metaDescription: "Call +91 98120 03001." }, sections: [{ publishedContent: source }] }]) as unknown as typeof findPages;
    assert.equal((await getPublishedPageMeta("contact"))?.metaDescription, "Call +91 79888 14808.");
    assert.equal((await getPublishedPage("contact"))?.sections[0].content.ctaUrl, "tel:+917988814808");
  } finally {
    prisma.websiteSettings.findFirst = findSettings;
    prisma.websitePage.findMany = findPages;
  }

  console.log("Website-only contact regression checks passed: legacy published CMS, metadata/links, custom/cleared settings, unchanged document contacts.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
