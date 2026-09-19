/**
 * Staged client logos (public/clients/*; provenance in public/clients/README.txt), keyed by the
 * exact client name used in the CMS / lib/company.ts. Shared by the migration script and by the
 * static fallback of /clients. Clients without an entry are shown as text.
 */
export interface ClientLogo {
  name: string;
  logoUrl: string;
  altText: string;
}

export const CLIENT_LOGOS: ReadonlyArray<ClientLogo> = [
  { name: "Ashoka University", logoUrl: "/clients/ashoka-university.png", altText: "Ashoka University logo" },
  { name: "Amul Milk, Murthal", logoUrl: "/clients/amul.svg", altText: "Amul logo" },
  { name: "BigBasket, Sonipat Site", logoUrl: "/clients/bigbasket.png", altText: "BigBasket logo" },
  { name: "LT Overseas Pvt. Ltd. (Dawat Rice Mill)", logoUrl: "/clients/lt-foods.svg", altText: "LT Foods logo" },
  { name: "Voestalpine VAE VKN India Pvt. Ltd.", logoUrl: "/clients/voestalpine.svg", altText: "voestalpine logo" },
  { name: "Coral Drugs Pvt. Ltd.", logoUrl: "/clients/coral-drugs.svg", altText: "Coral Drugs logo" },
  { name: "Rishi Laser Limited", logoUrl: "/clients/rishi-laser.webp", altText: "Rishi Laser Limited logo" },
  { name: "O.P. Jindal Global University", logoUrl: "/clients/op-jindal-global-university.webp", altText: "O.P. Jindal Global University logo" },
];

export function logoFor(name: string): ClientLogo | undefined {
  return CLIENT_LOGOS.find((l) => l.name === name);
}
