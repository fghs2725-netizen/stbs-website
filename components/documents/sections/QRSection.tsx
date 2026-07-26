import React from 'react';

interface QRSectionProps {
  verificationCode: string;
  documentRef: string;
  qrDataUrl?: string;
  date?: string;
}

export default function QRSection({ verificationCode, documentRef, qrDataUrl, date }: QRSectionProps) {
  return (
    <div className="doc-section-break mt-8 flex items-center p-4 bg-gray-50 border rounded-lg" style={{ borderColor: 'var(--doc-border)' }}>
      <div className="flex-shrink-0 w-24 h-24 bg-white border border-gray-200 p-1 flex items-center justify-center rounded">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
        ) : (
          <div className="text-xs text-center text-gray-400">QR Code<br/>Placeholder</div>
        )}
      </div>
      <div className="ml-6">
        <h4 className="font-bold text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--doc-primary)' }}>Document Verification</h4>
        <p className="text-xs text-gray-600 mb-2">Scan the QR code to verify the authenticity of this document online.</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
          <p><span className="text-gray-500">Ref:</span> <span className="font-semibold">{documentRef}</span></p>
          <p><span className="text-gray-500">Code:</span> <span className="font-semibold">{verificationCode}</span></p>
          {date && <p><span className="text-gray-500">Date:</span> <span className="font-semibold">{date}</span></p>}
        </div>
      </div>
    </div>
  );
}
