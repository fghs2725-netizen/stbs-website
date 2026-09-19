import { notFound } from "next/navigation";
import { Harness } from "./harness";

export const dynamic = "force-dynamic";

export default function QuotationItemsHarnessPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Harness />;
}
