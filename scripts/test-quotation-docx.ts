import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import sharp from "sharp";
import { buildQuotationDocx, GLANCE, LETTER } from "../lib/quotation-docx";
import { clientSlug, quotationFilename, referenceForFilename } from "../lib/quotation-filename";
import { QUOTATION_FIXTURES } from "../lib/quotation-fixtures";
import { calcTotals, formatINR } from "../components/quotation/quotation-model";
import { amountInWords } from "../lib/amount-in-words";

let passed = 0;
async function check(label: string, fn: () => void | Promise<void>) { await fn(); passed++; console.log(`  ok  ${label}`); }

const xmlOf = async (buf: Buffer) => {
  const zip = await JSZip.loadAsync(buf);
  return { zip, doc: await zip.file("word/document.xml")!.async("string") };
};
const text = (xml: string) => xml.replace(/<w:tab\/>/g, " ").replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

(async () => {
  await check("filenames follow STBS-Quotation-{number}-{clientSlug}", () => {
    assert.equal(quotationFilename({ quotationReference: "STBS/2026-27/0142", client: { companyName: "Acme Pvt. Ltd." } }, "pdf"), "STBS-Quotation-2026-27-0142-acme-pvt-ltd.pdf");
    assert.equal(quotationFilename({ quotationReference: "STBS/2026/012", client: { companyName: "Ashoka University" } }, "docx"), "STBS-Quotation-2026-012-ashoka-university.docx");
  });
  await check("client slugs are safe: accents, symbols, empty and very long names", () => {
    assert.equal(clientSlug("Café Ünïcode & Sons"), "cafe-unicode-and-sons");
    assert.equal(clientSlug("///"), "client");
    assert.equal(clientSlug(""), "client");
    assert.ok(clientSlug("x".repeat(200)).length <= 40);
    assert.doesNotMatch(clientSlug("a/b\c:d*e?f\"g<h>i|j"), /[\/:*?"<>|]/);
    assert.equal(referenceForFilename(""), "draft");
  });

  const single = await buildQuotationDocx(QUOTATION_FIXTURES["single-item"]);
  await check("output is a real Word package (zip with word/document.xml)", async () => {
    assert.equal(single.subarray(0, 2).toString("latin1"), "PK");
    const { zip, doc } = await xmlOf(single);
    assert.ok(zip.file("[Content_Types].xml") && zip.file("word/document.xml"));
    assert.match(doc, /<w:document/);
  });
  await check("cover letter, annexures, signature and the fixed wording are all present", async () => {
    const t = text((await xmlOf(single)).doc);
    for (const s of [LETTER.salutation, LETTER.intro, LETTER.annexureLead, ...LETTER.annexures, LETTER.close, LETTER.forCompany, LETTER.signer, "Commercial Quotation", "Sample Client Pvt. Ltd.", "FIXTURE/SINGLE/001"]) assert.ok(t.includes(s), `missing: ${s}`);
  });
  await check("fixed wording matches the PDF template source (no drift)", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "components/quotation/QuotationDocument.tsx"), "utf8");
    for (const s of [LETTER.salutation.replace(",", ""), LETTER.intro, LETTER.annexureLead, LETTER.close, LETTER.signer, LETTER.signerRole, ...LETTER.annexures]) assert.ok(src.includes(s), `template no longer says: ${s}`);
    for (const [n, l] of GLANCE) { assert.ok(src.includes(`<b>${n}</b>`) && src.includes(`<span>${l}</span>`), `glance box drifted: ${n} ${l}`); }
  });
  await check("price table: header row repeats across pages and rows are not split", async () => {
    const { doc } = await xmlOf(single);
    assert.match(doc, /<w:tblHeader/);
    assert.match(doc, /<w:cantSplit/);
    assert.ok(text(doc).includes("Drilling of 8 inch borewell"));
  });
  await check("footer carries the reference and page numbers", async () => {
    const { zip } = await xmlOf(single);
    const footers = await Promise.all(Object.keys(zip.files).filter((f) => /word\/footer\d*\.xml/.test(f)).map((f) => zip.file(f)!.async("string")));
    const all = footers.join("");
    assert.match(all, /PAGE/); assert.match(all, /NUMPAGES/);
    assert.ok(text(all).includes("FIXTURE/SINGLE/001"));
  });
  await check("no discount and GST off: only FINAL TOTAL, plus the amount in words", async () => {
    const t = text((await xmlOf(single)).doc);
    const totals = calcTotals(QUOTATION_FIXTURES["single-item"]);
    assert.ok(t.includes("FINAL TOTAL") && t.includes(formatINR(totals.grandTotal)));
    assert.ok(t.includes(amountInWords(totals.grandTotal)));
    assert.ok(!t.includes("SUBTOTAL") && !t.includes("CGST") && !t.includes("IGST") && !t.includes("DISCOUNT"));
  });
  await check("GST (CGST+SGST): tax rows, both GSTINs, and the Taxes term removed", async () => {
    const q = QUOTATION_FIXTURES["gst-cgst-sgst"];
    const t = text((await xmlOf(await buildQuotationDocx(q))).doc);
    const totals = calcTotals(q);
    for (const s of ["SUBTOTAL", "CGST @ 9%", "SGST @ 9%", formatINR(totals.cgst), formatINR(totals.grandTotal), "GSTIN: 06AWTPS2732A1ZI", "GSTIN: 06ABCDE1234F1Z5", amountInWords(totals.grandTotal)]) assert.ok(t.includes(s), `missing: ${s}`);
    assert.ok(!t.includes("18% GST shall be charged extra"));
    assert.ok(!t.includes("IGST"));
  });
  await check("GST off keeps the Taxes term and hides both GSTINs", async () => {
    const t = text((await xmlOf(single)).doc);
    assert.ok(t.includes("18% GST shall be charged extra"));
    assert.ok(!t.includes("06AWTPS2732A1ZI"));
  });
  await check("IGST with a percentage discount shows discount, taxable value and one IGST line", async () => {
    const q = QUOTATION_FIXTURES["gst-igst-discount-percent"];
    const t = text((await xmlOf(await buildQuotationDocx(q))).doc);
    for (const s of ["DISCOUNT (5%)", "TAXABLE VALUE", "IGST @ 18%"]) assert.ok(t.includes(s), `missing: ${s}`);
    assert.ok(!t.includes("CGST"));
  });
  await check("a 30-item quotation exports every row in order", async () => {
    const q = QUOTATION_FIXTURES["thirty-items"];
    const t = text((await xmlOf(await buildQuotationDocx(q))).doc);
    for (let i = 1; i <= 30; i++) assert.ok(t.includes(`Line item ${i} —`), `row ${i} missing`);
    assert.ok(t.indexOf("Line item 2 —") < t.indexOf("Line item 29 —"));
  });
  await check("special characters are escaped, not injected as markup", async () => {
    const q = { ...QUOTATION_FIXTURES["single-item"], client: { ...QUOTATION_FIXTURES["single-item"].client, companyName: "A & B <Traders> \"Ltd\"" } };
    const { doc } = await xmlOf(await buildQuotationDocx(q));
    assert.ok(!doc.includes("<Traders>"));
    assert.ok(text(doc).includes('A & B <Traders> "Ltd"'));
  });
  await check("logos and banner embed as images when supplied, and the export still works without them", async () => {
    const png = await sharp({ create: { width: 400, height: 120, channels: 4, background: "#ff0000" } }).png().toBuffer();
    const withImages = await buildQuotationDocx(QUOTATION_FIXTURES["single-item"], { banner: png, logos: [{ name: "Ashoka University", png, width: 100, height: 30 }] });
    const { zip } = await xmlOf(withImages);
    assert.ok(Object.keys(zip.files).some((f) => f.startsWith("word/media/")));
    assert.ok(withImages.length > single.length);
    assert.equal((await xmlOf(single)).zip.file(/word\/media\//).length, 0);
  });

  console.log(`\n${passed} checks passed`);
})().catch((e) => { console.error(e); process.exit(1); });
