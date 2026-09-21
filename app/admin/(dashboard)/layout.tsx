import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { company } from '@/lib/company';
import { getPublishedSettings } from '@/lib/website/queries';
import { AdminSidebar } from '@/components/admin/shell/AdminSidebar';
import { AdminTabBar } from '@/components/admin/shell/AdminTabBar';
import { AdminTopBar } from '@/components/admin/shell/AdminTopBar';
import '../admin.css';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect('/admin/login');

  // The business name is CMS-owned; fall back to the static one if the row is
  // missing or the database is unreachable, so the shell always renders.
  let businessName = company.name;
  try {
    const settings = (await getPublishedSettings()) as { businessName?: string | null } | null;
    if (settings?.businessName) businessName = settings.businessName;
  } catch {
    /* keep the fallback */
  }

  return (
    <div className="theme-admin flex min-h-[100dvh] w-full">
      <AdminSidebar businessName={businessName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar businessName={businessName} userName={session.user?.name} />
        {/* The phone tab bar floats over the content, so the last row needs
            clearance; on desktop the bar is gone and normal padding applies. */}
        <main className="flex-1 px-4 py-5 pb-[calc(78px+env(safe-area-inset-bottom))] lg:px-8 lg:py-8 lg:pb-10">
          {children}
        </main>
      </div>

      <AdminTabBar />
    </div>
  );
}
