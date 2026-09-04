'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, FileText, Download, Trash2, Eye } from 'lucide-react';
import { DOCUMENT_STATUS_CONFIG } from '@/lib/documents/template-registry';
import { DOCUMENT_TYPE_CONFIGS } from '@/lib/documents/template-registry';

interface Document {
  id: string;
  reference: string;
  type: string;
  title: string;
  clientCompany: string;
  status: string;
  totalAmount: number;
  date: string;
  pdfUrl: string | null;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export function DocumentTable({ documents, outOfRange = false }: { documents: Document[]; outOfRange?: boolean }) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (doc: Document) => {
    if (deletingId) return;
    if (!confirm(`Delete document ${doc.reference}? This cannot be undone.`)) return;
    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Could not delete the document.');
        return;
      }
      setOpenMenuId(null);
      router.refresh();
    } catch {
      alert('Could not delete the document. Check your connection and try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (outOfRange) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">Page out of range</h3>
        <p className="text-sm text-gray-400 max-w-sm mb-4">
          That page goes past the last result. Head back to the first page.
        </p>
        <a href="/admin/documents" className="min-h-[40px] inline-flex items-center px-4 py-2 bg-signal text-ink text-sm font-bold rounded-lg hover:bg-signal/90 transition-colors">
          Go to page 1
        </a>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">No documents found</h3>
        <p className="text-sm text-gray-400 max-w-sm">
          Nothing matches these filters. Try a different search, clear the filters, or create a new document.
        </p>
      </div>
    );
  }

  const configFor = (doc: Document) => ({
    statusConfig: DOCUMENT_STATUS_CONFIG[doc.status as keyof typeof DOCUMENT_STATUS_CONFIG] || { label: doc.status, color: '#94a3b8', bgColor: '#1e293b' },
    typeConfig: DOCUMENT_TYPE_CONFIGS[doc.type as keyof typeof DOCUMENT_TYPE_CONFIGS] || { name: doc.type },
  });

  /* Shared overflow menu: Download PDF (real GET endpoint) + Delete. */
  const ActionMenu = ({ doc }: { doc: Document }) =>
    openMenuId === doc.id ? (
      <>
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
        <div className="absolute right-6 top-12 z-20 w-48 bg-steel border border-white/10 rounded-xl shadow-xl py-1 overflow-hidden">
          <button onClick={() => { router.push(`/admin/documents/${doc.id}/builder`); setOpenMenuId(null); }} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center">
            <Eye className="w-4 h-4 mr-2" /> Open in Builder
          </button>
          <a href={`/api/documents/${doc.id}/pdf`} target="_blank" rel="noreferrer" className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center" onClick={() => setOpenMenuId(null)}>
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </a>
          <div className="h-px bg-white/10 my-1"></div>
          <button
            disabled={deletingId === doc.id}
            onClick={() => handleDelete(doc)}
            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" /> {deletingId === doc.id ? 'Deletingâ€¦' : 'Delete'}
          </button>
        </div>
      </>
    ) : null;

  return (
    <>
      {/* â”€â”€ Mobile: card list, whole card opens the builder â”€â”€ */}
      <ul className="grid gap-3 p-3 md:hidden" aria-label="Documents">
        {documents.map((doc) => {
          const { statusConfig, typeConfig } = configFor(doc);
          return (
            <li key={doc.id} data-testid="document-card" className="relative rounded-lg border border-white/[.08] bg-black/15 p-4 active:bg-white/[0.03]">
              <a
                href={`/admin/documents/${doc.id}/builder`}
                className="block"
                onClick={(e) => { e.preventDefault(); router.push(`/admin/documents/${doc.id}/builder`); }}
              >
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <span className="font-medium text-white truncate">{doc.reference}</span>
                  <span className={`flex-shrink-0 px-2 py-1 text-xs rounded-full font-medium`} style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}>
                    {statusConfig.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/10">{typeConfig.name}</span>
                  <span className="text-gray-400 truncate max-w-full">{doc.clientCompany}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500 truncate">{doc.title}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-200">{formatCurrency(doc.totalAmount)}</span>
                  <span className="text-xs text-gray-500">{format(new Date(doc.date), 'MMM dd, yyyy')}</span>
                </div>
              </a>
              <button
                onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                className="absolute top-3 right-3 mt-5 -mr-1 p-2 min-w-11 min-h-11 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={`More actions for ${doc.reference}`}
                aria-expanded={openMenuId === doc.id}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              <ActionMenu doc={doc} />
            </li>
          );
        })}
      </ul>

      {/* â”€â”€ Desktop: table â”€â”€ */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-400 bg-surface/50 border-y border-white/5">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Client / Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {documents.map((doc) => {
              const { statusConfig, typeConfig } = configFor(doc);
              return (
                <tr key={doc.id} data-testid="document-row" className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => router.push(`/admin/documents/${doc.id}/builder`)}>
                  <td className="px-4 py-4 font-medium text-white whitespace-nowrap">{doc.reference}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-md bg-white/5 text-gray-300 border border-white/10">{typeConfig.name}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-200">{doc.clientCompany}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{doc.title}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 text-xs rounded-full font-medium" style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}>
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-300 whitespace-nowrap">{formatCurrency(doc.totalAmount)}</td>
                  <td className="px-4 py-4 text-gray-400 whitespace-nowrap">{format(new Date(doc.date), 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-4 text-right whitespace-nowrap relative" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                      className="p-2 min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label={`More actions for ${doc.reference}`}
                      aria-expanded={openMenuId === doc.id}
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    <ActionMenu doc={doc} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
