import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/auth";
import { getQuotation } from "@/lib/quotation-management";
import { isQuotationPdfReady } from "@/components/quotation/quotation-model";
import { quotation as fixed } from "@/components/quotation/quotation-data";
import { buildQuotationDocx, type DocxAssets, type DocxLogo } from "@/lib/quotation-docx";
import { quotationFilename } from "@/lib/quotation-filename";
import { CLIENT_LOGOS } from "@/lib/website/client-logos";

export const runtime = "nodejs";
export const maxDuration = 30;

// Images are optional polish: any failure here degrades to a text-only document, never a failed export.
async function loadAssets(origin: string): Promise<DocxAssets> {
  const get = async (path: string) => {
    const res = await fetch(new URL(path, origin), { cache: "force-cache" });
    if (!res.ok) throw new Error(`asset ${path} ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  };
  const assets: DocxAssets = {};
  try { assets.banner = await get("/quotation/banner/stbs-premium-banner.png"); } catch { /* text-only header */ }
  const logos: DocxLogo[] = [];
  for (const logo of CLIENT_LOGOS) {
    if (!(fixed.clients as readonly string[]).includes(logo.name)) continue;
    try {
      // Rendered at 4x the display size so the logo stays sharp when printed from Word.
      const png = await sharp(await get(logo.logoUrl), { density: 300 }).resize({ width: 440, height: 136, fit: "inside" }).png().toBuffer({ resolveWithObject: true });
      logos.push({ name: logo.name, png: png.data, width: Math.round(png.info.width / 4), height: Math.round(png.info.height / 4) });
    } catch { /* this logo falls back to its name in the text list */ }
  }
  if (logos.length) assets.logos = logos;
  return assets;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const quotation = await getQuotation(id);
    if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isQuotationPdfReady(quotation)) return NextResponse.json({ error: "Complete the client name, service, subject and at least one price item before exporting." }, { status: 422 });
    const buffer = await buildQuotationDocx(quotation, await loadAssets(new URL(request.url).origin));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${quotationFilename(quotation, "docx")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("DOCX_FAILURE", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Word export failed. Please try again." }, { status: 500 });
  }
}
