import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';
import { Search, User } from 'lucide-react';
import { NotificationBell } from '@/components/admin/NotificationBell';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] w-full bg-ink text-gray-200 overflow-hidden">
      {/* Sidebar Navigation */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex min-w-0 flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 flex-shrink-0 border-b border-white/[.08] bg-[#141416] flex items-center justify-between px-4 lg:px-6 gap-3">
          <div className="flex items-center flex-1 min-w-0">
            <AdminMobileNav userName={session.user?.name} />
            <form action="/admin/search" method="GET" className="hidden sm:flex h-10 max-w-xl flex-1 items-center rounded-lg border border-white/[.08] bg-black/20 px-3 text-gray-400 focus-within:border-signal/70 ml-2 md:ml-0 min-w-0">
              <Search className="w-4 h-4 mr-2 flex-shrink-0" />
              <input
                type="search"
                name="q"
                placeholder="Search documents, clients..."
                className="bg-transparent border-none outline-none text-[16px] w-full placeholder:text-gray-500"
              />
            </form>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2 border-l border-white/10 pl-3 sm:pl-4">
              <div className="size-9 rounded-full bg-surface border border-white/10 flex items-center justify-center text-sm font-semibold">
                {session.user?.name?.charAt(0) || <User className="w-4 h-4" />}
              </div>
              <span className="text-sm font-medium hidden md:block">
                {session.user?.name || 'Admin User'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(24px+env(safe-area-inset-bottom))] lg:px-6 lg:py-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
