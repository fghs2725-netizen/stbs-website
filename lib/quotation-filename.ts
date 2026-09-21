/**
 * Download filenames: STBS-Quotation-{number}-{clientSlug}.{ext}
 * e.g. STBS-Quotation-2026-27-0142-acme-pvt-ltd.pdf. The leading "STBS/" of the number is dropped
 * because the filename already starts with STBS.
 */
export function clientSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || "client";
}

export function referenceForFilename(reference: string): string {
  const cleaned = reference
    .replace(/^STBS\//i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "draft";
}

export function quotationFilename(quotation: { quotationReference: string; client: { companyName: string } }, ext: "pdf"): string {
  return `STBS-Quotation-${referenceForFilename(quotation.quotationReference)}-${clientSlug(quotation.client.companyName)}.${ext}`;
}
