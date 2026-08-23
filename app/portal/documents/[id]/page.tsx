import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Calendar, IndianRupee, Download } from 'lucide-react';
import { cookies } from 'next/headers';
import { verifyPortalToken } from '@/lib/portal-auth';
import { PORTAL_DOCUMENT_STATUSES } from '@/lib/portal-doc-auth';
import { prisma } from '@/lib/prisma';
import PortalDocView from '@/components/portal/PortalDocView';

export const metadata = {
  title: 'Document Details | STBS Portal',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

interface PortalDocumentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PortalDocumentPage(props: PortalDocumentPageProps) {
  const params = await props.params;
  const { id } = params;

  const cookieStore = await cookies();
  const token = cookieStore.get('portal_token')?.value;
  const client = await verifyPortalToken(token);

  if (!client) {
    redirect('/portal/login');
  }

  let document: any = null;
  try {
    document = await prisma.document.findFirst({
      where: {
        id,
        clientId: client.clientId,
        deletedAt: null,
        status: { in: [...PORTAL_DOCUMENT_STATUSES] },
      },
      include: {
        items: { orderBy: { position: 'asc' } },
        versions: { orderBy: { versionNumber: 'desc' }, take: 5 },
      },
    });
  } catch (error) {
    console.error('Failed to fetch document:', error);
  }

  if (!document) return notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal" className="p-2 rounded-full hover:bg-gray-200 transition-colors bg-white shadow-sm border border-gray-200 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">{document.reference}</p>
        </div>
        <a
          href={`/api/portal/documents/${document.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152a45] transition-colors"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </a>
      </div>

      {/* Document Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Type</div>
              <div className="text-sm font-semibold text-gray-900">{document.type?.replace(/_/g, ' ')}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Date</div>
              <div className="text-sm font-semibold text-gray-900">{new Date(document.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-50 text-yellow-700">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Amount</div>
              <div className="text-sm font-semibold text-gray-900">{formatCurrency(Number(document.totalAmount))}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <PortalDocView document={document} />

      {/* Version History */}
      {document.versions && document.versions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Version History</h3>
          <div className="space-y-3">
            {document.versions.map((version: any) => (
              <div key={version.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-900">Version {version.versionNumber}</span>
                  {version.changeNote && <span className="text-sm text-gray-500 ml-2">- {version.changeNote}</span>}
                </div>
                <span className="text-xs text-gray-400">{new Date(version.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
