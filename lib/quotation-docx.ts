import {
  AlignmentType, BorderStyle, Document, Footer, Header, ImageRun, Packer, PageNumber, Paragraph, ShadingType, Table, TableLayoutType, TableRow, TableCell, TextRun, VerticalAlign, WidthType,
} from "docx";
import { quotation as fixed } from "@/components/quotation/quotation-data";
import { calcAmount, calcTotals, formatINR, getValidItems, hasDiscount, serviceLabel, type QuotationState } from "@/components/quotation/quotation-model";
import { businessInfo } from "@/lib/company";
import { amountInWords } from "@/lib/amount-in-words";
import { logoFor } from "@/lib/website/client-logos";

/**
 * Editable Word version of the quotation. It mirrors the structure and wording of the PDF template
 * (cover letter, company profile, terms, price offer) but Word lays the pages out itself, so it is a
 * close match rather than pixel-identical. Not reproduced: the side panel artwork, the page watermark
 * and the brand fonts (Word falls back to Calibri). Totals, discount, GST and amount in words come from
 * the same functions the PDF uses (calcTotals, amountInWords).
 */
export type DocxLogo = { name: string; png: Buffer; width: number; height: number };
export type DocxAssets = { banner?: Buffer; logos?: DocxLogo[] };

const GOLD = "BF9141";
const INK = "171A1B";
const MUTED = "555B57";
const LINE = "D4CBBC";
const CREAM = "F5F0E7";
const FONT = "Calibri";

// Wording that also appears in the PDF template. test-quotation-docx.ts checks these still match it.
export const LETTER = {
  salutation: "Dear Sir,",
  intro: "We are pleased to have the opportunity to serve you and thank you for inviting us to submit our quotation for the above-mentioned work.",
  annexureLead: "The following annexures are attached for your reference.",
  annexures: ["Annexure-I · Company Profile", "Annexure-II · Terms and Conditions", "Annexure-III · Price Offer for Subject Job"],
  close: "We trust that the above proposal meets your requirements. We thank you for the opportunity and assure you of our best services at all times.",
  yoursTruly: "Yours Truly,",
  forCompany: "(For SAINI TUBEWELL BORING SERVICE)",
  signer: "Rajesh Saini",
  signerRole: "Managing Director",
} as const;

export const GLANCE = [["34+", "Years Experience"], ["500+", "Projects Delivered"], ["100%", "ISI Certified"], ["24/7", "Site Support"]] as const;

const run = (text: string, o: { bold?: boolean; size?: number; color?: string; italics?: boolean; caps?: boolean; spacing?: number } = {}) =>
  new TextRun({ text, font: FONT, bold: o.bold, size: o.size, color: o.color, italics: o.italics, allCaps: o.caps, characterSpacing: o.spacing });

const para = (text: string, o: { bold?: boolean; size?: number; color?: string; after?: number; before?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; caps?: boolean; spacing?: number } = {}) =>
  new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 100, before: o.before ?? 0, line: 276 }, children: [run(text, o)] });

const label = (text: string) => para(text, { bold: true, size: 17, color: GOLD, caps: true, spacing: 30, after: 60, before: 200 });

const heading = (kicker: string, title: string, first = false) => [
  new Paragraph({ pageBreakBefore: !first, spacing: { after: 40 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } }, children: [run(kicker, { bold: true, size: 17, color: GOLD, caps: true, spacing: 40 })] }),
  new Paragraph({ spacing: { before: 120, after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: INK, space: 6 } }, children: [run(title, { bold: true, size: 44, color: INK, caps: true, spacing: 20 })] }),
];

const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const noBorders = { top: none, bottom: none, left: none, right: none } as const;
const hair = { style: BorderStyle.SINGLE, size: 4, color: LINE } as const;

function cell(children: Paragraph[], width: number, o: { fill?: string; borders?: object; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; vAlign?: "top" | "center" | "bottom"; span?: number } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    columnSpan: o.span,
    verticalAlign: o.vAlign ?? VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
    borders: (o.borders as never) ?? noBorders,
    children,
  });
}

const cellText = (text: string, o: { bold?: boolean; color?: string; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
  new Paragraph({ alignment: o.align, spacing: { after: 0 }, children: [run(text, { size: o.size ?? 18, bold: o.bold, color: o.color })] });

const pad2 = (n: number) => String(n).padStart(2, "0");

function pngSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 24 || buf.toString("latin1", 1, 4) !== "PNG") return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

export async function buildQuotationDocx(q: QuotationState, assets: DocxAssets = {}): Promise<Buffer> {
  const service = serviceLabel(q);
  const items = getValidItems(q.items);
  const totals = calcTotals(q);
  const subject = q.subject || `Price Offer for ${service}`;
  const gstRate = Number(q.gstRate ?? 0);
  const terms = fixed.terms.filter(([t]: readonly string[]) => !(q.gstEnabled && t === "Taxes"));

  const clientLines = [
    q.client.companyName, q.client.contactPerson, q.client.addressLine1, q.client.addressLine2,
    [q.client.city, q.client.state, q.client.pinCode].filter(Boolean).join(" – "), q.client.phone, q.client.email,
    q.client.gstin ? `GSTIN: ${q.client.gstin}` : "",
  ].filter(Boolean);

  const children: (Paragraph | Table)[] = [];

  /* ---- Page 1: cover letter ---- */
  if (assets.banner) {
    const size = pngSize(assets.banner);
    const width = 480;
    children.push(new Paragraph({ spacing: { after: 100 }, children: [new ImageRun({ type: "png", data: assets.banner, transformation: { width, height: size ? Math.round((width * size.h) / size.w) : 130 } })] }));
  }
  children.push(...heading("Quotation / Cover Letter", "Commercial Quotation", true));
  children.push(para(service.toUpperCase(), { bold: true, size: 20, spacing: 30, after: 160 }));

  const metaW = [3300, 3300, 3300];
  children.push(new Table({
    width: { size: 9900, type: WidthType.DXA }, columnWidths: metaW, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [["REFERENCE", q.quotationReference], ["DATE", q.quotationDate], ["VALIDITY", q.validity]].map(([k, v], i) =>
      cell([para(k, { bold: true, size: 16, color: GOLD, spacing: 30, after: 40 }), para(v, { bold: true, size: 21, after: 0 })], metaW[i], { borders: { top: hair, bottom: hair, left: none, right: none } })) })],
  }));

  const halfW = [4950, 4950];
  const preparedBy = ["SAINI TUBEWELL BORING SERVICE", `${LETTER.signer} · ${LETTER.signerRole}`, "9812003001 / 7988024114", "stbs2025@gmail.com", ...(q.gstEnabled && businessInfo.gstin ? [`GSTIN: ${businessInfo.gstin}`] : [])];
  children.push(new Table({
    width: { size: 9900, type: WidthType.DXA }, columnWidths: halfW, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [
      cell([para("PREPARED FOR", { bold: true, size: 16, color: GOLD, spacing: 30, after: 40, before: 100 }), ...clientLines.map((l, i) => para(l, { bold: i === 0, size: i === 0 ? 22 : 19, after: 20 }))], halfW[0], { vAlign: VerticalAlign.TOP }),
      cell([para("PREPARED BY", { bold: true, size: 16, color: GOLD, spacing: 30, after: 40, before: 100 }), ...preparedBy.map((l, i) => para(l, { bold: i === 0, size: i === 0 ? 22 : 19, after: 20 }))], halfW[1], { vAlign: VerticalAlign.TOP }),
    ] })],
  }));

  children.push(label("Subject"), new Paragraph({ spacing: { after: 200 }, border: { left: { style: BorderStyle.SINGLE, size: 24, color: GOLD, space: 8 } }, children: [run(subject, { bold: true, size: 26 })] }));
  children.push(para(LETTER.salutation, { before: 120 }), para(LETTER.intro), para(LETTER.annexureLead));
  for (const a of LETTER.annexures) children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [run(a, { size: 21 })] }));
  children.push(para(LETTER.close, { before: 160 }), para(LETTER.yoursTruly, { before: 80, after: 0 }), para(LETTER.forCompany, { bold: true, after: 60 }), para(LETTER.signer, { bold: true, size: 24, before: 120, after: 0 }), para(LETTER.signerRole, { size: 18, color: MUTED }));

  /* ---- Page 2: company profile ---- */
  children.push(...heading("Annexure I", "Company Profile"));
  children.push(label("About Us"), para(fixed.about));
  children.push(label("Mission"), para(fixed.mission), label("Vision"), para(fixed.vision));
  children.push(label("Core Capabilities / Distinctive Qualities"));
  for (const c of fixed.capabilities) children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [run(c, { size: 21 })] }));
  children.push(label("Our Esteemed Clients"));

  const logoNames = new Set((assets.logos ?? []).map((l) => l.name));
  if (assets.logos?.length) {
    const cols = 4;
    const w = 2475;
    const rows: TableRow[] = [];
    for (let i = 0; i < assets.logos.length; i += cols) {
      const slice = assets.logos.slice(i, i + cols);
      rows.push(new TableRow({ height: { value: 760, rule: "atLeast" }, children: Array.from({ length: cols }, (_, k) => {
        const l = slice[k];
        const paragraph = l
          ? new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new ImageRun({ type: "png", data: l.png, transformation: { width: l.width, height: l.height }, altText: { title: l.name, description: `${l.name} logo`, name: l.name } })] })
          : cellText("");
        return cell([paragraph], w, { borders: { top: hair, bottom: hair, left: hair, right: hair } });
      }) }));
    }
    children.push(new Table({ width: { size: 9900, type: WidthType.DXA }, columnWidths: Array(cols).fill(w), layout: TableLayoutType.FIXED, rows }));
    children.push(para("", { after: 80 }));
  }
  const textClients = fixed.clients.filter((n: string) => !(logoFor(n) && logoNames.has(n)));
  for (let i = 0; i < textClients.length; i += 2) {
    const pair = textClients.slice(i, i + 2);
    children.push(new Table({ width: { size: 9900, type: WidthType.DXA }, columnWidths: halfW, layout: TableLayoutType.FIXED, rows: [new TableRow({ children: [0, 1].map((k) => cell([cellText(pair[k] ? `◆  ${pair[k]}` : "", { size: 18, color: MUTED })], halfW[k], { borders: { bottom: hair, top: none, left: none, right: none } })) })] }));
  }

  /* ---- Page 3: terms ---- */
  children.push(...heading("Annexure II", "Terms & Conditions"));
  terms.forEach(([t, d]: readonly string[], i: number) => {
    children.push(new Paragraph({ spacing: { before: 160, after: 20 }, keepNext: true, children: [run(`${pad2(i + 1)}  `, { bold: true, size: 26, color: GOLD }), run(t.toUpperCase(), { bold: true, size: 19, spacing: 20 })] }));
    children.push(para(d, { after: 80 }));
  });
  const gw = [2475, 2475, 2475, 2475];
  children.push(para("AT A GLANCE", { bold: true, size: 17, color: "FFFFFF", spacing: 40, before: 300, after: 0 }));
  children.push(new Table({ width: { size: 9900, type: WidthType.DXA }, columnWidths: gw, layout: TableLayoutType.FIXED, rows: [new TableRow({ children: GLANCE.map(([n, l], i) =>
    cell([para(n, { bold: true, size: 40, color: GOLD, after: 0 }), para(l, { size: 17, color: "FFFFFF", after: 0 })], gw[i], { fill: INK })) })] }));

  /* ---- Page 4+: price offer (Word paginates; the header row repeats on every page) ---- */
  children.push(...heading("Annexure III", "Price Offer"));
  children.push(para(service, { bold: true, size: 20, spacing: 20, after: 40 }), para(`Commercial offer for the subject job · Reference ${q.quotationReference}`, { size: 17, color: MUTED, after: 160 }));

  const pw = [850, 3650, 900, 900, 1600, 2000];
  const head = new TableRow({ tableHeader: true, cantSplit: true, children: ["SR. NO.", "DESCRIPTION", "UNIT", "QTY", "RATE", "AMOUNT"].map((h, i) =>
    cell([cellText(h, { bold: true, color: "F5F0E7", size: 16, align: i >= 3 ? AlignmentType.RIGHT : undefined })], pw[i], { fill: INK })) });
  const body = items.map((item, n) => new TableRow({ cantSplit: true, children: [
    cell([cellText(pad2(n + 1))], pw[0], { borders: { bottom: hair, top: none, left: none, right: none } }),
    cell([cellText(item.description)], pw[1], { borders: { bottom: hair, top: none, left: none, right: none } }),
    cell([cellText(item.unit)], pw[2], { borders: { bottom: hair, top: none, left: none, right: none } }),
    cell([cellText(String(item.quantity), { align: AlignmentType.RIGHT })], pw[3], { borders: { bottom: hair, top: none, left: none, right: none } }),
    cell([cellText(formatINR(item.rate), { align: AlignmentType.RIGHT })], pw[4], { borders: { bottom: hair, top: none, left: none, right: none } }),
    cell([cellText(formatINR(calcAmount(item.quantity, item.rate)), { align: AlignmentType.RIGHT })], pw[5], { borders: { bottom: hair, top: none, left: none, right: none } }),
  ] }));

  const summary: [string, string][] = [];
  if (hasDiscount(q, totals) || q.gstEnabled) summary.push(["SUBTOTAL", formatINR(totals.subtotal)]);
  if (hasDiscount(q, totals)) summary.push([q.discountType === "PERCENT" ? `DISCOUNT (${Number(q.discountValue)}%)` : "DISCOUNT", `−${formatINR(totals.discount)}`]);
  if (hasDiscount(q, totals) && q.gstEnabled) summary.push(["TAXABLE VALUE", formatINR(totals.taxable)]);
  if (q.gstEnabled && q.gstMode === "IGST") summary.push([`IGST @ ${gstRate}%`, formatINR(totals.igst)]);
  if (q.gstEnabled && q.gstMode !== "IGST") summary.push([`CGST @ ${gstRate / 2}%`, formatINR(totals.cgst)], [`SGST @ ${gstRate / 2}%`, formatINR(totals.sgst)]);

  const totalRows = [
    ...summary.map(([k, v]) => new TableRow({ cantSplit: true, children: [
      cell([cellText(k, { bold: true, size: 17 })], pw.slice(0, 5).reduce((a, b) => a + b, 0), { span: 5 }),
      cell([cellText(v, { bold: true, size: 17, align: AlignmentType.RIGHT })], pw[5]),
    ] })),
    new TableRow({ cantSplit: true, children: [
      cell([cellText("FINAL TOTAL", { bold: true, size: 20 })], pw.slice(0, 5).reduce((a, b) => a + b, 0), { span: 5, borders: { top: { style: BorderStyle.SINGLE, size: 12, color: INK }, bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD }, left: none, right: none } }),
      cell([cellText(formatINR(totals.grandTotal), { bold: true, size: 20, color: "754D16", align: AlignmentType.RIGHT })], pw[5], { borders: { top: { style: BorderStyle.SINGLE, size: 12, color: INK }, bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD }, left: none, right: none } }),
    ] }),
  ];
  if (items.length) {
    children.push(new Table({ width: { size: 9900, type: WidthType.DXA }, columnWidths: pw, layout: TableLayoutType.FIXED, rows: [head, ...body, ...totalRows] }));
    children.push(para(amountInWords(totals.grandTotal), { bold: true, size: 22, before: 200 }));
  } else {
    children.push(para("No items have been added to this quotation yet."));
  }

  const doc = new Document({
    creator: "Saini Tubewell Boring Service",
    title: `Quotation ${q.quotationReference}`,
    description: subject,
    background: { color: CREAM },
    styles: { default: { document: { run: { font: FONT, size: 21, color: INK } } } },
    sections: [{
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [run("SAINI TUBEWELL BORING SERVICE", { bold: true, size: 15, color: GOLD, spacing: 40 })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run(`${q.quotationReference}  ·  Page `, { size: 15, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 15, color: MUTED }), run(" of ", { size: 15, color: MUTED }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 15, color: MUTED })] })] }) },
      children,
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

