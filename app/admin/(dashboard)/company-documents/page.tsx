import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { CompanyDocuments } from "@/components/admin/company-documents/CompanyDocuments";

export const dynamic = "force-dynamic";
export default async function CompanyDocumentsPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "SUPER_ADMIN") redirect("/admin/login");
  return <div className="a-page">
    <PageHeader eyebrow="Documents" title="Company documents" description="Keep your certificates and business details ready. Select documents to share them together." />
    <CompanyDocuments />
  </div>;
}
