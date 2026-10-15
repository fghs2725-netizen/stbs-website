import type { Metadata } from "next";
import localFont from "next/font/local";
import { canonicalSiteUrl, SITE_OG_IMAGE } from "@/lib/site-url";
import { SITE_DEFAULT_DESCRIPTION, SITE_DEFAULT_TITLE, SITE_NAME } from "@/lib/page-metadata";
import "./globals.css";

// None of these preload: the public pages paint with Satoshi/Clash first, and preloading admin faces there
// competed with the hero image. PDFs await document.fonts.ready, so they still get them.
// Keep builds offline-safe. These local faces preserve the existing variable
// names used by the app (--font-manrope = primary UI sans, --font-oswald =
// display face). Literal family names ("Inter", "Oswald", "Montserrat") used
// inside components and the PDF renderer are aliased to these same files in
// globals.css, so previews and generated PDFs stay consistent.
const manrope = localFont({ src: [{ path: "../public/fonts/inter-latin-400.woff2", weight: "400" }, { path: "../public/fonts/inter-latin-600.woff2", weight: "600" }], variable: "--font-manrope", display: "swap", preload: false });
// Public design system (see .theme-public in globals.css): exactly three weights —
// Archivo 700 for headings, Inter 400 + 500 for body/UI. Both faces preload with
// display: swap. The admin UI keeps using the faces above.
const heading = localFont({ src: [{ path: "../public/fonts/archivo-latin-700.woff2", weight: "700" }], variable: "--font-heading", display: "swap", preload: false });
const body = localFont({ src: [{ path: "../public/fonts/inter-latin-400.woff2", weight: "400" }, { path: "../public/fonts/inter-latin-500.woff2", weight: "500" }], variable: "--font-body", display: "swap", preload: false });
// Public site (catalogue brand): Clash Display for headlines and numerals, Satoshi for text and UI,
// Instrument Serif italic for the one accent word in a headline.
const display = localFont({ src: [{ path: "../public/fonts/ClashDisplay-500.woff2", weight: "500" }, { path: "../public/fonts/ClashDisplay-600.woff2", weight: "600" }], variable: "--font-display", display: "swap", preload: true });
const text = localFont({ src: [{ path: "../public/fonts/Satoshi-400.woff2", weight: "400" }, { path: "../public/fonts/Satoshi-500.woff2", weight: "500" }, { path: "../public/fonts/Satoshi-700.woff2", weight: "700" }], variable: "--font-text", display: "swap", preload: true });
const serif = localFont({ src: [{ path: "../public/fonts/InstrumentSerif-400i.woff2", weight: "400", style: "italic" }], variable: "--font-serif", display: "swap", preload: false });
const oswald = localFont({ src: [{ path: "../public/fonts/noto-sans-regular.ttf", weight: "400" }], variable: "--font-oswald", display: "swap", preload: false });
// The manifest is set here, not by an app/manifest.ts file, so the admin layout can swap in its own.
export const metadata: Metadata = { metadataBase: new URL(canonicalSiteUrl()), manifest: "/manifest.webmanifest",title: { default: SITE_DEFAULT_TITLE, template: "%s | Saini Tubewell" }, description: SITE_DEFAULT_DESCRIPTION, keywords: ["borewell drilling", "tubewell construction", "rainwater harvesting", "borewell material supply"], openGraph: { title: SITE_NAME, description: SITE_DEFAULT_DESCRIPTION, type: "website", siteName: SITE_NAME, locale: "en_IN", url: canonicalSiteUrl(), images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} — borewell drilling and water infrastructure` }] }, twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DEFAULT_DESCRIPTION, images: [SITE_OG_IMAGE] } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${display.variable} ${text.variable} ${serif.variable} ${manrope.variable} ${oswald.variable} ${heading.variable} ${body.variable} font-sans antialiased`}>{children}</body></html> }
