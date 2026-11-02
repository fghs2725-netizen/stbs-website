import { friendlyCompany, type ShareSubject } from "@/components/quotation/share/share-model";
import { company } from "@/lib/company";
import { formatIndianPhone } from "@/lib/phone";
import type { ChallanState } from "@/lib/challan";

/** The share subject for a challan. The site (or the client's city) stands in for the "service". */
export function shareSubjectFromChallan(c: ChallanState): ShareSubject {
  const site = c.deliverToSame ? c.client.city : [c.deliverTo.name, c.deliverTo.city].filter(Boolean).join(", ");
  return {
    kind: "challan",
    reference: c.reference,
    clientName: c.client.name.trim(),
    contact: c.client.contactPerson.trim() || undefined,
    phone: (c.client.phone || c.deliverTo.phone).trim() || undefined,
    service: site.trim() || undefined,
    company: friendlyCompany(company.name),
    signatory: company.managingDirector,
    phones: company.phones.slice(0, 2).map((p) => formatIndianPhone(p)).join(" / "),
  };
}
