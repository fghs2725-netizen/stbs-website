import { businessInfo, company, googleListing } from "@/lib/company";
import { absolutePath, canonicalSiteUrl } from "@/lib/site-url";
import { SERVICE_PAGES } from "@/lib/website/service-pages";

/**
 * LocalBusiness JSON-LD for the whole public site.
 *
 * Only facts we actually have are emitted, never guessed: the address and hours the owner gave, and the
 * map pin and link of the owner's own Google Business listing (sameAs / hasMap tie the site to it, which
 * helps the listing and the site rank together in local search).
 */
export function buildLocalBusiness() {
  const url = canonicalSiteUrl();
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": `${url}/#business`,
    name: company.name,
    alternateName: ["STBS", googleListing.name],
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
    serviceType: ["Water testing", "Borewell drilling", "Tubewell construction", "Rainwater harvesting", "Borewell material supply"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: SERVICE_PAGES.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.fullTitle, url: absolutePath(s.href) },
      })),
    },
    // Open 24 hours, as on the Google listing: Google's documented form is 00:00 to 23:59 on every day.
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    geo: { "@type": "GeoCoordinates", latitude: googleListing.geo.latitude, longitude: googleListing.geo.longitude },
    hasMap: googleListing.url,
    sameAs: [googleListing.url],
  };
  if (businessInfo.legalName) data.legalName = businessInfo.legalName;
  if (businessInfo.registeredOffice) {
    data.address = { "@type": "PostalAddress", streetAddress: businessInfo.registeredOffice, addressRegion: "Haryana", postalCode: businessInfo.pinCode, addressCountry: "IN" };
  }
  return data;
}

/** FAQPage structured data built from the exact visible FAQ text. */
export function faqJsonLd(items: Array<[string, string]>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

/** BreadcrumbList for an inner page: Home first, then each step as { name, path }. */
export function breadcrumbJsonLd(steps: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...steps].map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name, item: absolutePath(s.path) })),
  };
}
