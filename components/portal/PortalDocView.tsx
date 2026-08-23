'use client';

import { useState } from 'react';
import { FileText, Calendar, Building2, IndianRupee } from 'lucide-react';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export default function PortalDocView({ document }: { document: any }) {
  const [activeTab, setActiveTab] = useState<'details' | 'items'>('details');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Tab Bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'details' ? 'bg-[#1e3a5f] text-white shadow' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Details
          </button>
          {document.items && document.items.length > 0 && (
            <button
              onClick={() => setActiveTab('items')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'items' ? 'bg-[#1e3a5f] text-white shadow' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Line Items ({document.items.length})
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'details' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Document Information</h3>
                <div className="space-y-3">
                  <InfoRow icon={<FileText className="w-5 h-5 text-gray-400" />} label="Type" value={document.type?.replace(/_/g, ' ')} />
                  <InfoRow icon={<Calendar className="w-5 h-5 text-gray-400" />} label="Date Created" value={new Date(document.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                  <InfoRow icon={<Building2 className="w-5 h-5 text-gray-400" />} label="Client" value={document.clientName || document.clientCompany || 'N/A'} />
                  <InfoRow icon={<IndianRupee className="w-5 h-5 text-gray-400" />} label="Total Amount" value={formatCurrency(Number(document.totalAmount))} bold />
                </div>
              </div>

              <div className="space-y-4">
                {document.subject && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-3">Subject</h3>
                    <p className="text-sm text-gray-700">{document.subject}</p>
                  </div>
                )}
                {document.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-3">Notes</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{document.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Line Items</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {document.items.map((item: any, i: number) => (
                    <tr key={item.id || i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{Number(item.quantity)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(Number(item.rate))}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{formatCurrency(Number(item.amount))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#1e3a5f]">{formatCurrency(Number(document.totalAmount))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, bold }: { icon: React.ReactNode; label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className={`text-gray-900 ${bold ? 'text-lg font-semibold' : ''}`}>{value}</p>
      </div>
    </div>
  );
}
