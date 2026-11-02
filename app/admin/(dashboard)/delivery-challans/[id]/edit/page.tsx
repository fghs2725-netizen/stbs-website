import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getChallan } from "@/lib/challan-management";
import { PageHeader } from "@/components/admin/PageHeader";
import { ChallanEditor } from "@/components/challan/ChallanEditor";

export const dynamic = "force-dynamic";

export default async function EditChallanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const { id } = await params;
  const challan = await getChallan(id);
  if (!challan || challan.deletedAt) notFound();
  // Issued challans have gone out with a driver: they are cancelled and reissued, never edited.
  if (challan.status !== "DRAFT") redirect(`/admin/delivery-challans/${id}`);

  return (
    <div className="a-page">
      <PageHeader eyebrow="Delivery challan" title="Edit draft challan" description={challan.client.name || "No client yet"} />
      <ChallanEditor initial={challan} />
    </div>
  );
}
