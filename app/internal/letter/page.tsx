import { notFound } from "next/navigation";
import { LetterDocument } from "@/components/letterhead/LetterDocument";
import { verifyQuotationRenderToken } from "@/lib/quotation-render-auth";
import { BLANK, decodeLetter, letterBinding } from "@/lib/letter-pdf";

export const dynamic = "force-dynamic";

// Reached only by the PDF renderer, with a short-lived token bound to exactly this letter (or the blank pad).
export default async function LetterRender({ searchParams }: { searchParams: Promise<{ d?: string; token?: string }> }) {
  const { d, token } = await searchParams;
  if (!d || !verifyQuotationRenderToken(token, letterBinding(d))) notFound();
  if (d === BLANK) return <LetterDocument letter={null} />;
  const letter = decodeLetter(d);
  if (!letter) notFound();
  return <LetterDocument letter={letter} />;
}
