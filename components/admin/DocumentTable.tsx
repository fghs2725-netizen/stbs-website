'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, FileText, Download, Edit2, Trash2, Eye } from 'lucide-react';
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

export function DocumentTable({ documents }: { documents: Document[] }) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">No documents found</h3>
        <p className="text-sm text-gray-400 max-w-sm">
          Get started by creating a new document or adjusting your search filters.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 uppercase bg-surface/50 border-y border-white/5">
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
            const statusConfig = DOCUMENT_STATUS_CONFIG[doc.status as keyof typeof DOCUMENT_STATUS_CONFIG] || { label: doc.status, color: 'bg-gray-500/20 text-gray-400' };
            const typeConfig = DOCUMENT_TYPE_CONFIGS[doc.type as keyof typeof DOCUMENT_TYPE_CONFIGS] || { name: doc.type };
            
            return (
              <tr 
                key={doc.id} 
                className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                onClick={() => router.push(`/admin/documents/${doc.id}/builder`)}
              >
                <td className="px-4 py-4 font-medium text-white whitespace-nowrap">
                  {doc.reference}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded-md bg-white/5 text-gray-300 border border-white/10">
                    {typeConfig.name}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-gray-200">{doc.clientCompany}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{doc.title}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </td>
                <td className="px-4 py-4 font-medium text-gray-300 whitespace-nowrap">
                  {formatCurrency(doc.totalAmount)}
                </td>
                <td className="px-4 py-4 text-gray-400 whitespace-nowrap">
                  {format(new Date(doc.date), 'MMM dd, yyyy')}
                </td>
                <td className="px-4 py-4 text-right whitespace-nowrap relative" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  
                  {openMenuId === doc.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
                      <div className="absolute right-8 top-10 z-20 w-48 bg-steel border border-white/10 rounded-xl shadow-xl py-1 overflow-hidden">
                        <button onClick={() => { router.push(`/admin/documents/${doc.id}/builder`); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center">
                          <Eye className="w-4 h-4 mr-2" /> View
                        </button>
                        <button onClick={() => { router.push(`/admin/documents/${doc.id}/builder`); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center">
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </button>
                        {doc.pdfUrl && (
                          <a href={doc.pdfUrl} target="_blank" rel="noreferrer" className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center" onClick={() => setOpenMenuId(null)}>
                            <Download className="w-4 h-4 mr-2" /> Download PDF
                          </a>
                        )}
                        <div className="h-px bg-white/10 my-1"></div>
                        <button className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center" onClick={() => setOpenMenuId(null)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
