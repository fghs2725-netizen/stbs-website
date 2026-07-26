import React from 'react';
import { SignatureData } from '@/lib/documents/types';

interface SignatureSectionProps {
  signatures: SignatureData[];
}

export default function SignatureSection({ signatures }: SignatureSectionProps) {
  if (!signatures || signatures.length === 0) return null;

  return (
    <div className="doc-section-break mt-12 pt-8 border-t-2 border-gray-200">
      <h3 className="font-bold uppercase tracking-wider text-sm text-gray-500 mb-6">Authorized Signatures</h3>
      <div className="signature-grid">
        {signatures.map((sig, index) => (
          <div key={index} className="signature-block">
            <div className="signature-line relative">
              {sig.imageUrl && (
                <img 
                  src={sig.imageUrl} 
                  alt={`${sig.name} Signature`} 
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 max-h-16 object-contain mix-blend-multiply"
                />
              )}
            </div>
            <p className="font-bold text-sm">{sig.name || '_________________'}</p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{sig.title}</p>
            {sig.date && <p className="text-xs text-gray-400 mt-2">Date: {sig.date}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
