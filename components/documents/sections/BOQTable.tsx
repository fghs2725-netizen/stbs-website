import React from 'react';
import { DocumentItemData } from '@/lib/documents/types';
import { calcItemAmount, calcItemGST, formatINR, amountInWords, formatPercent, calcFinancialSummary } from '@/lib/documents/calculations';
import PageWrapper from '../shared/PageWrapper';

interface BOQTableProps {
  items: DocumentItemData[];
  discountPercent?: number;
  isInterState?: boolean;
  currency?: string;
  pageNumber: number;
  totalPages: number;
}

export default function BOQTable({ 
  items, 
  discountPercent = 0, 
  isInterState = false, 
  currency = '₹',
  pageNumber,
  totalPages
}: BOQTableProps) {
  const summary = calcFinancialSummary(items, discountPercent);
  
  return (
    <PageWrapper pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="text-xl font-bold font-oswald mb-4 pb-2 border-b-2" style={{ color: 'var(--doc-primary)', borderColor: 'var(--doc-accent)' }}>
        BILL OF QUANTITIES
      </h2>
      
      <table className="boq-table">
        <thead>
          <tr>
            <th className="w-12 text-center">Sr.</th>
            <th className="w-24">Item Code</th>
            <th>Description</th>
            <th className="w-16 text-center">HSN</th>
            <th className="w-16 text-center">Qty</th>
            <th className="w-16 text-center">Unit</th>
            <th className="w-24 text-right">Rate ({currency})</th>
            <th className="w-24 text-right">Amount ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const amount = calcItemAmount(item.quantity, item.rate);
            return (
              <tr key={item.id || index}>
                <td className="text-center">{index + 1}</td>
                <td className="text-xs">{item.itemCode || '-'}</td>
                <td>
                  <div className="font-semibold">{item.description}</div>
                </td>
                <td className="text-center text-xs">{item.hsnCode || '-'}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-center">{item.unit}</td>
                <td className="text-right">{formatINR(item.rate)}</td>
                <td className="text-right font-medium">{formatINR(amount)}</td>
              </tr>
            );
          })}
          
          <tr className="total-row">
            <td colSpan={7} className="text-right">Subtotal:</td>
            <td className="text-right">{formatINR(summary.subtotal)}</td>
          </tr>
          
          {summary.discountAmount > 0 && (
            <tr>
              <td colSpan={7} className="text-right">Discount ({formatPercent(discountPercent)}):</td>
              <td className="text-right text-red-600">-{formatINR(summary.discountAmount)}</td>
            </tr>
          )}
          
          <tr>
            <td colSpan={7} className="text-right">Taxable Amount:</td>
            <td className="text-right">{formatINR(summary.taxableAmount)}</td>
          </tr>
          
          {isInterState ? (
            <tr>
              <td colSpan={7} className="text-right">IGST:</td>
              <td className="text-right">{formatINR(summary.totalGST)}</td>
            </tr>
          ) : (
            <>
              <tr>
                <td colSpan={7} className="text-right">CGST:</td>
                <td className="text-right">{formatINR(summary.totalGST / 2)}</td>
              </tr>
              <tr>
                <td colSpan={7} className="text-right">SGST:</td>
                <td className="text-right">{formatINR(summary.totalGST / 2)}</td>
              </tr>
            </>
          )}
          
          <tr className="grand-total-row">
            <td colSpan={7} className="text-right uppercase tracking-wider text-xs">Grand Total:</td>
            <td className="text-right text-lg">{formatINR(summary.totalAmount)}</td>
          </tr>
        </tbody>
      </table>
      
      <div className="mt-4 p-3 bg-gray-50 border rounded text-sm" style={{ borderColor: 'var(--doc-border)' }}>
        <span className="font-bold">Amount in Words: </span>
        <span className="italic capitalize">Rupees {amountInWords(summary.totalAmount)} Only</span>
      </div>
    </PageWrapper>
  );
}
