"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";

export function ImageUpload({
  value,
  onChange,
  label,
  hint,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/website/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {label && <label className="admin-label">{label}</label>}
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-white/[.08] bg-white/[.02]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-40 w-full object-contain" />
          <div className="flex items-center justify-between gap-2 border-t border-white/[.08] p-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/[.06] hover:text-white"
            >
              <Upload size={14} /> Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
            >
              <X size={14} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/[.12] bg-white/[.02] text-sm text-zinc-400 transition-colors hover:border-signal/50 hover:text-white disabled:opacity-50"
        >
          {uploading ? <Loader2 size={20} className="animate-spin text-signal" /> : <Upload size={20} />}
          {uploading ? "Uploading…" : "Upload image"}
        </button>
      )}
      {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/x-icon" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}