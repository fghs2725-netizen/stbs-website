import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

/**
 * The quotation editor runs full-screen with none of the admin chrome around it.
 * It brings its own top bar, its own phone action bar and a full-page preview
 * overlay, so the sidebar, top bar and tab bar would only collide with them.
 * The editor's back link is the way out.
 */
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect('/admin/login');

  return <div className="min-h-[100dvh] bg-[#101012]">{children}</div>;
}
