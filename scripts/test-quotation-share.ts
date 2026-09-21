import assert from "node:assert/strict";
import { buildShareMessage, defaultFileBase, fileNameSuggestions, friendlyCompany, mailtoHref, sanitizeFileBase, shareSubjectFrom, shareTitle, whatsappHref, whatsappNumber, withPdfExtension, type ShareSubject } from "../components/quotation/share/share-model";
import { QUOTATION_FIXTURES } from "../lib/quotation-fixtures";
import { CLASSIC_CONTENT } from "../components/quotation/template/template-model";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }

const subject: ShareSubject = {
  reference: "STBS/2026/084", clientName: "Acme Industries Pvt Ltd", contact: "Mr. Sharma", phone: "98120 03001", email: "purchase@acme.example",
  service: "Borewell Construction", total: 123456, validity: "15 days from date of submission",
  company: "Saini Tubewell Boring Service", signatory: "Rajesh Saini", signatoryTitle: "Managing Director", phones: "9812003001 / 7988024114",
};

/* ---------- the phone number ---------- */

check("a 10-digit Indian mobile gets the country code, however it is written", () => {
  for (const raw of ["9812003001", "98120 03001", "98120-03001", "+91 98120 03001", "91 9812003001", "09812003001", " (98120) 03001 "]) assert.equal(whatsappNumber(raw), "919812003001", raw);
});
check("numbers that already carry another country code are kept", () => {
  assert.equal(whatsappNumber("+44 7911 123456"), "447911123456");
  assert.equal(whatsappNumber("+971 50 123 4567"), "971501234567");
});
check("anything that is not a plausible mobile number is refused, so a typo never opens a stranger's chat", () => {
  for (const bad of [undefined, null, "", "  ", "abc", "12345", "0123456789", "5812003001", "98120030", "1".repeat(20), "022-2345-6789"]) assert.equal(whatsappNumber(bad as string), null, String(bad));
});
check("the WhatsApp link goes to the client when the number is usable, and to a chat picker when it is not", () => {
  assert.match(whatsappHref("9812003001", "hi"), /^https:\/\/wa\.me\/919812003001\?text=hi$/);
  assert.match(whatsappHref("garbage", "hi"), /^https:\/\/wa\.me\/\?text=hi$/);
  assert.match(whatsappHref(undefined, "hi"), /^https:\/\/wa\.me\/\?text=hi$/);
});
check("the message is percent-encoded so &, #, ?, ₹ and line breaks survive the link", () => {
  const href = whatsappHref("9812003001", "A&B #1 ₹5?\nnext");
  assert.ok(!href.slice(href.indexOf("?text=") + 6).match(/[&# ?\n]/), "no raw reserved characters after ?text=");
  assert.equal(decodeURIComponent(href.split("?text=")[1]), "A&B #1 ₹5?\nnext");
});

/* ---------- mail ---------- */

check("the mail link carries recipient, subject and body, with CRLF line breaks", () => {
  const href = mailtoHref("purchase@acme.example", "Quotation X", "line one\nline two");
  assert.ok(href.startsWith("mailto:purchase@acme.example?subject=Quotation%20X&body="));
  assert.equal(decodeURIComponent(href.split("&body=")[1]), "line one\r\nline two");
});
check("a bad or missing address leaves the recipient blank rather than sending to something odd", () => {
  for (const bad of [undefined, null, "", "nope", "a@b", "a@example.com,b@example.com", "a b@example.com", "<a@example.com>"]) assert.ok(mailtoHref(bad as string, "s", "b").startsWith("mailto:?subject="), String(bad));
});
check("an address cannot smuggle extra headers into the mail link", () => {
  const href = mailtoHref("a@example.com?bcc=evil@example.com", "s", "b");
  assert.ok(href.startsWith("mailto:?subject="), href.slice(0, 40));
});

/* ---------- the message ---------- */

check("the message greets the contact, names the quotation and service, and states total and validity", () => {
  const m = buildShareMessage(subject);
  assert.match(m, /^Dear Mr\. Sharma,/);
  assert.match(m, /quotation STBS\/2026\/084 for Borewell Construction\./);
  assert.match(m, /Total: ₹1,23,456\.00/);
  assert.match(m, /Valid: 15 days from date of submission/);
  assert.match(m, /Regards,\nRajesh Saini, Managing Director\nSaini Tubewell Boring Service\n9812003001 \/ 7988024114$/);
});
check("it falls back to the company name, then a neutral greeting, when there is no contact person", () => {
  assert.match(buildShareMessage({ ...subject, contact: undefined }), /^Dear Acme Industries Pvt Ltd,/);
  assert.match(buildShareMessage({ ...subject, contact: undefined, clientName: "" }), /^Dear Sir\/Madam,/);
});
check("a quotation with no number yet, no total or no validity still reads properly", () => {
  const m = buildShareMessage({ ...subject, reference: "", total: 0, validity: undefined });
  assert.match(m, /our quotation for Borewell Construction\./);
  assert.ok(!m.includes("Total:") && !m.includes("Valid:") && !m.includes("undefined") && !m.includes("NaN"));
});
check("the title used as the email subject includes the number and service", () => {
  assert.equal(shareTitle(subject), "Quotation STBS/2026/084 for Borewell Construction - Saini Tubewell Boring Service");
  assert.equal(shareTitle({ ...subject, reference: "", service: undefined }), "Quotation - Saini Tubewell Boring Service");
});
check("the letterhead's capitals become normal case in a message, and mixed-case names are left alone", () => {
  assert.equal(friendlyCompany("SAINI TUBEWELL BORING SERVICE"), "Saini Tubewell Boring Service");
  assert.equal(friendlyCompany("A-ONE TEX (INDIA) & CO"), "A-One Tex (India) & Co");
  assert.equal(friendlyCompany("Saini Tubewell"), "Saini Tubewell");
  assert.equal(friendlyCompany("  "), "");
});

/* ---------- the file name ---------- */

const FALLBACK = "STBS-Quotation-2026-27-0084-acme";

check("a typed name is kept as it is, spaces and capitals included", () => {
  assert.equal(sanitizeFileBase("Acme Industries - Borewell Quotation", FALLBACK), "Acme Industries - Borewell Quotation");
});
check("characters Windows and macOS refuse are replaced, not left to break the download", () => {
  assert.equal(sanitizeFileBase('a/b\\c:d*e?f"g<h>i|j', FALLBACK), "a-b-c-d-e-f-g-h-i-j");
  assert.equal(sanitizeFileBase("Quotation 12/05/2026", FALLBACK), "Quotation 12-05-2026");
});
check("control characters and line breaks are dropped or flattened", () => {
  assert.equal(sanitizeFileBase("a\u0000b\u0007c\u007fd", FALLBACK), "abcd");
  assert.equal(sanitizeFileBase("first\nsecond\tthird", FALLBACK), "first second third");
});
check("a typed .pdf is not doubled, however many times or in what case", () => {
  assert.equal(sanitizeFileBase("Offer.pdf", FALLBACK), "Offer");
  assert.equal(sanitizeFileBase("Offer.PDF.pdf", FALLBACK), "Offer");
  assert.equal(withPdfExtension(sanitizeFileBase("Offer.pdf", FALLBACK)), "Offer.pdf");
});
check("leading and trailing dots, spaces and dashes are trimmed (a name ending in a dot fails on Windows)", () => {
  assert.equal(sanitizeFileBase("  ..name.. ", FALLBACK), "name");
  assert.equal(sanitizeFileBase("--name--", FALLBACK), "name");
  assert.equal(sanitizeFileBase("name .", FALLBACK), "name");
});
check("an empty or unusable name falls back to the default, so the file is never nameless", () => {
  for (const bad of ["", "   ", "...", "---", ".pdf", "///", "\u0000\u0001"]) assert.equal(sanitizeFileBase(bad, FALLBACK), FALLBACK, JSON.stringify(bad));
  assert.equal(sanitizeFileBase(undefined as unknown as string, FALLBACK), FALLBACK);
});
check("names Windows reserves are made safe", () => {
  for (const r of ["CON", "prn", "Aux", "NUL", "COM1", "lpt9"]) assert.equal(sanitizeFileBase(r, FALLBACK), `_${r}`);
  assert.equal(sanitizeFileBase("CONSTRUCTION", FALLBACK), "CONSTRUCTION");
});
check("letters from other languages and emoji survive, and the length limit counts characters, not bytes", () => {
  assert.equal(sanitizeFileBase("सैनी ट्यूबवेल प्रस्ताव", FALLBACK), "सैनी ट्यूबवेल प्रस्ताव");
  const long = sanitizeFileBase("क".repeat(300), FALLBACK);
  assert.equal(Array.from(long).length, 100);
  assert.equal(Array.from(sanitizeFileBase("😀".repeat(200), FALLBACK)).length, 100);
});
check("the default name is the one the quotation has always been saved as", () => {
  assert.equal(defaultFileBase({ reference: "STBS/2026/084", clientName: "Acme Industries Pvt Ltd" }), "STBS-Quotation-2026-084-acme-industries-pvt-ltd");
  assert.equal(defaultFileBase({ reference: "", clientName: "" }), "STBS-Quotation-draft-client");
});
check("suggestions start with the default, are unique, safe, and at most four", () => {
  const s = fileNameSuggestions(subject);
  assert.equal(s[0], defaultFileBase(subject));
  assert.ok(s.length >= 2 && s.length <= 4);
  assert.equal(new Set(s.map((x) => x.toLowerCase())).size, s.length);
  for (const x of s) assert.equal(sanitizeFileBase(x, "x"), x, `${x} is already clean`);
  assert.ok(s.some((x) => x.startsWith("Acme Industries Pvt Ltd - Quotation")));
});
check("suggestions cope with a quotation that has no number or client yet", () => {
  const s = fileNameSuggestions({ reference: "", clientName: "", service: undefined });
  assert.deepEqual(s, ["STBS-Quotation-draft-client"]);
});

/* ---------- from a real quotation ---------- */

check("the subject built from a fixture quotation carries its real client, service and grand total", () => {
  const q = QUOTATION_FIXTURES["single-item"];
  const s = shareSubjectFrom(q);
  assert.equal(s.clientName, "Sample Client Pvt. Ltd.");
  assert.equal(s.service, "Borewell Construction");
  assert.equal(s.total, 125000);
  assert.equal(s.company, "Saini Tubewell Boring Service");
});
check("GST is included in the total the message states", () => {
  const q = { ...QUOTATION_FIXTURES["single-item"], gstEnabled: true, gstRate: 18, gstMode: "CGST_SGST" as const };
  assert.equal(shareSubjectFrom(q).total, 147500);
});
check("a supplied grand total wins, for list rows that do not carry the items", () => {
  assert.equal(shareSubjectFrom({ ...QUOTATION_FIXTURES["single-item"], items: [] }, 999).total, 999);
});
check("the signature follows the quotation's template, not a fixed name", () => {
  const content = JSON.parse(JSON.stringify(CLASSIC_CONTENT));
  content.letter.signatoryName = "Someone Else"; content.letter.signatoryTitle = "Partner"; content.preparedBy.company = "OTHER TRADING CO";
  const s = shareSubjectFrom({ ...QUOTATION_FIXTURES["single-item"], template: { id: "t", name: "T", layout: "classic", content } });
  assert.equal(s.signatory, "Someone Else");
  assert.equal(s.company, "Other Trading Co");
  assert.match(buildShareMessage(s), /Regards,\nSomeone Else, Partner\nOther Trading Co/);
});

console.log(`\n${passed} checks passed`);
