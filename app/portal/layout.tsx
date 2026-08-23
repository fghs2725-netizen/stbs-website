import { ReactNode } from 'react';
import Link from 'next/link';
import { LayoutDashboard, FileText, LogOut } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyPortalToken } from '@/lib/portal-auth';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('portal_token')?.value;
  const client = await verifyPortalToken(token);

  if (!client) {
    redirect('/portal/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/portal" className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-[#1e3a5f] rounded flex items-center justify-center text-[#f7c600] font-bold text-lg">
                  S
                </div>
                <span className="font-bold text-xl tracking-tight text-[#1e3a5f]">STBS Portal</span>
              </Link>
              <nav className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <Link href="/portal" className="border-[#1e3a5f] text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <Link href="/portal/documents" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  <FileText className="w-4 h-4 mr-2" />
                  My Documents
                </Link>
              </nav>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
              <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 border border-blue-200 text-sm font-semibold">
                  {client.companyName?.charAt(0) || 'C'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden md:block">
                  {client.companyName}
                </span>
              </div>
              <form action="/api/portal/logout" method="POST">
                <button type="submit" className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 transition-colors" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 grid grid-cols-2" aria-label="Portal navigation" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Link href="/portal" className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium text-[#1e3a5f] min-h-[56px]">
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>
        <Link href="/portal/documents" className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium text-gray-500 min-h-[56px]">
          <FileText className="w-5 h-5" />
          Documents
        </Link>
      </nav>

      <footer className="bg-white border-t border-gray-200 mt-auto hidden sm:block">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} STBS Enterprise. Confidential and Secure.
          </p>
        </div>
      </footer>
    </div>
  );
}
