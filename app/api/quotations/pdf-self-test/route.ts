import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { renderQuotationMarkup, runPdfSelfTest } from "@/lib/quotation-pdf";
import type { QuotationState } from "@/components/quotation/quotation-model";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  if (process.env.VERCEL_ENV === "production") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const quotation: QuotationState = { id: "self-test", quotationReference: "SELF-TEST", quotationDate: "01/01/2026", validity: "15 days", status: "DRAFT", serviceType: "Borewell Construction", customServiceType: "", subject: "Self-test quotation", client: { companyName: "Self-test client", contactPerson: "", addressLine1: "", addressLine2: "", city: "", state: "", pinCode: "", phone: "", email: "" }, items: [{ id: "self-test-item", description: "Self-test item", unit: "No.", quantity: 1, rate: 100 }] };
    const html = renderQuotationMarkup(quotation);
    const browser = await runPdfSelfTest();
    return NextResponse.json({ ...browser, quotationReactRender: true, htmlLength: html.length });
  }
  catch { return NextResponse.json({ error: "PDF self-test failed." }, { status: 500 }); }
}
