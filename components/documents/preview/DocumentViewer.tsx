'use client';

import { useState } from 'react';
import { ZoomIn, ZoomOut, Download, Printer, Share2, Search, Maximize, PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import ThumbnailNav from './ThumbnailNav';

interface DocumentViewerProps {
  pages: React.ReactNode[];
  documentTitle: string;
  onDownload?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
}

export default function DocumentViewer({ pages, documentTitle, onDownload, onPrint, onShare }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  return (
    <div className="flex flex-col h-full w-full bg-[#1b1b1b] overflow-hidden text-gray-200">
      {/* Top Toolbar */}
      <div className="h-14 bg-[#090909] border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-gray-800 rounded-md transition-colors"
            title="Toggle Sidebar"
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          <div className="h-6 w-px bg-gray-700 mx-2" />
          <span className="font-medium text-sm truncate max-w-[200px] sm:max-w-xs">{documentTitle}</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-4">
          <div className="flex items-center bg-gray-900 rounded-md p-1 border border-gray-800">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="p-1 hover:bg-gray-700 rounded transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-2 font-mono">{currentPage} / {pages.length}</span>
            <button onClick={() => setCurrentPage(Math.min(pages.length, currentPage + 1))} className="p-1 hover:bg-gray-700 rounded transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-700 mx-1 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-1 bg-gray-900 rounded-md p-1 border border-gray-800">
            <button onClick={handleZoomOut} className="p-1 hover:bg-gray-700 rounded transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs w-12 text-center font-mono">{zoom}%</span>
            <button onClick={handleZoomIn} className="p-1 hover:bg-gray-700 rounded transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-700 mx-1 hidden sm:block" />
          
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-gray-800 rounded-md transition-colors" title="Search">
              <Search className="w-4 h-4" />
            </button>
            {onDownload && (
              <button onClick={onDownload} className="p-1.5 hover:bg-gray-800 rounded-md transition-colors" title="Download">
                <Download className="w-4 h-4" />
              </button>
            )}
            {onPrint && (
              <button onClick={onPrint} className="p-1.5 hover:bg-gray-800 rounded-md transition-colors" title="Print">
                <Printer className="w-4 h-4" />
              </button>
            )}
            {onShare && (
              <button onClick={onShare} className="p-1.5 hover:bg-gray-800 rounded-md transition-colors" title="Share">
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-64 border-r border-gray-800 bg-[#0b0b0b] shrink-0 flex flex-col">
            <div className="p-3 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Pages
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <ThumbnailNav 
                totalPages={pages.length} 
                currentPage={currentPage} 
                onPageSelect={setCurrentPage} 
              />
            </div>
          </div>
        )}

        {/* Document Scroll Area */}
        <div className="flex-1 bg-gray-200 overflow-auto relative flex flex-col items-center py-8">
          <div 
            className="bg-white shadow-2xl transition-transform origin-top"
            style={{ 
              width: '800px', 
              minHeight: '1131px', // A4 proportion
              transform: `scale(${zoom / 100})`,
              marginBottom: `${(zoom / 100) * 40}px`
            }}
          >
            {pages[currentPage - 1]}
          </div>
        </div>
      </div>
    </div>
  );
}
