import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusMaker } from "@/components/admin/status/StatusMaker";
import { STORY_BRAND } from "@/lib/status/brand";
import { todayInIndia } from "@/lib/status/occasions";

export const dynamic = "force-dynamic";
export const metadata = { title: "WhatsApp status" };

export default async function WhatsAppStatusPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "SUPER_ADMIN") redirect("/admin/login");
  return <div className="a-page">
    <PageHeader eyebrow="Marketing" title="WhatsApp status" description="Pick the occasion, add a picture, and get four finished stories to share to your status." />
    <StatusMaker today={todayInIndia()} brand={STORY_BRAND} />
  </div>;
}
