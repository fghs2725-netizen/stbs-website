import React from 'react';
import { Building2, Phone, Mail, Globe } from 'lucide-react';

interface DocumentHeaderProps {
  logoUrl?: string;
  companyName?: string;
  tagline?: string;
  themeColor?: string;
  accentColor?: string;
}

export default function DocumentHeader({
  logoUrl,
  companyName = 'STBS Enterprise',
  tagline = 'Excellence in Engineering',
  themeColor = 'var(--doc-primary)',
  accentColor = 'var(--doc-accent)',
}: DocumentHeaderProps) {
  return (
    <header className="flex justify-between items-start pb-4" style={{ borderBottom: `3px solid ${accentColor}` }}>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
        ) : (
          <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-lg" style={{ color: themeColor }}>
            <Building2 size={32} />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold font-oswald m-0 leading-tight" style={{ color: themeColor }}>{companyName}</h1>
          <p className="text-sm font-medium text-gray-500 m-0">{tagline}</p>
        </div>
      </div>
      <div className="text-right text-xs text-gray-600 flex flex-col gap-1">
        <div className="flex items-center justify-end gap-2">
          <span>+91 98765 43210</span>
          <Phone size={12} style={{ color: themeColor }} />
        </div>
        <div className="flex items-center justify-end gap-2">
          <span>info@stbs.com</span>
          <Mail size={12} style={{ color: themeColor }} />
        </div>
        <div className="flex items-center justify-end gap-2">
          <span>www.stbs.com</span>
          <Globe size={12} style={{ color: themeColor }} />
        </div>
      </div>
    </header>
  );
}
