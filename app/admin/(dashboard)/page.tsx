import { DashboardStats } from '@/components/admin/DashboardStats';
import { QuickActions } from '@/components/admin/QuickActions';
import { ActivityLog } from '@/components/admin/ActivityLog';
import { DocumentTable } from '@/components/admin/DocumentTable';
import { prisma } from '@/lib/prisma';
import { FileText, Briefcase, Clock, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';

export default async function AdminDashboard() {
  // Try to fetch real data, fallback to defaults if tables don't exist
  let docCount = 0;
  let activeQuotations = 0;
  let pendingDocs = 0;
  let pipelineValue = 0;
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

    const openDocs = await prisma.document.findMany({
      where: { status: { in: ['DRAFT', 'PENDING_REVIEW'] } },
      select: { totalAmount: true },
    });
    pipelineValue = openDocs.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

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

    activities = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }).catch(() => []);

  } catch (error) {
    console.error('Database connection or tables not ready yet:', error);
  }

  const formatINR = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const stats = [
    { label: 'Total Documents', value: docCount, icon: 'FileText', color: 'from-blue-500/20 to-blue-500/0 text-blue-400' },
    { label: 'Active Quotations', value: activeQuotations, icon: 'Briefcase', color: 'from-signal/20 to-signal/0 text-signal' },
    { label: 'Pending Approvals', value: pendingDocs, icon: 'Clock', color: 'from-purple-500/20 to-purple-500/0 text-purple-400' },
    { label: 'Open Pipeline Value', value: formatINR(pipelineValue), icon: 'DollarSign', color: 'from-green-500/20 to-green-500/0 text-green-400' },
  ];

  return (
    <div className="admin-page">
      <PageHeader title="Dashboard" description="A concise view of work in progress and the items that need attention." action={<div className="flex gap-2"><Button asChild variant="secondary"><Link href="/admin/clients">New Client</Link></Button><Button asChild><Link href="/admin/documents/new">New Document</Link></Button></div>} />

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[.08]">
              <h2 className="text-lg font-semibold text-white">Recent documents</h2>
              <Link href="/admin/documents" className="text-sm font-medium text-signal hover:text-white">View all</Link>
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
