/**
 * Letters and the letterhead: numbering, validation, page breaks, and the Word letterpad.
 *   npm run test:letter
 */
import assert from "node:assert/strict";
import { financialYearStart, formatLetterNumber, letterFileName, letterPages, letterSchema, nextLetterNumber, paragraphs } from "../lib/letter";
import { LETTER_FIXTURES } from "../lib/letter-fixtures";
import { buildLetterheadDocx } from "../lib/letterhead-docx";
import { company, businessInfo } from "../lib/company";
import { LETTERHEAD_NAME } from "../components/letterhead/Letterhead";

let passed = 0;
const check = async (name: string, fn: () => void | Promise<void>) => { await fn(); passed++; console.log(`  ok  ${name}`); };

(async () => {
  await check("letter numbers run per financial year: STBS/LTR/2026-27/001", () => {
    assert.equal(financialYearStart("2026-04-01"), 2026);
    assert.equal(financialYearStart("2027-03-31"), 2026);
    assert.equal(formatLetterNumber(2026, 1), "STBS/LTR/2026-27/001");
  });

  await check("the next number continues the year and ignores other years and titles", () => {
    const titles = ["STBS/LTR/2026-27/001 - A", "STBS/LTR/2026-27/007 - B", "STBS/LTR/2025-26/040 - C", "Bank details letter - SBI"];
    assert.equal(nextLetterNumber(titles, 2026), 8);
    assert.equal(nextLetterNumber(titles, 2027), 1);
  });

  await check("a letter needs who it is to, a subject and a body; the greeting and signature have defaults", () => {
    assert.equal(letterSchema.safeParse({ date: "2026-11-04", to: "", subject: "x", body: "y" }).success, false);
    const ok = letterSchema.parse({ date: "2026-11-04", to: "Someone", subject: "Hello", body: "Text" });
    assert.equal(ok.salutation, "Dear Sir/Madam,");
    assert.equal(ok.signatory, "Rajesh Saini");
    assert.equal(ok.withSignature, true);
  });

  await check("paragraphs split on empty lines, keeping single line breaks inside one", () => {
    assert.deepEqual(paragraphs("One\nstill one\n\n\nTwo\r\n\r\nThree"), ["One\nstill one", "Two", "Three"]);
  });

  await check("a short letter is one page; a long one breaks between paragraphs and keeps every one", () => {
    assert.equal(letterPages(LETTER_FIXTURES.short!).length, 1);
    const long = LETTER_FIXTURES.long!;
    const pages = letterPages(long);
    assert.ok(pages.length > 1);
    assert.equal(pages.flat().length, paragraphs(long.body).length);
  });

  await check("file names carry the number and subject, with nothing a file system refuses", () => {
    assert.equal(letterFileName({ reference: "STBS/LTR/2026-27/004", subject: "Rate: revision / 2026" }), "STBS Letter 004 - Rate_ revision _ 2026.pdf");
  });

  await check("the Word letterpad is a real .docx with the letterhead in its header and footer", async () => {
    const file = await buildLetterheadDocx();
    assert.equal(file.subarray(0, 2).toString(), "PK");
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(file);
    const names = Object.keys(zip.files);
    const header = await zip.file(names.find((n) => /word\/header\d*\.xml$/.test(n))!)!.async("string");
    const footer = await zip.file(names.find((n) => /word\/footer\d*\.xml$/.test(n))!)!.async("string");
    assert.ok(header.includes(LETTERHEAD_NAME), "letterpad name in header");
    assert.ok(!header.includes("Tubewell"), "the letterpad heading uses the Tyubwel spelling only");
    assert.ok(header.includes(businessInfo.gstin), "GSTIN in header");
    assert.ok(footer.includes(`Since ${company.established}`), "foot");
    assert.ok(names.some((n) => n.startsWith("word/media/")), "logo embedded");
  });

  console.log(`\n${passed} checks passed.`);
})().catch((e) => { console.error(e); process.exit(1); });
