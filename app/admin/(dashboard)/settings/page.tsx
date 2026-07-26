import Link from 'next/link';
import { Building2, Palette, PenTool, Percent, Scale, Droplets, LayoutTemplate, Sparkles } from 'lucide-react';

const settingsGroups = [
  {
    title: 'General',
    items: [
      { name: 'Company Information', icon: Building2, desc: 'Manage company details, addresses, and contacts', href: '/admin/settings/company' },
      { name: 'Branding & Logo', icon: Palette, desc: 'Update logos, brand colors, and visual identity', href: '/admin/settings/branding' },
    ]
  },
  {
    title: 'Document Configuration',
    items: [
      { name: 'Signatures', icon: PenTool, desc: 'Manage authorized signatories and digital stamps', href: '/admin/settings/signatures' },
      { name: 'Tax Configuration', icon: Percent, desc: 'Set up VAT, GST, and default tax rates', href: '/admin/settings/taxes' },
      { name: 'Terms & Conditions', icon: Scale, desc: 'Manage standard T&Cs for different document types', href: '/admin/settings/terms' },
    ]
  },
  {
    title: 'Appearance',
    items: [
      { name: 'Document Templates', icon: LayoutTemplate, desc: 'Configure default layouts and boilerplate content', href: '/admin/settings/templates' },
      { name: 'PDF Themes', icon: Sparkles, desc: 'Manage colors and typography for generated PDFs', href: '/admin/settings/themes' },
      { name: 'Watermarks', icon: Droplets, desc: 'Configure draft and confidential watermarks', href: '/admin/settings/watermarks' },
    ]
  }
];

export default function SettingsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-oswald font-bold tracking-tight text-white mb-2">Settings</h1>
        <p className="text-gray-400">Configure your document management system preferences.</p>
      </div>

      <div className="space-y-8">
        {settingsGroups.map((group, i) => (
          <div key={i}>
            <h2 className="text-lg font-medium text-white mb-4 pl-2 border-l-2 border-signal">{group.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((item, j) => (
                <Link key={j} href={item.href}>
                  <div className="group p-5 rounded-2xl bg-steel/40 border border-white/5 hover:border-white/10 hover:bg-steel/60 transition-all backdrop-blur-sm h-full">
                    <div className="flex items-start">
                      <div className="p-2.5 rounded-xl bg-surface border border-white/5 text-gray-400 group-hover:text-signal group-hover:border-signal/30 transition-colors shrink-0">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-200 group-hover:text-white mb-1 transition-colors">{item.name}</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
