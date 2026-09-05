import type { Metadata } from "next";
import localFont from "next/font/local";
import { canonicalSiteUrl } from "@/lib/site-url";
import "./globals.css";

// Keep builds offline-safe. These local faces preserve the existing variable
// names used by the app (--font-manrope = primary UI sans, --font-oswald =
// display face). Literal family names ("Inter", "Oswald", "Montserrat") used
// inside components and the PDF renderer are aliased to these same files in
// globals.css, so previews and generated PDFs stay consistent.
const manrope = localFont({ src: [{ path: "../public/fonts/inter-latin-400.woff2", weight: "400" }, { path: "../public/fonts/inter-latin-600.woff2", weight: "600" }], variable: "--font-manrope", display: "swap" });
const oswald = localFont({ src: [{ path: "../public/fonts/noto-sans-regular.ttf", weight: "400" }], variable: "--font-oswald", display: "swap" });
export const metadata: Metadata = { metadataBase: new URL(canonicalSiteUrl()), title: { default: "Saini Tubewell Boring Service | Since 1992", template: "%s | Saini Tubewell" }, description: "Professional borewell drilling, rainwater harvesting, borewell material supply and tubewell construction services since 1992.", keywords: ["borewell drilling", "tubewell construction", "rainwater harvesting", "borewell material supply"], icons: { icon: "/logo.png" }, openGraph: { title: "Saini Tubewell Boring Service", description: "Drilling deep. Building trust. Since 1992.", type: "website", images: ["/logo.png"] } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${manrope.variable} ${oswald.variable} font-sans antialiased`}>{children}</body></html> }
