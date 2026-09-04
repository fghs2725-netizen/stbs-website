'use client';

import React from 'react';
import { Settings2, Plus, Trash2 } from 'lucide-react';

interface RightSidebarProps {
  activeSection: any;
  documentData: any;
  updateData: (sectionId: string, data: any) => void;
  updateField: (field: string, value: any) => void;
  items: any[];
  addItem: () => void;
  updateItem: (itemId: string, field: string, value: any) => void;
  removeItem: (itemId: string) => void;
}

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RightSidebar({ activeSection, documentData, updateField, items, addItem, updateItem, removeItem }: RightSidebarProps) {
  if (!activeSection) {
    return (
      <div className="pdf-right-sidebar flex items-center justify-center text-white/40 text-sm">
        <div className="flex flex-col items-center gap-2">
          <Settings2 className="w-8 h-8 opacity-50" />
          <p>Select a section to edit properties</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection.type) {
      case 'cover':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/60 mb-1">Document Title</label>
              <input type="text" className="builder-input" value={documentData?.title || ''} onChange={e => updateField('title', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Subject</label>
              <input type="text" className="builder-input" value={documentData?.subject || ''} onChange={e => updateField('subject', e.target.value)} placeholder="e.g. Price Offer for Borewell Construction" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Client Name</label>
              <input type="text" className="builder-input" value={documentData?.clientName || ''} onChange={e => updateField('clientName', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Client Company</label>
              <input type="text" className="builder-input" value={documentData?.clientCompany || ''} onChange={e => updateField('clientCompany', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Client Email</label>
              <input type="email" className="builder-input" value={documentData?.clientEmail || ''} onChange={e => updateField('clientEmail', e.target.value)} />
            </div>
          </div>
        );
      case 'boq':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Items ({items.length})</span>
              <button onClick={addItem} className="builder-btn-icon text-signal">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {items.length === 0 && (
                <p className="text-xs text-white/40 text-center py-4">No items yet. Click + to add one.</p>
              )}
              {items.map((item, index) => (
                <div key={item.id} className="p-3 bg-white/5 rounded-lg border border-white/10 relative group">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 p-3 text-white/40 hover:text-red-400 transition-colors"
                    aria-label={`Delete item ${item.description || index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      className="builder-input bg-black/20 border-transparent text-sm w-full pr-12"
                      placeholder="Item Description" 
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input 
                        type="text" 
                        className="builder-input bg-black/20 border-transparent text-sm" 
                        placeholder="Unit" 
                        value={item.unit}
                        onChange={e => updateItem(item.id, 'unit', e.target.value)}
                      />
                      <input 
                        type="number" 
                        className="builder-input bg-black/20 border-transparent text-sm" 
                        placeholder="Qty" 
                        value={item.quantity || ''}
                        onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                      <input 
                        type="number" 
                        className="builder-input bg-black/20 border-transparent text-sm" 
                        placeholder="Rate" 
                        value={item.rate || ''}
                        onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-white/50">
                      <span>Amount: {formatCurrency(item.amount)}</span>
                      <span>GST: {formatCurrency(item.gstAmount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t border-white/10 mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Total</span>
                <span className="text-sm font-bold text-signal">{formatCurrency(documentData?.totalAmount || 0)}</span>
              </div>
            </div>
          </div>
        );
      case 'terms':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/60 mb-1">Notes</label>
              <textarea 
                className="builder-input builder-textarea" 
                value={documentData?.notes || ''}
                onChange={e => updateField('notes', e.target.value)}
                placeholder="Additional notes for this document..."
                rows={6}
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Terms & Conditions</label>
              <textarea 
                className="builder-input builder-textarea" 
                value={documentData?.terms || ''}
                onChange={e => updateField('terms', e.target.value)}
                placeholder="Standard terms and conditions..."
                rows={8}
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="text-sm text-white/60">
            <p>This section is generated automatically and has no editable properties.</p>
          </div>
        );
    }
  };

  return (
    <div className="pdf-right-sidebar pdf-scrollable">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-lg font-bold font-display tracking-wide uppercase">{activeSection.title || activeSection.type} Properties</h2>
      </div>
      <div className="p-4">
        {renderContent()}
      </div>
    </div>
  );
}
