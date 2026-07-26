import { DashboardStats } from '@/components/admin/DashboardStats';
import { QuickActions } from '@/components/admin/QuickActions';
import { ActivityLog } from '@/components/admin/ActivityLog';
import { DocumentTable } from '@/components/admin/DocumentTable';
import { prisma } from '@/lib/prisma';
import { FileText, Briefcase, Clock, DollarSign } from 'lucide-react';

export default async function AdminDashboard() {
  // Try to fetch real data, fallback to defaults if tables don't exist
  let docCount = 0;
  let activeQuotations = 0;
  let pendingDocs = 0;
  let recentDocs: any[] = [];
  let activities: any[] = [];

  try {
    docCount = await prisma.document.count();
    activeQuotations = await prisma.document.count({
      where: { type: 'QUOTATION', status: { in: ['DRAFT', 'PENDING_REVIEW'] } }
    });
    pendingDocs = await prisma.document.count({
      where: { status: 'PENDING_REVIEW' }
    });
    
    const docs = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    recentDocs = docs.map(d => ({
      id: d.id,
      reference: d.reference,
      type: d.type,
      title: d.title,
      clientCompany: d.clientName || 'Unknown Client',
      status: d.status,
      totalAmount: Number(d.totalAmount) || 0,
      date: d.createdAt.toISOString(),
      pdfUrl: d.pdfUrl
    }));

    // Dummy activities for now if none exist
    activities = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }).catch(() => []);

  } catch (error) {
    console.error('Database connection or tables not ready yet:', error);
  }

  const stats = [
    { label: 'Total Documents', value: docCount, icon: 'FileText', trend: 12, color: 'from-blue-500/20 to-blue-500/0 text-blue-400' },
    { label: 'Active Quotations', value: activeQuotations, icon: 'Briefcase', trend: 5, color: 'from-signal/20 to-signal/0 text-signal' },
    { label: 'Pending Approvals', value: pendingDocs, icon: 'Clock', trend: -2, color: 'from-purple-500/20 to-purple-500/0 text-purple-400' },
    { label: 'Revenue (MTD)', value: '$0.00', icon: 'DollarSign', trend: 0, color: 'from-green-500/20 to-green-500/0 text-green-400' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-oswald font-bold tracking-tight text-white mb-1">Dashboard</h1>
          <p className="text-gray-400 text-sm">Welcome back. Here&apos;s an overview of your documents and activity.</p>
        </div>
      </div>

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-oswald font-semibold text-white">Recent Documents</h2>
            </div>
            <DocumentTable documents={recentDocs} />
          </div>
        </div>
        
        <div className="space-y-6">
          <QuickActions />
          <ActivityLog activities={activities} />
        </div>
      </div>
    </div>
  );
}
