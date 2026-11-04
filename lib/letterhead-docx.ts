/**
 * The letterpad as a Word file: the Classic letterhead in Word's own header and footer, so it repeats
 * on every page the owner types. Same facts and colours as components/letterhead/Letterhead.tsx.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType, BorderStyle, Document, Footer, Header, ImageRun, Packer, Paragraph, Table, TableCell, TableRow,
  TabStopType, TextRun, VerticalAlign, WidthType,
} from "docx";
import { businessInfo, company } from "@/lib/company";
import { LETTERHEAD_NAME, LETTERHEAD_SERVICES, LETTERHEAD_SITE, letterheadAddress, letterheadPhones } from "@/components/letterhead/Letterhead";

const GOLD = "A87828", INK = "131819", GREY = "4A5056", FAINT = "6B7177";
const FONT = "Calibri";
const mm = (n: number) => Math.round((n / 25.4) * 1440); // twips
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
const run = (text: string, o: { size?: number; color?: string; bold?: boolean; caps?: boolean; spacing?: number } = {}) =>
  new TextRun({ text, font: FONT, size: o.size ?? 17, color: o.color ?? GREY, bold: o.bold, allCaps: o.caps, characterSpacing: o.spacing });

export async function buildLetterheadDocx(): Promise<Buffer> {
  const logo = await fs.readFile(path.join(process.cwd(), "public", "stbs-logo-dark.png"));
  const right = (children: TextRun[]) => new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 20 }, children });

  const head = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [new TableRow({ children: [
      new TableCell({ borders: noBorders, verticalAlign: VerticalAlign.BOTTOM, width: { size: 52, type: WidthType.PERCENTAGE }, children: [
        new Paragraph({ children: [new ImageRun({ type: "png", data: logo, transformation: { width: 184, height: 64 } })] }),
        new Paragraph({ spacing: { before: 80 }, children: [run(LETTERHEAD_NAME, { size: 25, color: INK, bold: true })] }),
        new Paragraph({ children: [run(company.tagline, { size: 16, color: GOLD, bold: true, caps: true, spacing: 28 })] }),
      ] }),
      new TableCell({ borders: noBorders, verticalAlign: VerticalAlign.BOTTOM, width: { size: 48, type: WidthType.PERCENTAGE }, children: [
        right([run(letterheadPhones().join("  ·  "), { color: INK, bold: true })]),
        right([run(`${company.email} · ${LETTERHEAD_SITE}`)]),
        right([run(letterheadAddress())]),
        ...(businessInfo.gstin ? [right([run(`GSTIN ${businessInfo.gstin}`)])] : []),
      ] }),
    ] })],
  });

  // Gold over black, as on the PDF: two hairline paragraphs with nothing in them.
  const rule = [
    new Paragraph({ spacing: { before: 120, after: 0 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 0 } }, children: [run("", { size: 2 })] }),
    new Paragraph({ spacing: { before: 20, after: 0 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: INK, space: 0 } }, children: [run("", { size: 2 })] }),
  ];

  const foot = new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: "C9CED2", space: 6 } },
    tabStops: [{ type: TabStopType.RIGHT, position: mm(170) }],
    children: [run(LETTERHEAD_SERVICES.join(" · "), { size: 15, color: FAINT }), run(`\tSince ${company.established}`, { size: 15, color: FAINT })],
  });

  const doc = new Document({
    creator: company.name,
    title: `${LETTERHEAD_NAME} letterhead`,
    styles: { default: { document: { run: { font: FONT, size: 21, color: "1D1F21" }, paragraph: { spacing: { after: 120, line: 300 } } } } },
    sections: [{
      properties: {
        page: {
          size: { width: mm(210), height: mm(297) },
          margin: { top: mm(64), bottom: mm(24), left: mm(20), right: mm(20), header: mm(12), footer: mm(8) },
        },
      },
      headers: { default: new Header({ children: [head, ...rule] }) },
      footers: { default: new Footer({ children: [foot] }) },
      children: [
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Date: ", font: FONT, size: 21 })] }),
        new Paragraph({ children: [new TextRun({ text: "", font: FONT, size: 21 })] }),
      ],
    }],
  });
  return Packer.toBuffer(doc);
}
