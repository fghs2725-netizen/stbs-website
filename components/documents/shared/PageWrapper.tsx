import React from 'react';
import DocumentHeader from './DocumentHeader';
import DocumentFooter from './DocumentFooter';
import '../sections/document-sections.css';

interface PageWrapperProps {
  pageNumber: number;
  totalPages: number;
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  themeColor?: string;
  accentColor?: string;
}

export default function PageWrapper({
  pageNumber,
  totalPages,
  children,
  showHeader = true,
  showFooter = true,
  themeColor = 'var(--doc-primary)',
  accentColor = 'var(--doc-accent)',
}: PageWrapperProps) {
  return (
    <div className="document-page-wrapper">
      {showHeader && (
        <DocumentHeader themeColor={themeColor} accentColor={accentColor} />
      )}
      <main className="flex-grow py-6">
        {children}
      </main>
      {showFooter && (
        <DocumentFooter pageNumber={pageNumber} totalPages={totalPages} />
      )}
    </div>
  );
}
