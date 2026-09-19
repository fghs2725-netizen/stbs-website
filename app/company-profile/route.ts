import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { company } from "@/lib/company";

// PLACEHOLDER capability statement. Uses only facts already in lib/company.ts.
// To replace it: upload the real PDF as public/docs/stbs-company-profile.pdf and set the hero
// secondary CTA URL to /docs/stbs-company-profile.pdf (Website -> Home -> Hero).
export const runtime = "nodejs";
export const dynamic = "force-static";

const DEEP = rgb(11 / 255, 31 / 255, 51 / 255);
const BODY = rgb(74 / 255, 90 / 255, 102 / 255);

export async function GET() {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Saini Tubewell Boring Service — Company Profile (draft)");
  pdf.setAuthor(company.name);
  const page = pdf.addPage([595.28, 841.89]); // A4
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const M = 56;
  let y = 841.89 - 72;
  const line = (text: string, o: { size?: number; font?: typeof regular; color?: typeof BODY; gap?: number } = {}) => {
    const size = o.size ?? 11;
    page.drawText(text, { x: M, y, size, font: o.font ?? regular, color: o.color ?? BODY });
    y -= o.gap ?? size * 1.7;
  };

  page.drawRectangle({ x: 0, y: 841.89 - 12, width: 595.28, height: 12, color: DEEP });
  line("COMPANY PROFILE — DRAFT", { size: 9, font: bold, gap: 26 });
  line(company.name, { size: 24, font: bold, color: DEEP, gap: 34 });
  line("Borewell drilling, tubewell construction, rainwater harvesting", { size: 11 });
  line(`and borewell material supply across Haryana & NCR, operating since ${company.established}.`, { size: 11, gap: 34 });

  line("Contact", { size: 12, font: bold, color: DEEP, gap: 22 });
  line(`${company.managingDirector}, Managing Director`);
  line(company.phones.map((p) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`).join("  /  "));
  line(company.email);
  line("www.stbs.in", { gap: 40 });

  line("Placeholder", { size: 12, font: bold, color: DEEP, gap: 22 });
  line("The full capability statement (project references, equipment, depth and diameter ranges,", { size: 10 });
  line("certifications and client list) will be supplied by Saini Tubewell Boring Service.", { size: 10 });

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="STBS-Company-Profile.pdf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
