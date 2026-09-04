'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Briefcase, FileSignature, Receipt, ChevronRight, Check } from 'lucide-react';
import { DOCUMENT_TYPE_CONFIGS } from '@/lib/documents/template-registry';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';

export default function NewDocumentPage() {
  return (
    <Suspense fallback={null}>
      <NewDocumentForm />
    </Suspense>
  );
}

function NewDocumentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // QuickActions and the quotations cross-link arrive with ?type=…; honour
  // it so staff land one tap away from Continue.
  const preselect = searchParams.get('type') || '';
  const validPreselect = preselect in DOCUMENT_TYPE_CONFIGS ? preselect : null;
  const [selectedType, setSelectedType] = useState<string | null>(validPreselect);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          title: `New ${DOCUMENT_TYPE_CONFIGS[selectedType as keyof typeof DOCUMENT_TYPE_CONFIGS]?.name || 'Document'}`,
        }),
      });
      
      const data = await res.json();
      if (data.id) {
        router.push(`/admin/documents/${data.id}/builder`);
      }
    } catch (error) {
      console.error('Failed to create document', error);
      setIsSubmitting(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'QUOTATION': return <Briefcase className="w-8 h-8" />;
      case 'INVOICE': return <Receipt className="w-8 h-8" />;
      case 'CONTRACT': return <FileSignature className="w-8 h-8" />;
      default: return <FileText className="w-8 h-8" />;
    }
  };

  return (
    <div className="admin-page max-w-5xl">
      <PageHeader eyebrow="Documents" title={selectedType === 'QUOTATION' ? 'New quotation' : 'New document'} description={selectedType ? `Create a new ${DOCUMENT_TYPE_CONFIGS[selectedType as keyof typeof DOCUMENT_TYPE_CONFIGS].name.toLowerCase()}.` : 'Select a document type to continue.'} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {Object.entries(DOCUMENT_TYPE_CONFIGS).map(([type, config]) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            aria-pressed={selectedType === type}
            className={`relative min-h-48 text-left group rounded-xl border ${
              selectedType === type 
                ? 'bg-signal/5 border-signal' 
                : 'bg-steel/40 border-white/10 hover:border-white/20 hover:bg-steel/80'
            } p-6 transition-all duration-300 overflow-hidden backdrop-blur-md`}
          >
            {selectedType === type && (
              <div className="absolute top-4 right-4 bg-signal text-ink p-1 rounded-full">
                <Check className="w-4 h-4" />
              </div>
            )}
            
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
              selectedType === type ? 'bg-signal text-ink' : 'bg-surface border border-white/5 text-gray-400 group-hover:text-white'
            } transition-colors`}>
              {getIconForType(type)}
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">{config.name}</h3>
            <p className="text-sm text-gray-400 mb-6 line-clamp-2">
              Create a standard STBS enterprise {config.name.toLowerCase()} with approved formatting and terms.
            </p>
            
            <div className="space-y-2">
              {config.supportedSections.slice(0, 3).map((section) => (
                <div key={section} className="flex items-center text-xs text-gray-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 mr-2"></div>
                  Supports {section} section
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-6 border-t border-white/10">
        <Button
          onClick={() => router.back()}
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!selectedType || isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Continue'}
          {!isSubmitting && <ChevronRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
