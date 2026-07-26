import React from 'react';
import { DocumentState } from '@/lib/documents/types';
import PageWrapper from '../shared/PageWrapper';

interface ClientSectionProps {
  document: DocumentState;
  pageNumber: number;
  totalPages: number;
}

export default function ClientSection({ document, pageNumber, totalPages }: ClientSectionProps) {
  const { client } = document;
  
  return (
    <PageWrapper pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="text-xl font-bold font-oswald mb-6 pb-2 border-b-2" style={{ color: 'var(--doc-primary)', borderColor: 'var(--doc-accent)' }}>
        CLIENT & COMPANY DETAILS
      </h2>
      
      <div className="grid grid-cols-2 gap-8">
        <div className="p-4 border rounded bg-gray-50" style={{ borderColor: 'var(--doc-border)' }}>
          <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--doc-primary)' }}>Client Details</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold w-24 inline-block text-gray-600">Company:</span> {client?.companyName || 'N/A'}</p>
            <p><span className="font-semibold w-24 inline-block text-gray-600">Contact:</span> {client?.contactPerson || 'N/A'}</p>
            <p><span className="font-semibold w-24 inline-block text-gray-600">GSTIN:</span> {client?.gstNumber || 'N/A'}</p>
            <p><span className="font-semibold w-24 inline-block text-gray-600">Phone:</span> {client?.phone || 'N/A'}</p>
            <p><span className="font-semibold w-24 inline-block text-gray-600">Email:</span> {client?.email || 'N/A'}</p>
            <p className="flex"><span className="font-semibold w-24 flex-shrink-0 text-gray-600">Billing Address:</span> <span>{client?.addressLine1 || 'N/A'}{client?.addressLine2 ? `, ${client.addressLine2}` : ''}</span></p>
            {client?.siteAddress && (
              <p className="flex"><span className="font-semibold w-24 flex-shrink-0 text-gray-600">Site Address:</span> <span>{client?.siteAddress}</span></p>
            )}
          </div>
        </div>
        
        <div className="p-4 border rounded" style={{ borderColor: 'var(--doc-border)' }}>
          <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--doc-primary)' }}>Company Details</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold w-24 inline-block text-gray-600">Company:</span> STBS Enterprise</p>
            <p><span className="font-semibold w-24 inline-block text-gray-600">GSTIN:</span> 27AAAAA0000A1Z5</p>
            <p><span className="font-semibold w-24 inline-block text-gray-600">PAN:</span> AAAAA0000A</p>
            <p><span className="font-semibold w-24 inline-block text-gray-600">Phone:</span> +91 98765 43210</p>
            <p><span className="font-semibold w-24 inline-block text-gray-600">Email:</span> info@stbs.com</p>
            <p className="flex"><span className="font-semibold w-24 flex-shrink-0 text-gray-600">Address:</span> <span>123 Industrial Area, Phase 1, City, State, India 400001</span></p>
            <p className="flex mt-2 pt-2 border-t border-gray-200">
              <span className="font-semibold w-24 flex-shrink-0 text-gray-600">Bank Details:</span> 
              <span>State Bank of India<br/>A/C: 12345678901<br/>IFSC: SBIN0001234</span>
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
