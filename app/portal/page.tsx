import Link from 'next/link';
import { FileText, Clock, IndianRupee, ExternalLink } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyPortalToken } from '@/lib/portal-auth';
import { PORTAL_DOCUMENT_STATUSES } from '@/lib/portal-doc-auth';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Client Portal | STBS',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'APPROVED':
    case 'FINALIZED':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'DRAFT':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'PENDING_REVIEW':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'REVISION':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'REJECTED':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export default async function PortalDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('portal_token')?.value;
  const client = await verifyPortalToken(token);

  if (!client) {
    redirect('/portal/login');
  }

  let documents: any[] = [];
  try {
    documents = await prisma.document.findMany({
      where: {
        clientId: client.clientId,
        deletedAt: null,
        status: { in: [...PORTAL_DOCUMENT_STATUSES] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        type: true,
        title: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error('Failed to fetch portal documents:', error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {client.companyName}</h1>
          <p className="text-sm text-gray-500 mt-1">Here is an overview of your documents.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Total Documents</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{documents.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Awaiting response</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">
            {documents.filter(d => d.status === 'ISSUED' || d.status === 'VIEWED').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Approved</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {documents.filter(d => d.status === 'APPROVED' || d.status === 'FINALIZED').length}
          </div>
        </div>
      </div>

      {/* Documents */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No documents yet</h3>
          <p className="text-sm text-gray-500">Documents shared with you will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
              <div className="p-5 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <div className="inline-flex items-center p-2 rounded-lg bg-blue-50 text-blue-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(doc.status)}`}>
                    {doc.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">{doc.title}</h3>
                <p className="text-sm font-mono text-gray-500 mb-4">{doc.reference}</p>
                
                <div className="space-y-2 mt-auto">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Date</span>
                    <span className="font-medium text-gray-900">{new Date(doc.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 border-t border-gray-100 pt-2">
                    <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Amount</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(Number(doc.totalAmount))}</span>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                <Link href={`/portal/documents/${doc.id}`} className="block w-full text-center text-sm font-medium text-[#1e3a5f] hover:text-[#152a45] transition-colors">
                  View Document &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
