import React from 'react';
import { DocumentState } from '@/lib/documents/types';
import { Building2 } from 'lucide-react';
import PageWrapper from '../shared/PageWrapper';
import '../document-sections.css';

interface CoverPageProps {
  document: DocumentState;
  themeColor?: string;
  accentColor?: string;
  pageNumber: number;
  totalPages: number;
}

export default function CoverPage({
  document,
  themeColor = 'var(--doc-primary)',
  accentColor = 'var(--doc-accent)',
  pageNumber,
  totalPages,
}: CoverPageProps) {
  const { title, reference, date, validUntil, projectName, projectAddress, client } = document;

  return (
    <PageWrapper pageNumber={pageNumber} totalPages={totalPages} showHeader={false} showFooter={false}>
      <div className="cover-page pt-12 pb-8 px-8 h-full flex flex-col z-10 relative">
        <div className="cover-header flex justify-between items-start" style={{ borderBottomColor: accentColor }}>
          <div>
            <Building2 size={64} style={{ color: themeColor }} />
            <h1 className="text-4xl font-bold font-oswald mt-4" style={{ color: themeColor }}>STBS Enterprise</h1>
            <p className="text-lg text-gray-500">Excellence in Engineering Solutions</p>
          </div>
          <div className="text-right">
            <h2 className="text-5xl font-bold font-oswald tracking-wider uppercase mb-2" style={{ color: themeColor }}>
              {title}
            </h2>
            <p className="text-xl font-semibold bg-gray-100 inline-block px-4 py-1 rounded">
              Ref: {reference}
            </p>
          </div>
        </div>

        <div className="flex-grow flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-12">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Project Details</h3>
              <p className="text-2xl font-bold mb-2" style={{ color: themeColor }}>{projectName || 'Project Name'}</p>
              <p className="text-gray-600">{projectAddress || 'Project Address'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Prepared For</h3>
              <p className="text-2xl font-bold mb-2">{client?.companyName || 'Client Name'}</p>
              <p className="text-gray-600 mb-1">{client?.contactPerson}</p>
              <p className="text-gray-600 whitespace-pre-wrap">{client?.addressLine1}</p>
            </div>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-4 border-t pt-8" style={{ borderColor: 'var(--doc-border)' }}>
          <div>
            <p className="text-sm text-gray-500 mb-1">Date</p>
            <p className="font-semibold">{date}</p>
          </div>
          {validUntil && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Valid Until</p>
              <p className="font-semibold">{validUntil}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500 mb-1">Prepared By</p>
            <p className="font-semibold">Engineering Team</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
