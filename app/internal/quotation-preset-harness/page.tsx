import { notFound } from "next/navigation";
import { Harness } from "./harness";

export const dynamic = "force-dynamic";

/**
 * Dev-only harness for the new-quotation wizard, with no database or login behind it.
 *
 * `npm run test:quotation-wizard-ui` drives this in a real browser. It is the only way to check the
 * thing that actually matters — that the answers reach the item table written into the right lines,
 * and that no placeholder survives the trip.
 */
export default function QuotationPresetHarnessPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Harness />;
}
