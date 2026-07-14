import type { Metadata } from "next";
import { Manrope, Oswald } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald" });
export const metadata: Metadata = { metadataBase: new URL("https://sainitubewell.com"), title: { default: "Saini Tubewell Boring Service | Since 1992", template: "%s | Saini Tubewell" }, description: "Professional borewell drilling, rainwater harvesting, borewell material supply and tubewell construction services since 1992.", keywords: ["borewell drilling", "tubewell construction", "rainwater harvesting", "borewell material supply"], icons: { icon: "/logo.png" }, openGraph: { title: "Saini Tubewell Boring Service", description: "Drilling deep. Building trust. Since 1992.", type: "website", images: ["/logo.png"] } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${manrope.variable} ${oswald.variable} font-sans antialiased`}><SiteHeader/><main>{children}</main><SiteFooter/><WhatsAppFloat/></body></html> }
