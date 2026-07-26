import React from 'react';
import { TimelinePhase } from '@/lib/documents/types';
import PageWrapper from '../shared/PageWrapper';

interface TimelineSectionProps {
  phases: TimelinePhase[];
  pageNumber: number;
  totalPages: number;
}

export default function TimelineSection({ phases, pageNumber, totalPages }: TimelineSectionProps) {
  if (!phases || phases.length === 0) return null;

  return (
    <PageWrapper pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="text-xl font-bold font-oswald mb-8 pb-2 border-b-2" style={{ color: 'var(--doc-primary)', borderColor: 'var(--doc-accent)' }}>
        PROJECT TIMELINE
      </h2>
      
      <div className="timeline-container">
        <div className="timeline-line"></div>
        
        {phases.map((phase, index) => (
          <div key={index} className="timeline-item">
            <div className={`timeline-dot ${phase.status || ''}`}>
              <span className="text-[10px] font-bold">{index + 1}</span>
            </div>
            
            <div className="bg-white p-4 rounded border shadow-sm ml-4" style={{ borderColor: 'var(--doc-border)' }}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg" style={{ color: 'var(--doc-primary)' }}>{phase.title}</h3>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 uppercase tracking-wider text-gray-600">
                  {phase.startDate && phase.endDate ? `${phase.startDate} – ${phase.endDate}` : phase.startDate || phase.endDate || 'TBD'}
                </span>
              </div>
              <p className="text-sm text-gray-600">{phase.description}</p>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
