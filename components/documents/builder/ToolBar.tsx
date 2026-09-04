'use client';

import React from 'react';
import { ZoomIn, ZoomOut, Save, Download, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToolBarProps {
  title: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSave: () => void;
  status: string;
  actions?: React.ReactNode;
  onTitleChange?: (title: string) => void;
  onGeneratePdf?: () => void;
  generatingPdf?: boolean;
  canGeneratePdf?: boolean;
}

export function ToolBar({ title, zoom, onZoomChange, onSave, status, actions, onTitleChange, onGeneratePdf, generatingPdf = false, canGeneratePdf = true }: ToolBarProps) {
  const generateDisabled = !canGeneratePdf || generatingPdf;

  return (
    <div className="pdf-toolbar flex-wrap">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <LayoutTemplate className="w-5 h-5 text-[#f7c600] flex-shrink-0" />
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          placeholder="Untitled Document"
          aria-label="Document title"
          className="min-w-0 flex-1 max-w-xs bg-transparent border border-transparent hover:border-white/10 focus:border-[#f7c600] rounded px-1.5 py-1 outline-none text-white font-medium"
        />
        <div className="hidden sm:flex items-center px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white/70 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
          {status}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actions && <div className="flex items-center gap-1 mr-1">{actions}</div>}
        <div className="w-px h-6 bg-white/10 mx-1 hidden md:block"></div>
        <button
          type="button"
          className="builder-btn-icon"
          onClick={() => onZoomChange(Math.max(0.3, zoom - 0.1))}
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium w-12 text-center text-white/80">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="builder-btn-icon"
          onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
          title="Zoom In"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ml-2"
          onClick={onSave}
          title="Save draft"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Save Draft</span>
        </Button>
        {onGeneratePdf && (
          <Button
            type="button"
            size="sm"
            onClick={onGeneratePdf}
            disabled={generateDisabled}
            title={generateDisabled && !generatingPdf ? 'Save the document first to generate a PDF' : 'Generate and open the PDF'}
          >
            <Download className="w-4 h-4" />
            <span className="text-black">{generatingPdf ? 'Generating…' : 'Generate PDF'}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
