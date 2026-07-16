import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><SiteHeader/><main>{children}</main><SiteFooter/><WhatsAppFloat/></>;
}
