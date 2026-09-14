"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "./ImageUpload";
import type { SerializedWebsiteSettings } from "@/lib/website/action-types";
import { updateWebsiteSettings, publishWebsiteSettings } from "@/lib/website/actions";

const LEFT_FIELDS: Array<{ key: keyof SettingsState; label: string; textarea?: boolean }> = [
  { key: "businessName", label: "Business name" },
  { key: "shortDescription", label: "Short description", textarea: true },
  { key: "phone", label: "Phone", textarea: true },
  { key: "phone2", label: "Phone 2" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "addressLine1", label: "Address line 1" },
  { key: "addressLine2", label: "Address line 2", textarea: true },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "pinCode", label: "PIN code" },
];

const RIGHT_FIELDS: Array<{ key: keyof SettingsState; label: string; textarea?: boolean }> = [
  { key: "googleMapsUrl", label: "Google Maps URL", textarea: true },
  { key: "googleBusinessUrl", label: "Google Business Profile URL", textarea: true },
  { key: "serviceArea", label: "Service area", textarea: true },
  { key: "websiteUrl", label: "Website URL" },
  { key: "footerContent", label: "Footer blurb", textarea: true },
  { key: "copyrightText", label: "Copyright text" },
  { key: "founderName", label: "Founder name" },
  { key: "founderTitle", label: "Founder title" },
  { key: "founderBio", label: "Founder bio", textarea: true },
  { key: "mission", label: "Mission", textarea: true },
  { key: "vision", label: "Vision", textarea: true },
];

interface SettingsState {
  businessName: string;
  shortDescription: string;
  phone: string;
  phone2: string;
  whatsapp: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  googleMapsUrl: string;
  googleBusinessUrl: string;
  serviceArea: string;
  websiteUrl: string;
  footerContent: string;
  copyrightText: string;
  founderName: string;
  founderTitle: string;
  founderBio: string;
  mission: string;
  vision: string;
}

export function SettingsPage({ initial }: { initial: SerializedWebsiteSettings }) {
  const router = useRouter();
  const toState = (s: SerializedWebsiteSettings): SettingsState => ({
    businessName: s.businessName ?? "",
    shortDescription: s.shortDescription ?? "",
    phone: s.phone ?? "",
    phone2: s.phone2 ?? "",
    whatsapp: s.whatsapp ?? "",
    email: s.email ?? "",
    addressLine1: s.addressLine1 ?? "",
    addressLine2: s.addressLine2 ?? "",
    city: s.city ?? "",
    state: s.state ?? "",
    pinCode: s.pinCode ?? "",
    googleMapsUrl: s.googleMapsUrl ?? "",
    googleBusinessUrl: s.googleBusinessUrl ?? "",
    serviceArea: s.serviceArea ?? "",
    websiteUrl: s.websiteUrl ?? "",
    footerContent: s.footerContent ?? "",
    copyrightText: s.copyrightText ?? "",
    founderName: s.founderName ?? "",
    founderTitle: s.founderTitle ?? "",
    founderBio: s.founderBio ?? "",
    mission: s.mission ?? "",
    vision: s.vision ?? "",
  });
  const [state, setState] = useState<SettingsState>(toState(initial));
  const [hoursJson, setHoursJson] = useState<string>(initial.businessHours ? JSON.stringify(initial.businessHours, null, 2) : "");
  const [hoursRaw, setHoursRaw] = useState<string>("");
  const [logos, setLogos] = useState({
    primaryLogoUrl: initial.primaryLogoUrl ?? "",
    lightLogoUrl: initial.lightLogoUrl ?? "",
    darkLogoUrl: initial.darkLogoUrl ?? "",
    mobileLogoUrl: initial.mobileLogoUrl ?? "",
    faviconUrl: initial.faviconUrl ?? "",
    defaultOgImage: initial.defaultOgImage ?? "",
    founderPhoto: initial.founderPhoto ?? "",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof SettingsState, value: string) => setState((s) => ({ ...s, [key]: value }));
  const setLogo = (key: keyof typeof logos, value: string) => setLogos((l) => ({ ...l, [key]: value }));

  function parseHours(): object | undefined {
    if (!hoursRaw.trim() && !hoursJson.trim()) return undefined;
    const value = hoursRaw.trim() ? hoursRaw : hoursJson;
    try {
      return JSON.parse(value) as object;
    } catch {
      throw new Error("Business hours is not valid JSON");
    }
  }

  async function save() {
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      const hours = parseHours();
      const values: Record<string, unknown> = { ...state, ...logos };
      if (hours) values.businessHours = hours;
      for (const k of Object.keys(values)) {
        if (values[k] === "") values[k] = undefined;
      }
      await updateWebsiteSettings(values as never);
      setNotice("Draft saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setBusy("publish");
    setError(null);
    setNotice(null);
    try {
      const hours = parseHours();
      const values: Record<string, unknown> = { ...state, ...logos };
      if (hours) values.businessHours = hours;
      for (const k of Object.keys(values)) {
        if (values[k] === "") values[k] = undefined;
      }
      await updateWebsiteSettings(values as never);
      await publishWebsiteSettings();
      setNotice("Published. Live site now uses these global settings.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setBusy(null);
    }
  }

  function resetToStatic() {
    setState({
      businessName: "Saini Tubewell Boring Service",
      shortDescription: "",
      phone: "9812003001\n7988024114",
      phone2: "",
      whatsapp: "",
      email: "stbs2025@gmail.com",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pinCode: "",
      googleMapsUrl: "",
      googleBusinessUrl: "",
      serviceArea: "",
      websiteUrl: "",
      footerContent: "",
      copyrightText: "",
      founderName: "Rajesh Saini",
      founderTitle: "Founder & Managing Director",
      founderBio: "With over 30 years of hands-on experience in water infrastructure, Rajesh Saini leads Saini Tubewell with a field-first approach—precision drilling, responsible recharge, and end-to-end tubewell construction built on practical expertise.",
      mission: "To provide customers with products and services that achieve and sustain the highest possible quality standards.",
      vision: "Excel in what we do and build a safe and secure environment for our community.",
    });
  }

  const perField = (key: keyof SettingsState) => { const f = LEFT_FIELDS.find(x => x.key === key) ?? RIGHT_FIELDS.find(x => x.key === key); if (!f) return { label: key, textarea: false }; return f; };

  return (
    <div className="space-y-6">
      {notice && <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{notice}</p>}
      {error && <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[.08] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Business information</h2>
            <p className="mt-0.5 text-sm text-zinc-500">Leave blank anything you have not confirmed — it stays “Not configured” on the site.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={resetToStatic}><RotateCcw size={15} /> Use existing website data</Button>
          </div>
        </div>
        <div className="grid gap-x-8 gap-y-4 p-5 lg:grid-cols-2">
          {[...LEFT_FIELDS, ...RIGHT_FIELDS].map((f) => (
            <div key={f.key}>
              <label className="admin-label">{f.label}</label>
              {f.textarea ? (
                <textarea className="admin-input min-h-20 resize-y" value={state[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              ) : (
                <input className="admin-input" value={state[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              )}
              {!state[f.key] && <span className="mt-1 inline-block text-[11px] text-amber-300/70">Not configured</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="border-b border-white/[.08] p-5">
          <h2 className="font-display text-lg font-semibold text-white">Business hours</h2>
          <p className="mt-0.5 text-sm text-zinc-500">JSON structure, e.g. {"{\"monday\": {\"open\": \"08:00\", \"close\": \"19:00\"}}"}. Leave empty if not configured.</p>
        </div>
        <div className="p-5">
          <textarea className="admin-input min-h-28 font-mono text-xs" placeholder='{"weekdays": {"open": "08:00", "close": "19:00"}, "sunday": "emergency only"}' value={hoursRaw || hoursJson} onChange={(e) => setHoursRaw(e.target.value)} />
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="border-b border-white/[.08] p-5">
          <h2 className="font-display text-lg font-semibold text-white">Logos & images</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Previews update live. Deleting the active logo requires confirmation.</p>
        </div>
        <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
          <ImageUpload label="Primary logo" value={logos.primaryLogoUrl} onChange={(url) => setLogo("primaryLogoUrl", url ?? "")} hint="Default dark-background header logo." />
          <ImageUpload label="Light logo" value={logos.lightLogoUrl} onChange={(url) => setLogo("lightLogoUrl", url ?? "")} />
          <ImageUpload label="Dark logo" value={logos.darkLogoUrl} onChange={(url) => setLogo("darkLogoUrl", url ?? "")} />
          <ImageUpload label="Mobile logo" value={logos.mobileLogoUrl} onChange={(url) => setLogo("mobileLogoUrl", url ?? "")} />
          <ImageUpload label="Favicon" value={logos.faviconUrl} onChange={(url) => setLogo("faviconUrl", url ?? "")} hint="Small square icon (PNG/ICO/SVG)." />
          <ImageUpload label="Default OG image" value={logos.defaultOgImage} onChange={(url) => setLogo("defaultOgImage", url ?? "")} />
          <ImageUpload label="Founder photo" value={logos.founderPhoto} onChange={(url) => setLogo("founderPhoto", url ?? "")} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sticky bottom-0 z-10 rounded-xl border border-white/[.08] bg-[#141416] p-4 shadow-[0_-10px_40px_rgba(0,0,0,.4)]">
        <Button onClick={save} disabled={busy === "save"}>
          {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy === "save" ? "Saving…" : "Save draft"}
        </Button>
        <Button variant="secondary" onClick={publish} disabled={busy === "publish"}>
          {busy === "publish" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Save & publish
        </Button>
        <span className="text-xs text-zinc-500">
          {initial.publishedAt ? `Last published ${new Date(initial.publishedAt).toLocaleString()}` : "Never published"}
        </span>
      </div>
    </div>
  );
}