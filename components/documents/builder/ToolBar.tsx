'use client';

import React from 'react';
import { 
  ZoomIn, ZoomOut, Save, Download, Printer, 
  Share2, Send, LayoutTemplate, Columns 
} from 'lucide-react';

interface ToolBarProps {
  title: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSave: () => void;
  status: string;
  actions?: React.ReactNode;
}

export function ToolBar({ title, zoom, onZoomChange, onSave, status, actions }: ToolBarProps) {
  return (
    <div className="pdf-toolbar">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-white font-medium">
          <LayoutTemplate className="w-5 h-5 text-[#f7c600]" />
          <span contentEditable suppressContentEditableWarning className="outline-none focus:border-b focus:border-[#f7c600]">
            {title}
          </span>
        </div>
        <div className="flex items-center px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white/70">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
          {status}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actions && <div className="flex items-center gap-1 mr-2">{actions}</div>}
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <button 
          className="builder-btn-icon" 
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium w-12 text-center text-white/80">
          {Math.round(zoom * 100)}%
        </span>
        <button 
          className="builder-btn-icon" 
          onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button className="builder-btn-icon" title="View Options">
          <Columns className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <button className="builder-btn builder-btn-secondary" onClick={onSave}>
          <Save className="w-4 h-4" />
          <span>Save Draft</span>
        </button>
        <button className="builder-btn builder-btn-secondary">
          <Share2 className="w-4 h-4" />
        </button>
        <button className="builder-btn builder-btn-secondary">
          <Send className="w-4 h-4" />
        </button>
        <button className="builder-btn builder-btn-primary">
          <Download className="w-4 h-4" />
          <span className="text-black">Generate PDF</span>
        </button>
      </div>
    </div>
  );
}
