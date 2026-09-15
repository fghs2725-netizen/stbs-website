"use client";

import type { SectionField } from "@/lib/website/section-types";
import { ImageUpload } from "./ImageUpload";

export function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <ImageUpload label="" value={value || null} onChange={(url) => onChange(url ?? "")} hint="Upload an image or paste a URL." />;
}

export function FieldInput({ field, value, onChange }: { field: SectionField; value: unknown; onChange: (v: string) => void }) {
  const str = typeof value === "string" ? value : "";
  if (field.type === "image") {
    return <ImageInput value={str} onChange={onChange} />;
  }
  if (field.type === "textarea") {
    return <textarea className="admin-input min-h-28 resize-y" value={str} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
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
  return <input className="admin-input" type={field.type === "number" ? "number" : "text"} value={str} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
}