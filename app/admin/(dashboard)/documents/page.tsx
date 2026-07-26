import Link from 'next/link';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { DocumentTable } from '@/components/admin/DocumentTable';
import { prisma } from '@/lib/prisma';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>
}) {
  const { q, type, status } = await searchParams;
  const query = q || '';
  const typeFilter = type || '';
  const statusFilter = status || '';

  let documents: any[] = [];
  
  try {
    const where: any = { deletedAt: null };
    if (query) {
      where.OR = [
        { reference: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
        { clientName: { contains: query, mode: 'insensitive' } },
        { clientCompany: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (typeFilter) where.type = typeFilter;
    if (statusFilter) where.status = statusFilter;

    const docs = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    
    documents = docs.map(d => ({
      id: d.id,
      reference: d.reference,
      type: d.type,
      title: d.title,
      clientCompany: d.clientCompany || d.clientName || 'Unknown Client',
      status: d.status,
      totalAmount: Number(d.totalAmount) || 0,
      date: d.createdAt.toISOString(),
      pdfUrl: d.pdfUrl
    }));
  } catch (error) {
    console.error('Database error on documents page:', error);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-oswald font-bold tracking-tight text-white mb-1">Documents</h1>
          <p className="text-gray-400 text-sm">Manage and track all your generated documents.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 bg-surface border border-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/5 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <Link href="/admin/documents/new">
            <button className="flex items-center px-4 py-2 bg-signal text-ink text-sm font-bold rounded-lg hover:bg-signal/90 transition-colors shadow-[0_0_15px_rgba(247,198,0,0.3)] hover:shadow-[0_0_20px_rgba(247,198,0,0.5)]">
              <Plus className="w-4 h-4 mr-2" />
              New Document
            </button>
          </Link>
        </div>
      </div>

      <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by reference, title, or client..." 
              className="w-full bg-surface border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-signal/50 focus:ring-1 focus:ring-signal/50 transition-all"
              defaultValue={query}
            />
          </div>
          <div className="flex gap-3">
            <select className="bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-signal/50 appearance-none min-w-[140px]">
              <option value="">All Types</option>
              <option value="QUOTATION">Quotation</option>
              <option value="TAX_INVOICE">Tax Invoice</option>
              <option value="PROFORMA_INVOICE">Proforma Invoice</option>
              <option value="TECHNICAL_PROPOSAL">Technical Proposal</option>
              <option value="COMMERCIAL_PROPOSAL">Commercial Proposal</option>
              <option value="PROJECT_ESTIMATE">Project Estimate</option>
              <option value="COMPLETION_CERTIFICATE">Completion Certificate</option>
              <option value="PAYMENT_RECEIPT">Payment Receipt</option>
            </select>
            <select className="bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-signal/50 appearance-none min-w-[140px]">
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="FINALIZED">Finalized</option>
              <option value="REVISION">Revision</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button className="p-2 bg-surface border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <DocumentTable documents={documents} />
        </div>
      </div>
    </div>
  );
}
