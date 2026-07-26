import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Search, User } from 'lucide-react';
import { NotificationBell } from '@/components/admin/NotificationBell';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="flex h-screen w-full bg-ink text-gray-200 overflow-hidden font-manrope">
      {/* Sidebar Navigation */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 flex-shrink-0 border-b border-white/5 bg-steel/50 backdrop-blur-md flex items-center justify-between px-6">
          <div className="flex items-center text-gray-400 focus-within:text-white transition-colors">
            <Search className="w-5 h-5 mr-3" />
            <input 
              type="text" 
              placeholder="Search documents, clients, templates..." 
              className="bg-transparent border-none outline-none text-sm w-64 md:w-96 placeholder:text-gray-500"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <div className="flex items-center space-x-3 border-l border-white/10 pl-4">
              <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center text-sm font-semibold">
                {session.user?.name?.charAt(0) || <User className="w-4 h-4" />}
              </div>
              <span className="text-sm font-medium hidden md:block">
                {session.user?.name || 'Admin User'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
