import { redirect } from 'next/navigation';
import { ReceiptText } from 'lucide-react';
import { auth } from '@/auth';
import { DocumentTypePage } from '@/components/admin/shell/DocumentTypePage';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  return (
    <DocumentTypePage
      eyebrow="Documents"
      title="Invoices"
      description="Tax and proforma invoices raised against completed work."
      types={['TAX_INVOICE', 'PROFORMA_INVOICE']}
      icon={ReceiptText}
      plannedNote="Any invoices already in the database are listed below, but there is no invoice editor yet."
    />
  );
}
