'use client';

import React, { useState, useCallback } from 'react';
import './builder.css';
import { ToolBar } from './ToolBar';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { LivePreview } from './LivePreview';
import { VersionHistoryPanel } from '@/components/documents/versions/VersionHistoryPanel';
import { VersionCompareView } from '@/components/documents/versions/VersionCompareView';
import { GitCompare, History } from 'lucide-react';

interface BuilderDocumentItem {
  id: string;
  position: number;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  gstPercent: number;
  gstAmount: number;
  hsnCode: string;
  category: string;
  notes: string;
}

interface BuilderDocumentSection {
  id: string;
  type: string;
  position: number;
  title: string;
  content: Record<string, unknown>;
  visible: boolean;
}

interface DocumentState {
  id: string;
  reference: string;
  title: string;
  type: string;
  status: string;
  subject: string;
  notes: string;
  terms: string;
  totalAmount: number;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  clientId: string;
  pdfUrl: string | null;
  sections: BuilderDocumentSection[];
  items: BuilderDocumentItem[];
  data: Record<string, any>;
}

interface PDFBuilderProps {
  initialDocument?: Partial<DocumentState> | null;
  documentType?: string;
}

const defaultSections: BuilderDocumentSection[] = [
  { id: 'sec-cover', type: 'cover', position: 0, title: 'Cover Page', content: {}, visible: true },
  { id: 'sec-items', type: 'boq', position: 1, title: 'Bill of Quantities', content: {}, visible: true },
  { id: 'sec-notes', type: 'terms', position: 2, title: 'Notes & Terms', content: {}, visible: true },
  { id: 'sec-sig', type: 'signatures', position: 3, title: 'Signatures', content: {}, visible: true },
];

function calculateItemAmount(quantity: number, rate: number): number {
  return Math.round(quantity * rate * 100) / 100;
}

function calculateItemGst(amount: number, gstPercent: number): number {
  return Math.round(amount * gstPercent) / 100;
}

export default function PDFBuilder({ initialDocument, documentType = 'INTERNAL_DOCUMENT' }: PDFBuilderProps) {
  const [document, setDocument] = useState<DocumentState>(() => ({
    id: initialDocument?.id || 'doc-' + Date.now(),
    reference: initialDocument?.reference || 'DRAFT',
    title: initialDocument?.title || 'Untitled Document',
    type: initialDocument?.type || documentType,
    status: initialDocument?.status || 'DRAFT',
    subject: initialDocument?.subject || '',
    notes: initialDocument?.notes || '',
    terms: initialDocument?.terms || '',
    totalAmount: initialDocument?.totalAmount || 0,
    clientName: initialDocument?.clientName || '',
    clientEmail: initialDocument?.clientEmail || '',
    clientCompany: initialDocument?.clientCompany || '',
    clientId: initialDocument?.clientId || '',
    pdfUrl: initialDocument?.pdfUrl || null,
    sections: initialDocument?.sections?.length ? initialDocument.sections : defaultSections,
    items: initialDocument?.items || [],
    data: {
      projectName: initialDocument?.title || 'New Document',
      clientName: initialDocument?.clientName || '',
      clientCompany: initialDocument?.clientCompany || '',
    },
  }));

  const [activeSectionId, setActiveSectionId] = useState<string | null>(document.sections[0]?.id || null);
  const [zoom, setZoom] = useState<number>(0.8);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [versionRefreshKey, setVersionRefreshKey] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  // Unsaved documents get a client-side "doc-*" id; they must be saved before
  // a PDF can be generated server-side.
  const isPersisted = !document.id.startsWith('doc-');

  const showNotice = useCallback((message: string) => {
    setPdfNotice(message);
    setTimeout(() => setPdfNotice(null), 4000);
  }, []);

  const handleGeneratePdf = useCallback(async () => {
    if (isGeneratingPdf) return;
    if (!isPersisted) {
      showNotice('Save the document first to generate a PDF.');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const res = await fetch(`/api/documents/${document.id}/pdf`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.pdfUrl) {
        setDocument(prev => ({ ...prev, pdfUrl: data.pdfUrl }));
        window.open(data.pdfUrl, '_blank', 'noopener');
      } else {
        showNotice(data?.error || 'Could not generate PDF. Try again.');
      }
    } catch {
      showNotice('Could not generate PDF. Check your connection and try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [document.id, isGeneratingPdf, isPersisted, showNotice]);

  const persistDocument = useCallback(async (updated: DocumentState) => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/documents/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updated.title,
          subject: updated.subject,
          notes: updated.notes,
          terms: updated.terms,
          clientName: updated.clientName,
          clientEmail: updated.clientEmail,
          clientCompany: updated.clientCompany,
          totalAmount: updated.totalAmount,
          items: updated.items.map((item, index) => ({
            ...item,
            position: index,
          })),
          sections: updated.sections.map((section, index) => ({
            ...section,
            position: index,
          })),
        }),
      });

      if (res.ok) {
        setSaveStatus('saved');
        setVersionRefreshKey((k) => k + 1);
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Failed to save document:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, []);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    persistDocument(document).finally(() => setIsSaving(false));
  }, [document, persistDocument]);

  const handleSectionToggle = useCallback((id: string, enabled: boolean) => {
    setDocument(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, visible: enabled } : s)
    }));
  }, []);

  const updateDocumentData = useCallback((sectionId: string, data: any) => {
    setDocument(prev => ({
      ...prev,
      data: { ...prev.data, ...data }
    }));
  }, []);

  const updateField = useCallback((field: string, value: any) => {
    setDocument(prev => ({ ...prev, [field]: value }));
  }, []);

  const addItem = useCallback(() => {
    setDocument(prev => {
      const newItem: BuilderDocumentItem = {
        id: crypto.randomUUID(),
        position: prev.items.length,
        itemCode: '',
        description: '',
        unit: 'Nos',
        quantity: 1,
        rate: 0,
        amount: 0,
        gstPercent: 18,
        gstAmount: 0,
        hsnCode: '',
        category: '',
        notes: '',
      };
      return { ...prev, items: [...prev.items, newItem] };
    });
  }, []);

  const updateItem = useCallback((itemId: string, field: string, value: any) => {
    setDocument(prev => {
      const items = prev.items.map(item => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: value };
        updated.amount = calculateItemAmount(updated.quantity, updated.rate);
        updated.gstAmount = calculateItemGst(updated.amount, updated.gstPercent);
        return updated;
      });
      const totalAmount = items.reduce((sum, item) => sum + item.amount + item.gstAmount, 0);
      return { ...prev, items, totalAmount: Math.round(totalAmount * 100) / 100 };
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setDocument(prev => {
      const items = prev.items.filter(item => item.id !== itemId);
      const totalAmount = items.reduce((sum, item) => sum + item.amount + item.gstAmount, 0);
      return { ...prev, items, totalAmount: Math.round(totalAmount * 100) / 100 };
    });
  }, []);

  const activeSection = document.sections.find(s => s.id === activeSectionId);

  return (
    <div className="pdf-builder">
      <ToolBar
        title={document.title}
        zoom={zoom}
        onZoomChange={setZoom}
        onSave={handleSave}
        onTitleChange={(title) => updateField('title', title)}
        onGeneratePdf={handleGeneratePdf}
        generatingPdf={isGeneratingPdf}
        canGeneratePdf={isPersisted && document.status !== 'CANCELLED'}
        status={saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed' : document.status}
        actions={
          <>
            <button
              onClick={() => setShowCompare(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Compare versions"
            >
              <GitCompare className="w-3.5 h-3.5" />
              Compare
            </button>
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                showVersionHistory ? 'text-gold bg-gold/10' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              title="Version history"
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
          </>
        }
      />
      
      {pdfNotice && (
        <div className="px-4 py-2 bg-red-500/15 border-b border-red-500/30 text-red-200 text-sm" role="status">
          {pdfNotice}
        </div>
      )}

      <div className="pdf-builder-content">
        <div className={`flex-shrink-0 transition-all duration-300 ${showVersionHistory ? 'w-72' : 'w-0'} overflow-hidden`}>
          {showVersionHistory && (
            <div className="w-72 h-full p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              <VersionHistoryPanel
                documentId={document.id}
                currentStatus={document.status}
                refreshKey={versionRefreshKey}
                onRestore={() => setVersionRefreshKey((k) => k + 1)}
              />
            </div>
          )}
        </div>

        <LeftSidebar 
          sections={document.sections}
          activeSectionId={activeSectionId}
          onSectionClick={setActiveSectionId}
          onSectionToggle={handleSectionToggle}
        />
        
        <LivePreview
          document={document}
          zoom={zoom}
          onZoomChange={setZoom}
        />
        
        <RightSidebar 
          activeSection={activeSection}
          documentData={document}
          updateData={updateDocumentData}
          updateField={updateField}
          items={document.items}
          addItem={addItem}
          updateItem={updateItem}
          removeItem={removeItem}
        />
      </div>

      {showCompare && (
        <VersionCompareView
          documentId={document.id}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
