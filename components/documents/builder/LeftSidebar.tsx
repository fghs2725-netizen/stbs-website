'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, ChevronRight, GripVertical, FileText, 
  Layout, Image as ImageIcon, Type, Plus, ToggleLeft, ToggleRight
} from 'lucide-react';

interface LeftSidebarProps {
  sections: any[];
  activeSectionId: string | null;
  onSectionClick: (id: string) => void;
  onSectionToggle: (id: string, enabled: boolean) => void;
}

export function LeftSidebar({ sections, activeSectionId, onSectionClick, onSectionToggle }: LeftSidebarProps) {
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    'sections': true,
    'branding': false,
  });

  const togglePanel = (panel: string) => {
    setOpenPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  return (
    <div className="pdf-left-sidebar pdf-scrollable">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-bold font-oswald tracking-wide">DOCUMENT STRUCTURE</h2>
      </div>

      <div className="flex-1">
        <AccordionPanel 
          title="Sections" 
          isOpen={openPanels['sections']} 
          onToggle={() => togglePanel('sections')}
          icon={<Layout className="w-4 h-4" />}
        >
          <div className="flex flex-col gap-2">
            {sections.map((section) => (
              <div 
                key={section.id} 
                className={`section-item ${activeSectionId === section.id ? 'active' : ''}`}
                onClick={() => onSectionClick(section.id)}
              >
                <div className="section-drag-handle">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-white/60" />
                  <span className="text-sm font-medium">{section.title || section.type}</span>
                </div>
                <div 
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSectionToggle(section.id, !section.visible);
                  }}
                >
                  {section.visible ? 
                    <ToggleRight className="w-5 h-5 text-[#f7c600]" /> : 
                    <ToggleLeft className="w-5 h-5 text-white/40" />
                  }
                </div>
              </div>
            ))}
          </div>
        </AccordionPanel>

        <AccordionPanel 
          title="Branding & Colors" 
          isOpen={openPanels['branding']} 
          onToggle={() => togglePanel('branding')}
          icon={<ImageIcon className="w-4 h-4" />}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/60 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-[#1e3a5f] border border-white/20"></div>
                <input type="text" className="builder-input flex-1" value="#1E3A5F" readOnly />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-[#f7c600] border border-white/20"></div>
                <input type="text" className="builder-input flex-1" value="#F7C600" readOnly />
              </div>
            </div>
          </div>
        </AccordionPanel>
      </div>
    </div>
  );
}

function AccordionPanel({ title, isOpen, onToggle, children, icon }: any) {
  return (
    <div className="border-b border-white/5">
      <div className="accordion-header" onClick={onToggle}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronRight className="w-4 h-4 text-white/60" />}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="accordion-content">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
