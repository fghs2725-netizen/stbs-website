"use client";

import type { SectionField } from "@/lib/website/section-types";
import { ImageUpload } from "./ImageUpload";
import { CharCount } from "./CharCount";

type FieldWithMax = SectionField & { max?: number };

export function ImageInput({ value, onChange, mediaUrls, altText, onAltChange, altLabel }: { value: string; onChange: (v: string) => void; mediaUrls?: string[]; altText?: string; onAltChange?: (v: string) => void; altLabel?: string }) {
  return <ImageUpload label="" value={value || null} onChange={(url) => onChange(url ?? "")} hint="Upload an image to Vercel Blob or choose a Website Photo." mediaUrls={mediaUrls} altText={altText} onAltChange={onAltChange} altLabel={altLabel} />;
}

/** The key of the alt-text field that belongs to an image field (heroImage -> heroImageAlt, image -> imageAlt). */
export const altKeyFor = (imageKey: string) => `${imageKey}Alt`;

export function FieldInput({ field, value, onChange, mediaUrls, altText, onAltChange }: { field: SectionField; value: unknown; onChange: (v: string) => void; mediaUrls?: string[]; altText?: string; onAltChange?: (v: string) => void }) {
  const str = typeof value === "string" ? value : "";
  const max = (field as FieldWithMax).max;
  if (field.type === "image") {
    return <ImageInput value={str} onChange={onChange} mediaUrls={mediaUrls} altText={altText} onAltChange={onAltChange} />;
  }
  if (field.type === "textarea") {
    return (
      <>
        <textarea className="admin-input min-h-28 resize-y" value={str} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        {max ? <CharCount value={str} max={max} /> : null}
      </>
    );
  }
  if (field.type === "select" && field.options?.length) {
    return (
      <select className="admin-input" value={str} onChange={(e) => onChange(e.target.value)}>
        <option value="">Not set</option>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  return (
    <>
      <input className="admin-input" type={field.type === "number" ? "number" : "text"} value={str} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      {max && field.type !== "number" ? <CharCount value={str} max={max} /> : null}
    </>
  );
}
