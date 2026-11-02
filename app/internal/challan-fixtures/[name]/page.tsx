import { notFound } from "next/navigation";
import { ChallanPrintRoot } from "@/components/challan/ChallanPrintRoot";
import { CHALLAN_FIXTURES } from "@/lib/challan-fixtures";

export const dynamic = "force-dynamic";

// Test-only: renders a fixture through the real challan template, with no database access.
export default async function ChallanFixturePage({ params }: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { name } = await params;
  const fixture = CHALLAN_FIXTURES[name];
  if (!fixture) notFound();
  return <ChallanPrintRoot challan={fixture} />;
}
