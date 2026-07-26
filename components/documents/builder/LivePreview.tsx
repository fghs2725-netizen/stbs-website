'use client';

import React from 'react';

interface LivePreviewProps {
  document: any;
  zoom: number;
}

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LivePreview({ document, zoom }: LivePreviewProps) {
  const A4_WIDTH = 794;
  const A4_HEIGHT = 1123;

  return (
    <div className="pdf-live-preview pdf-scrollable pb-20">
      <div className="flex-1 flex justify-center py-10">
        <div 
          className="page-container"
          style={{ 
            width: `${A4_WIDTH}px`, 
            height: `${A4_HEIGHT}px`,
            transform: `scale(${zoom})`,
            marginBottom: `${(zoom - 1) * A4_HEIGHT}px`
          }}
        >
          {/* Cover Page */}
          <div className="w-full h-full bg-white text-black flex flex-col relative overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
            {/* Accent stripe */}
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[#1e3a5f] to-[#152a45]" />
            
            {/* Header */}
            <div className="ml-8 pt-8 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center text-[#f7c600] font-bold text-xl">S</div>
                <div>
                  <div className="text-lg font-bold text-[#1e3a5f] tracking-widest" style={{ fontFamily: 'Oswald, sans-serif' }}>SAINI TUBEWELL BORING SERVICE</div>
                  <div className="text-[9px] text-gray-500 tracking-[3px] uppercase">Drilling Deep. Building Trust. Est. 1992</div>
                </div>
              </div>
            </div>

            {/* Document Type */}
            <div className="ml-8 mb-8">
              <div className="text-3xl font-bold text-[#1e3a5f] tracking-wider uppercase" style={{ fontFamily: 'Oswald, sans-serif' }}>
                {document?.type?.replace(/_/g, ' ') || 'DOCUMENT'}
              </div>
              <div className="w-12 h-1 bg-[#f7c600] mt-2" />
            </div>

            {/* Document Info */}
            <div className="ml-8 mb-8">
              <table className="w-3/4">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-[10px] text-gray-400 uppercase tracking-wider w-1/3">Reference</td>
                    <td className="py-2 text-xs font-semibold text-[#1e3a5f]">{document?.reference || 'DRAFT'}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-[10px] text-gray-400 uppercase tracking-wider">Subject</td>
                    <td className="py-2 text-xs text-gray-600">{document?.subject || document?.title || 'Untitled'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[10px] text-gray-400 uppercase tracking-wider">Status</td>
                    <td className="py-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                        {document?.status?.replace(/_/g, ' ') || 'DRAFT'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Client Info */}
            {(document?.clientName || document?.clientCompany) && (
              <div className="ml-8 mb-6">
                <div className="text-[9px] text-gray-400 uppercase tracking-[2px] mb-1">Prepared For</div>
                <div className="text-sm font-semibold text-[#1e3a5f]">{document?.clientCompany || document?.clientName}</div>
                {document?.clientEmail && <div className="text-[11px] text-gray-500 mt-0.5">{document.clientEmail}</div>}
              </div>
            )}

            {/* Items Preview */}
            {document?.items && document.items.length > 0 && (
              <div className="ml-8 mr-4 mt-2">
                <div className="text-[9px] text-gray-400 uppercase tracking-[2px] mb-2">Bill of Quantities ({document.items.length} items)</div>
                <div className="border border-gray-200 rounded overflow-hidden">
                  <div className="bg-[#1e3a5f] text-white text-[8px] grid grid-cols-12 gap-1 px-2 py-1.5 font-semibold">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2 text-center">Unit</div>
                    <div className="col-span-1 text-right">Qty</div>
                    <div className="col-span-2 text-right">Rate</div>
                    <div className="col-span-2 text-right">Amount</div>
                  </div>
                  {document.items.slice(0, 5).map((item: any, i: number) => (
                    <div key={item.id || i} className="text-[8px] grid grid-cols-12 gap-1 px-2 py-1 border-b border-gray-50" style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                      <div className="col-span-5 text-gray-700 truncate">{item.description || '—'}</div>
                      <div className="col-span-2 text-center text-gray-500">{item.unit || '—'}</div>
                      <div className="col-span-1 text-right text-gray-600">{item.quantity || 0}</div>
                      <div className="col-span-2 text-right text-gray-600">{formatCurrency(item.rate || 0)}</div>
                      <div className="col-span-2 text-right font-medium text-[#1e3a5f]">{formatCurrency(item.amount || 0)}</div>
                    </div>
                  ))}
                  {document.items.length > 5 && (
                    <div className="text-[8px] text-gray-400 text-center py-1">+{document.items.length - 5} more items</div>
                  )}
                </div>
                <div className="flex justify-end mt-2">
                  <div className="text-right">
                    <div className="text-[9px] text-gray-400">Total</div>
                    <div className="text-sm font-bold text-[#1e3a5f]">{formatCurrency(document.totalAmount || 0)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="absolute bottom-4 left-8 right-8 flex justify-between items-center border-t border-gray-200 pt-2">
              <span className="text-[8px] text-gray-400">STBS Enterprise | Sonipat, Haryana</span>
              <span className="text-[8px] text-gray-400">Page 1</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Zoom indicator */}
      <div className="absolute bottom-6 right-6 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-xs font-medium shadow-xl">
        A4 Format • {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
