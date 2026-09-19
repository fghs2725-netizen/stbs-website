import { businessInfo, company } from "@/lib/company";
import { absolutePath, canonicalSiteUrl } from "@/lib/site-url";
import { SERVICE_PAGES } from "@/lib/website/service-pages";

/**
 * LocalBusiness JSON-LD for the whole public site.
 *
 * Only facts we actually have are emitted. Address, geo coordinates and legal name are OMITTED until
 * the owner supplies them (see businessInfo), never guessed. openingHours is the existing site copy
 * (Mo-Sa 08:00-19:00) and is flagged as unverified in docs/TODO.md.
 */
export function buildLocalBusiness() {
  const url = canonicalSiteUrl();
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": `${url}/#business`,
    name: company.name,
    url,
    logo: absolutePath("/icon-512.png"),
    image: absolutePath("/og/stbs-og-1200x630.png"),
    description: company.description,
    telephone: company.phones.map((p) => `+91${p}`),
    email: company.email,
    foundingDate: String(company.established),
    // Areas the owner named; Delhi NCR is a region, the rest are places in Haryana.
    areaServed: [
      { "@type": "State", name: "Haryana" },
      ...businessInfo.serviceAreas
        .filter((a) => a !== "Delhi NCR")
        .map((name) => ({ "@type": "City", name })),
      { "@type": "AdministrativeArea", name: "Delhi NCR" },
    ],
    serviceType: ["Borewell drilling", "Tubewell construction", "Rainwater harvesting", "Borewell material supply"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: SERVICE_PAGES.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.fullTitle, url: absolutePath(s.href) },
      })),
    },
    openingHours: businessInfo.openingHours,
  };
  if (businessInfo.legalName) data.legalName = businessInfo.legalName;
  if (businessInfo.registeredOffice) {
    data.address = { "@type": "PostalAddress", streetAddress: businessInfo.registeredOffice, addressRegion: "Haryana", addressCountry: "IN" };
  }
  return data;
}
