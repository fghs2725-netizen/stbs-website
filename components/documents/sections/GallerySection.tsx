import React from 'react';
import { AttachmentData } from '@/lib/documents/types';
import PageWrapper from '../shared/PageWrapper';

interface GallerySectionProps {
  attachments: AttachmentData[];
  pageNumber: number;
  totalPages: number;
}

export default function GallerySection({ attachments, pageNumber, totalPages }: GallerySectionProps) {
  // Filter for image attachments
  const images = attachments.filter(att => 
    att.fileUrl && (att.fileUrl.endsWith('.jpg') || att.fileUrl.endsWith('.jpeg') || att.fileUrl.endsWith('.png') || att.fileUrl.startsWith('data:image'))
  );

  if (!images || images.length === 0) return null;

  return (
    <PageWrapper pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="text-xl font-bold font-oswald mb-6 pb-2 border-b-2" style={{ color: 'var(--doc-primary)', borderColor: 'var(--doc-accent)' }}>
        PROJECT GALLERY
      </h2>
      
      <div className="grid grid-cols-2 gap-6">
        {images.map((img, index) => (
          <div key={index} className="border rounded overflow-hidden shadow-sm bg-white" style={{ borderColor: 'var(--doc-border)' }}>
            <div className="h-48 bg-gray-100 relative">
              <img src={img.fileUrl} alt={img.fileName || `Gallery Image ${index + 1}`} className="w-full h-full object-cover" />
            </div>
            <div className="p-3 border-t bg-gray-50">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--doc-primary)' }}>{img.fileName}</p>
              {img.caption && <p className="text-xs text-gray-600 mt-1 truncate">{img.caption}</p>}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
