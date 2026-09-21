import { redirect } from 'next/navigation';
import { Truck } from 'lucide-react';
import { auth } from '@/auth';
import { DocumentTypePage } from '@/components/admin/shell/DocumentTypePage';

export const dynamic = 'force-dynamic';

export default async function DeliveryChallansPage() {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  return (
    <DocumentTypePage
      eyebrow="Documents"
      title="Delivery challans"
      description="Goods sent to site, with quantities and the date they left."
      types={['DELIVERY_CHALLAN']}
      icon={Truck}
      plannedNote="Any challans already in the database are listed below, but there is no challan editor yet."
    />
  );
}
