import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateLetterPdf } from "@/lib/letter-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

/** The blank A4 letterpad, to print and write on. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const pdf = await generateLetterPdf(null, new URL(request.url).origin);
    return new Response(new Uint8Array(pdf), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="STBS-Letterpad.pdf"',
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    console.error("LETTERPAD_PDF_FAILURE", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The letterpad could not be made. Please try again." }, { status: 500 });
  }
}
