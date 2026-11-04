import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildLetterheadDocx } from "@/lib/letterhead-docx";

export const runtime = "nodejs";

/** The letterpad as a Word file, for typing letters in Word. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const file = await buildLetterheadDocx();
    return new Response(new Uint8Array(file), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="STBS-Letterpad.docx"',
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    console.error("LETTERPAD_DOCX_FAILURE", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The Word letterpad could not be made. Please try again." }, { status: 500 });
  }
}
