'use client';

import { useState, useEffect } from 'react';
import { Save, Building2, Loader2, Check } from 'lucide-react';

interface CompanyData {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  phone1: string;
  phone2: string;
  email: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  gstNumber: string;
  panNumber: string;
  cinNumber: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankBranch: string;
  directorName: string;
  directorTitle: string;
}

const defaultCompany: CompanyData = {
  name: 'Saini Tubewell Boring Service',
  shortName: 'STBS',
  tagline: 'Drilling deep. Building trust.',
  description: '',
  logoUrl: '',
  bannerUrl: '',
  phone1: '',
  phone2: '',
  email: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: 'Sonipat',
  state: 'Haryana',
  pinCode: '',
  country: 'India',
  gstNumber: '',
  panNumber: '',
  cinNumber: '',
  bankName: '',
  bankAccountNo: '',
  bankIfsc: '',
  bankBranch: '',
  directorName: '',
  directorTitle: '',
};

export default function CompanySettingsPage() {
  const [company, setCompany] = useState<CompanyData>(defaultCompany);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings/company')
      .then(res => res.json())
      .then(data => {
        if (data && data.id) {
          setCompany({
            name: data.name || defaultCompany.name,
            shortName: data.shortName || defaultCompany.shortName,
            tagline: data.tagline || defaultCompany.tagline,
            description: data.description || '',
            logoUrl: data.logoUrl || '',
            bannerUrl: data.bannerUrl || '',
            phone1: data.phone1 || '',
            phone2: data.phone2 || '',
            email: data.email || '',
            website: data.website || '',
            addressLine1: data.addressLine1 || '',
            addressLine2: data.addressLine2 || '',
            city: data.city || '',
            state: data.state || '',
            pinCode: data.pinCode || '',
            country: data.country || 'India',
            gstNumber: data.gstNumber || '',
            panNumber: data.panNumber || '',
            cinNumber: data.cinNumber || '',
            bankName: data.bankName || '',
            bankAccountNo: data.bankAccountNo || '',
            bankIfsc: data.bankIfsc || '',
            bankBranch: data.bankBranch || '',
            directorName: data.directorName || '',
            directorTitle: data.directorTitle || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (field: keyof CompanyData, value: string) => {
    setCompany(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company),
      });
      if (res.ok) setSaved(true);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white mb-1">Company Information</h1>
          <p className="text-gray-400 text-sm">Manage your company details, addresses, and contacts.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-signal text-ink text-sm font-bold rounded-lg hover:bg-signal/90 transition-colors disabled:opacity-70"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      {/* Basic Info */}
      <Section title="Basic Information" icon={<Building2 className="w-5 h-5" />}>
        <Field label="Company Name" value={company.name} onChange={v => update('name', v)} />
        <Field label="Short Name" value={company.shortName} onChange={v => update('shortName', v)} />
        <Field label="Tagline" value={company.tagline} onChange={v => update('tagline', v)} />
        <Field label="Description" value={company.description} onChange={v => update('description', v)} textarea />
        <Field label="Logo URL" value={company.logoUrl} onChange={v => update('logoUrl', v)} placeholder="https://..." />
        <Field label="Banner URL" value={company.bannerUrl} onChange={v => update('bannerUrl', v)} placeholder="https://..." />
      </Section>

      {/* Contact */}
      <Section title="Contact Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone 1" value={company.phone1} onChange={v => update('phone1', v)} placeholder="+91 ..." />
          <Field label="Phone 2" value={company.phone2} onChange={v => update('phone2', v)} placeholder="+91 ..." />
        </div>
        <Field label="Email" value={company.email} onChange={v => update('email', v)} placeholder="info@stbs.in" />
        <Field label="Website" value={company.website} onChange={v => update('website', v)} placeholder="https://stbs.in" />
      </Section>

      {/* Address */}
      <Section title="Address">
        <Field label="Address Line 1" value={company.addressLine1} onChange={v => update('addressLine1', v)} />
        <Field label="Address Line 2" value={company.addressLine2} onChange={v => update('addressLine2', v)} />
        <div className="grid grid-cols-3 gap-4">
          <Field label="City" value={company.city} onChange={v => update('city', v)} />
          <Field label="State" value={company.state} onChange={v => update('state', v)} />
          <Field label="PIN Code" value={company.pinCode} onChange={v => update('pinCode', v)} />
        </div>
        <Field label="Country" value={company.country} onChange={v => update('country', v)} />
      </Section>

      {/* Tax & Registration */}
      <Section title="Tax & Registration">
        <div className="grid grid-cols-3 gap-4">
          <Field label="GST Number" value={company.gstNumber} onChange={v => update('gstNumber', v)} placeholder="06XXXXX1234X1Z5" />
          <Field label="PAN Number" value={company.panNumber} onChange={v => update('panNumber', v)} placeholder="ABCDE1234F" />
          <Field label="CIN Number" value={company.cinNumber} onChange={v => update('cinNumber', v)} />
        </div>
      </Section>

      {/* Bank Details */}
      <Section title="Bank Details">
        <Field label="Bank Name" value={company.bankName} onChange={v => update('bankName', v)} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Account Number" value={company.bankAccountNo} onChange={v => update('bankAccountNo', v)} />
          <Field label="IFSC Code" value={company.bankIfsc} onChange={v => update('bankIfsc', v)} />
        </div>
        <Field label="Branch" value={company.bankBranch} onChange={v => update('bankBranch', v)} />
      </Section>

      {/* Director */}
      <Section title="Director / Authorized Signatory">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" value={company.directorName} onChange={v => update('directorName', v)} />
          <Field label="Title" value={company.directorTitle} onChange={v => update('directorTitle', v)} placeholder="Managing Director" />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-steel/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
      <h2 className="text-lg font-medium text-white mb-5 flex items-center gap-2 pl-2 border-l-2 border-signal">
        {icon}
        {title}
      </h2>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
      {textarea ? (
        <textarea
          className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-signal/50 focus:ring-1 focus:ring-signal/50 transition-all resize-none"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          type="text"
          className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-signal/50 focus:ring-1 focus:ring-signal/50 transition-all"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
