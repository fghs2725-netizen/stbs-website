import { notFound } from "next/navigation";
import { LetterDocument } from "@/components/letterhead/LetterDocument";
import { LETTER_FIXTURES } from "@/lib/letter-fixtures";

export const dynamic = "force-dynamic";

// Test-only: renders a sample letter (or the blank pad) through the real template, with no database.
export default async function LetterFixture({ params }: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { name } = await params;
  if (!(name in LETTER_FIXTURES)) notFound();
  return <LetterDocument letter={LETTER_FIXTURES[name]} />;
}
