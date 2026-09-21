import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Harness } from "./harness";

export const dynamic = "force-dynamic";

/**
 * Dev-only harness for the invoice editor, with no database behind it.
 *
 * `npm run test:invoice-editor-ui` drives this in a real browser, which is the only way to check
 * that typing actually moves the totals, that a switched-off column disappears, and that saving
 * hands back what was typed. The admin pages cannot be driven that way without a login and a
 * database write.
 *
 * `?hsn=off` renders with the HSN column switched off.
 */
export default function InvoiceEditorHarnessPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={null}>
      <Harness />
    </Suspense>
  );
}
