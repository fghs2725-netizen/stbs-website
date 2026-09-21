import { redirect } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { auth } from '@/auth';
import { DocumentTypePage } from '@/components/admin/shell/DocumentTypePage';

export const dynamic = 'force-dynamic';

export default async function SaleReturnsPage() {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  return (
    <DocumentTypePage
      eyebrow="Documents"
      title="Sale returns"
      description="Material or work sent back, credited against an invoice."
      // The database has no sale-return document type yet, so there is nothing
      // to list: adding the type belongs with the editor that creates them.
      types={[]}
      icon={RotateCcw}
      plannedNote="Sale returns are not stored yet, so there is nothing to show."
    />
  );
}
