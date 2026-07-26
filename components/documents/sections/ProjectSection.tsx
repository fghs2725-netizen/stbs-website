import React from 'react';
import { DocumentState } from '@/lib/documents/types';
import PageWrapper from '../shared/PageWrapper';

interface ProjectSectionProps {
  document: DocumentState;
  pageNumber: number;
  totalPages: number;
}

export default function ProjectSection({ document, pageNumber, totalPages }: ProjectSectionProps) {
  const { projectName, projectAddress, scopeOfWork, specifications } = document;
  
  if (!projectName && !projectAddress && !scopeOfWork && !specifications) return null;

  return (
    <PageWrapper pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="text-xl font-bold font-oswald mb-6 pb-2 border-b-2" style={{ color: 'var(--doc-primary)', borderColor: 'var(--doc-accent)' }}>
        PROJECT DETAILS & SCOPE OF WORK
      </h2>
      
      <div className="space-y-6">
        {projectName && (
          <div>
            <h3 className="font-bold text-lg mb-2 uppercase tracking-wide text-gray-700">Project Name</h3>
            <div className="p-4 bg-gray-50 rounded border text-sm" style={{ borderColor: 'var(--doc-border)' }}>
              {projectName}
            </div>
          </div>
        )}
        
        {projectAddress && (
          <div>
            <h3 className="font-bold text-lg mb-2 uppercase tracking-wide text-gray-700">Project Address</h3>
            <div className="p-4 bg-gray-50 rounded border text-sm" style={{ borderColor: 'var(--doc-border)' }}>
              {projectAddress}
            </div>
          </div>
        )}
        
        {scopeOfWork && (
          <div>
            <h3 className="font-bold text-lg mb-2 uppercase tracking-wide text-gray-700">Scope of Work</h3>
            <div className="p-4 bg-white rounded border border-l-4 text-sm whitespace-pre-wrap leading-relaxed" style={{ borderColor: 'var(--doc-border)', borderLeftColor: 'var(--doc-primary)' }}>
              {scopeOfWork}
            </div>
          </div>
        )}
        
        {specifications && (
          <div>
            <h3 className="font-bold text-lg mb-2 uppercase tracking-wide text-gray-700">Technical Specifications</h3>
            <div className="p-4 bg-gray-50 rounded border text-sm whitespace-pre-wrap leading-relaxed" style={{ borderColor: 'var(--doc-border)' }}>
              {specifications}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
