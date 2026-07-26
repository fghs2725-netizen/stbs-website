import React from 'react';

interface DocumentFooterProps {
  pageNumber: number;
  totalPages: number;
  companyName?: string;
}

export default function DocumentFooter({
  pageNumber,
  totalPages,
  companyName = 'STBS Enterprise',
}: DocumentFooterProps) {
  return (
    <footer className="pt-4 mt-auto border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
      <div>
        <p className="font-semibold" style={{ color: 'var(--doc-primary)' }}>{companyName}</p>
        <p>This is a computer generated document.</p>
      </div>
      <div className="font-medium">
        Page {pageNumber} of {totalPages}
      </div>
    </footer>
  );
}
