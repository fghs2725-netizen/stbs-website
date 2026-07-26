import Link from 'next/link';
import { FileText, Clock, IndianRupee, Search } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyPortalToken } from '@/lib/portal-auth';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'My Documents | STBS Portal',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'APPROVED': case 'FINALIZED': return 'bg-green-50 text-green-700 border-green-200';
    case 'DRAFT': return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'PENDING_REVIEW': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'REVISION': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'REJECTED': case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export default async function PortalDocumentsPage() {
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
    console.error('Failed to fetch documents:', error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
        <p className="text-sm text-gray-500 mt-1">All documents shared with you by STBS Enterprise.</p>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No documents found</h3>
          <p className="text-sm text-gray-500">Documents shared with you will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/portal/documents/${doc.id}`} className="text-sm font-mono font-medium text-[#1e3a5f] hover:underline">
                      {doc.reference}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/portal/documents/${doc.id}`} className="text-sm text-gray-900 hover:text-[#1e3a5f]">
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600">
                      {doc.type?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(doc.status)}`}>
                      {doc.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(Number(doc.totalAmount))}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
