import { prisma } from "@/lib/prisma";
import type { QuoteRequest } from "@/lib/quote-request";

/** Stores a validated website request. Empty optional fields are kept as null, not "". */
export async function storeEnquiry(q: QuoteRequest): Promise<string> {
  const row = await prisma.enquiry.create({
    data: {
      name: q.name,
      organisation: q.organisation || null,
      phone: q.phone,
      email: q.email || null,
      service: q.service,
      location: q.location,
      details: q.details || null,
    },
    select: { id: true },
  });
  return row.id;
}

export function listEnquiries(limit = 200) {
  return prisma.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}

/** Opening an enquiry is what marks it read. */
export async function openEnquiry(id: string) {
  const e = await prisma.enquiry.findUnique({ where: { id } });
  if (e && !e.readAt) await prisma.enquiry.update({ where: { id }, data: { readAt: new Date() } });
  return e;
}

/** Digits only, with India's country code, for tel: and wa.me links. */
export function dialNumber(phone: string): string {
  const d = phone.replace(/\D/g, "").replace(/^0(?=\d{10}$)/, "");
  return d.length === 10 ? `91${d}` : d;
}
