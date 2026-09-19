import assert from "node:assert/strict";
import { SECTION_TYPE_DEFS } from "../lib/website/section-types";
import { HOME_CTA, HOME_HERO, HOME_SECTORS, HOME_SERVICES, HOME_STATS } from "../lib/website/home-defaults";
import { ABOUT_SECTIONS, CLIENTS_SECTIONS, CONTACT_SECTIONS, QUOTE_SECTIONS } from "../lib/website/page-defaults";
import { SERVICE_PAGES } from "../lib/website/service-pages";
import {
  hardLimit, isValidLinkUrl, looksLikeFilename, validateClient, validateGalleryItem, validateNavItem, validateSectionContent, validateSeo, validateService, validateSettings, validateTestimonial,
} from "../lib/website/validation";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }
const has = (msgs: string[], re: RegExp) => assert.ok(msgs.some((m) => re.test(m)), `expected a message matching ${re}; got: ${JSON.stringify(msgs)}`);

check("layout limits are attached to fields as `max`, and the hard limit is 1.5x", () => {
  const heading = SECTION_TYPE_DEFS.hero.fields!.find((f) => f.key === "heading")!;
  assert.equal(heading.max, 80);
  assert.equal(SECTION_TYPE_DEFS.cta.fields!.find((f) => f.key === "ctaText")!.max, 30);
  assert.equal(SECTION_TYPE_DEFS.stats.lists![0].fields.find((f) => f.key === "label")!.max, 50);
  assert.equal(hardLimit(80), 120);
});
check("over the hard limit is rejected with a readable message naming the field; between recommended and hard is allowed", () => {
  const ok = validateSectionContent("hero", { heading: "x".repeat(100) });
  assert.deepEqual(ok, []);
  const bad = validateSectionContent("hero", { heading: "x".repeat(130) });
  has(bad, /Hero headline is 130 characters; keep it under 80\./);
});
check("blank required fields are rejected; a missing key falls back to the default and is allowed", () => {
  has(validateSectionContent("hero", { heading: "   " }), /Hero headline cannot be left empty/);
  assert.deepEqual(validateSectionContent("hero", { supportingText: "ok" }), []);
  has(validateSectionContent("cta", { heading: "Hi", ctaText: "", ctaUrl: "/quote" }), /Call to Action button text cannot be left empty/);
});
check("link fields accept https, relative paths, anchors, tel: and mailto:, and reject the rest", () => {
  for (const good of ["/quote", "https://stbs.in/x", "http://a.co", "tel:+919812003001", "mailto:a@b.co", "#contact", ""]) assert.ok(isValidLinkUrl(good), good);
  for (const bad of ["javascript:alert(1)", "//evil.com", "ftp://x.co", "not a url", "quote", "data:text/html,x"]) assert.ok(!isValidLinkUrl(bad), bad);
  has(validateSectionContent("cta", { heading: "Hi", ctaText: "Go", ctaUrl: "javascript:alert(1)" }), /Call to Action button URL is not a valid link/);
});
check("alt text is required whenever an image is set, and a file name does not count", () => {
  has(validateSectionContent("hero", { heading: "H", heroImage: "/hero/a.webp" }), /Add hero photo alt text.*hero photo/i);
  assert.deepEqual(validateSectionContent("hero", { heading: "H", heroImage: "/hero/a.webp", heroImageAlt: "Drilling rig on an industrial site" }), []);
  has(validateSectionContent("hero", { heading: "H", heroImage: "/hero/a.webp", heroImageAlt: "IMG_2041.jpg" }), /looks like a file name/);
  has(validateSectionContent("text_image", { image: "/site_pic.jpeg" }), /image alt text/i);
  assert.ok(looksLikeFilename("a.webp", "/x/a.webp"));
  assert.ok(looksLikeFilename("stbs-rig-site", "https://blob/stbs-rig-site.webp"));
  assert.ok(!looksLikeFilename("Crew lowering casing pipe into a borewell"));
});
check("list rows are validated with a row number in the message; oversized lists are rejected", () => {
  has(validateSectionContent("stats", { items: [{ label: "x".repeat(90), value: "34+" }] }), /Statistics row 1 label is 90 characters; keep it under 50/);
  has(validateSectionContent("stats", { items: "nope" }), /must be a list/);
  has(validateSectionContent("stats", { items: Array.from({ length: 80 }, () => ({ label: "a", value: "1" })) }), /keep it to 60 or fewer/);
});
check("number and select fields are checked; unknown section types and non-objects are handled", () => {
  has(validateSectionContent("gallery", { maxItems: 99 }), /number from 1 to 24/);
  assert.deepEqual(validateSectionContent("gallery", { maxItems: 6 }), []);
  has(validateSectionContent("text_image", { layout: "diagonal" }), /not one of the choices/);
  assert.deepEqual(validateSectionContent("nonexistent_type", { anything: 1 }), []);
  has(validateSectionContent("hero", "nope"), /set of fields/);
  has(validateSectionContent("hero", ["a"]), /set of fields/);
});
check("service: title, slug, FAQ rows, and search-length rules", () => {
  assert.deepEqual(validateService({ title: "Borewell Drilling", slug: "borewell-drilling" }, { full: true }), []);
  has(validateService({ title: "", slug: "a" }, { full: true }), /Service title cannot be left empty/);
  for (const slug of ["Borewell Drilling", "borewell--drilling", "-borewell", "borewell_drilling"]) has(validateService({ title: "T", slug }), /web address can only use lowercase/);
  has(validateService({ faqs: [{ question: "How deep?", answer: "" }] }), /FAQ 1 needs an answer/);
  has(validateService({ faqs: [{ question: " ", answer: "x" }] }), /FAQ 1 needs a question/);
  has(validateService({ seoTitle: "x".repeat(71) }), /search title is 71 characters; keep it under 70/);
  has(validateService({ seoDescription: "x".repeat(171) }), /search description is 171 characters; keep it under 170/);
  assert.deepEqual(validateService({ seoTitle: "x".repeat(70), seoDescription: "x".repeat(170) }), []);
});
check("client: a logo needs alt text (not a file name); website must be a web address", () => {
  has(validateClient({ name: "Amul", logoUrl: "/clients/amul.svg" }), /Add alt text for the client logo/);
  assert.deepEqual(validateClient({ name: "Amul", logoUrl: "/clients/amul.svg", altText: "Amul logo" }), []);
  has(validateClient({ name: "Amul", logoUrl: "/clients/amul.svg", altText: "amul.svg" }), /looks like a file name/);
  assert.deepEqual(validateClient({ name: "Text only client" }), []);
  has(validateClient({ name: "X", websiteUrl: "amul.com" }), /full web address/);
  has(validateClient({ name: " " }, { full: true }), /Client name cannot be left empty/);
});
check("testimonial: name and quote required, rating a whole number 1-5", () => {
  assert.deepEqual(validateTestimonial({ personName: "A. Kumar", quote: "Good work.", rating: 5 }, { full: true }), []);
  has(validateTestimonial({ personName: "A", quote: "  " }), /quote cannot be left empty/);
  for (const rating of [0, 6, 4.5, -1]) has(validateTestimonial({ rating }), /rating must be a whole number from 1 to 5/);
  assert.deepEqual(validateTestimonial({ rating: 1 }), []);
});
check("gallery: alt text is required and cannot be just the file name", () => {
  has(validateGalleryItem({ mediaUrl: "https://blob/x/rig.jpg", altText: "" }), /Add alt text for this photo/);
  has(validateGalleryItem({ mediaUrl: "https://blob/x/rig.jpg", altText: "rig.jpg" }), /just a file name/);
  has(validateGalleryItem({ mediaUrl: "https://blob/x/rig.jpg", altText: "IMG_1024" }), /just a file name/);
  assert.deepEqual(validateGalleryItem({ mediaUrl: "https://blob/x/rig.jpg", altText: "Crew lowering casing into a borewell" }), []);
  assert.deepEqual(validateGalleryItem({ caption: "x" }, { altRequired: false }), []);
});
check("settings and search settings: formats and lengths", () => {
  assert.deepEqual(validateSettings({ email: "stbs2025@gmail.com", phone: "+91 98120 03001", pinCode: "131001", websiteUrl: "https://www.stbs.in" }), []);
  has(validateSettings({ email: "nope" }), /not a valid email/);
  has(validateSettings({ phone: "abc" }), /not a valid phone/);
  has(validateSettings({ pinCode: "1310" }), /6-digit PIN/);
  has(validateSettings({ websiteUrl: "stbs.in" }), /full web address/);
  assert.deepEqual(validateSettings({ phone: null, email: null }), []);
  has(validateSeo({ globalTitle: "x".repeat(71) }), /Search title is 71 characters/);
  has(validateSeo({ globalDescription: "x".repeat(171) }), /Search description is 171 characters/);
  has(validateSeo({ canonicalUrl: "www.stbs.in" }), /full web address/);
  assert.deepEqual(validateSeo({ globalTitle: "ok", structuredData: { a: 1 } }), []);
});
check("navigation items need a label and a valid link", () => {
  has(validateNavItem({ label: "", url: "/x" }, { full: true }), /Menu label cannot be left empty/);
  has(validateNavItem({ label: "Home", url: "javascript:x" }), /Menu link is not a valid link/);
  assert.deepEqual(validateNavItem({ label: "Contact", url: "/contact" }, { full: true }), []);
});
check("multiple problems are all reported, without duplicates", () => {
  const msgs = validateSectionContent("cta", { heading: "", ctaText: "", ctaUrl: "bad url" });
  assert.ok(msgs.length >= 3);
  assert.equal(new Set(msgs).size, msgs.length);
});
check("the site's own default content passes validation (nothing that exists today starts failing)", () => {
  assert.deepEqual(validateSectionContent("hero", { ...HOME_HERO }), []);
  assert.deepEqual(validateSectionContent("stats", { items: [...HOME_STATS] }), []);
  assert.deepEqual(validateSectionContent("sectors", { ...HOME_SECTORS, sectors: [...HOME_SECTORS.sectors] }), []);
  assert.deepEqual(validateSectionContent("services", { ...HOME_SERVICES }), []);
  assert.deepEqual(validateSectionContent("cta", { ...HOME_CTA }), []);
  for (const sections of [ABOUT_SECTIONS, CLIENTS_SECTIONS, CONTACT_SECTIONS, QUOTE_SECTIONS]) {
    for (const sec of sections) assert.deepEqual(validateSectionContent(sec.type, sec.content), [], `${sec.type} / ${sec.name}`);
  }
});
check("the built-in service pages pass service validation", () => {
  for (const sp of SERVICE_PAGES) {
    assert.deepEqual(validateService({ title: sp.title, slug: sp.href.replace(/^\//, "") }, { full: true }), [], sp.title);
  }
});

console.log(`\n${passed} checks passed`);
