"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { compressImage } from "@/components/admin/photos/compress-image";
import { validateImageFile } from "@/lib/website/image-guard";
import type { ProjectPhoto, ProjectRow } from "@/lib/website-projects";
import { saveProjectAction } from "@/app/admin/(dashboard)/projects/actions";

type Props = { project?: ProjectRow };

const MAX_PHOTOS = 12;

export function ProjectForm({ project }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(project?.title ?? "");
  const [location, setLocation] = useState(project?.location ?? "");
  const [sector, setSector] = useState(project?.sector ?? "");
  const [summary, setSummary] = useState(project?.summary ?? "");
  const [scope, setScope] = useState(project?.scope ?? "");
  const [depth, setDepth] = useState(project?.depth ?? "");
  const [output, setOutput] = useState(project?.output ?? "");
  const [year, setYear] = useState(project?.year ?? "");
  const [photos, setPhotos] = useState<ProjectPhoto[]>(project?.photos ?? []);
  const [published, setPublished] = useState(project?.published ?? true);
  const [featured, setFeatured] = useState(project?.featured ?? false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<string[]>([]);

  async function addFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setError("");
    setNotes([]);
    setUploading(true);
    const problems: string[] = [];
    const added: ProjectPhoto[] = [];
    try {
      for (const file of files) {
        if (photos.length + added.length >= MAX_PHOTOS) { problems.push(`Only ${MAX_PHOTOS} photos fit on one project.`); break; }
        const check = validateImageFile(file);
        if (!check.ok) { problems.push(`${file.name}: ${check.message}`); continue; }
        try {
          const { file: toSend } = await compressImage(file);
          const form = new FormData();
          form.append("file", toSend);
          const res = await fetch("/api/website/upload", { method: "POST", body: form });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
          added.push({ url: data.url, alt: "" });
        } catch (e) {
          problems.push(`${file.name}: ${e instanceof Error && e.message ? e.message : "Upload failed"}`);
        }
      }
      if (added.length) setPhotos((p) => [...p, ...added]);
      setNotes(problems);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const move = (i: number, dir: -1 | 1) =>
    setPhotos((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function save() {
    setError("");
    if (!title.trim()) return setError("Give the project a title.");
    if (!location.trim()) return setError("Say where the project is.");
    setSaving(true);
    const result = await saveProjectAction({ id: project?.id, title, location, sector, summary, scope, depth, output, year, photos, published, featured: published && featured });
    if (!result.ok) {
      setSaving(false);
      return setError(result.error);
    }
    router.push("/admin/projects");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="a-card space-y-4 p-5">
        <div>
          <label className="a-label" htmlFor="p-title">Title *</label>
          <input id="p-title" className="a-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Borewell and tubewell, ABC Industries" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="a-label" htmlFor="p-location">Location *</label>
            <input id="p-location" className="a-input" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="e.g. Kundli, Sonipat" />
          </div>
          <div>
            <label className="a-label" htmlFor="p-sector">Type of site</label>
            <input id="p-sector" className="a-input" value={sector} onChange={(e) => setSector(e.target.value)} maxLength={80} placeholder="e.g. Industrial, School, Farm" />
          </div>
        </div>
        <div>
          <label className="a-label" htmlFor="p-summary">What was done (one or two lines)</label>
          <textarea id="p-summary" className="a-input" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={600} placeholder="e.g. 300 mm borewell, 220 ft, with casing, gravel pack and pump set." />
        </div>
        <div>
          <label className="a-label" htmlFor="p-scope">Scope, one item per line (optional)</label>
          <textarea id="p-scope" className="a-input" rows={5} value={scope} onChange={(e) => setScope(e.target.value)} placeholder={"250 mm borewell drilling, 220 ft\nGravel pack, 200 ft"} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="a-label" htmlFor="p-depth">Depth (optional)</label>
            <input id="p-depth" className="a-input" value={depth} onChange={(e) => setDepth(e.target.value)} maxLength={60} placeholder="e.g. 220 ft" />
          </div>
          <div>
            <label className="a-label" htmlFor="p-output">Water output (optional)</label>
            <input id="p-output" className="a-input" value={output} onChange={(e) => setOutput(e.target.value)} maxLength={60} placeholder="e.g. 5000 L/hr" />
          </div>
          <div>
            <label className="a-label" htmlFor="p-year">Year (optional)</label>
            <input id="p-year" className="a-input" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} maxLength={12} placeholder="e.g. 2026" />
          </div>
        </div>
      </div>

      <div className="a-card space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="a-label !mb-0">Photos</p>
            <p className="a-sub text-[0.8125rem]">The first photo is the cover. Photos are shrunk automatically before they upload.</p>
          </div>
          <button type="button" className="a-btn a-btn-secondary" onClick={() => fileInput.current?.click()} disabled={uploading || photos.length >= MAX_PHOTOS}>
            {uploading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ImagePlus size={16} aria-hidden />}
            {uploading ? "Uploading…" : "Add photos"}
          </button>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
        </div>

        {notes.length > 0 && (
          <ul role="alert" className="space-y-1 text-[0.875rem]" style={{ color: "var(--a-danger)" }}>
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}

        {photos.length === 0 ? (
          <p className="a-sub text-[0.9375rem]">No photos yet. A project without photos shows as text only.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {photos.map((ph, i) => (
              <li key={ph.url} className="a-card-flat space-y-2 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ph.url} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                <input
                  className="a-input"
                  value={ph.alt}
                  maxLength={200}
                  placeholder="What the photo shows (optional)"
                  aria-label={`Description of photo ${i + 1}`}
                  onChange={(e) => setPhotos((p) => p.map((x, n) => (n === i ? { ...x, alt: e.target.value } : x)))}
                />
                <div className="flex items-center gap-2">
                  {i === 0 ? (
                    <span className="a-pill a-pill-brand"><Star size={12} aria-hidden /> Cover</span>
                  ) : (
                    <button type="button" className="a-btn a-btn-sm a-btn-secondary" onClick={() => setPhotos((p) => [p[i], ...p.filter((_, n) => n !== i)])}>Make cover</button>
                  )}
                  <span className="flex-1" />
                  <button type="button" className="a-btn a-btn-sm a-btn-secondary" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move photo earlier"><ArrowLeft size={14} aria-hidden /></button>
                  <button type="button" className="a-btn a-btn-sm a-btn-secondary" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Move photo later"><ArrowRight size={14} aria-hidden /></button>
                  <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => setPhotos((p) => p.filter((_, n) => n !== i))} aria-label="Remove photo"><Trash2 size={14} aria-hidden /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="a-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 text-[0.9375rem]">
            <input type="checkbox" className="h-5 w-5" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span><strong>Show on the website</strong><span className="a-sub block text-[0.8125rem]">Live as soon as you save. Untick to keep it as a draft.</span></span>
          </label>
          <label className={`flex items-center gap-3 text-[0.9375rem] ${published ? "cursor-pointer" : "opacity-50"}`}>
            <input type="checkbox" className="h-5 w-5" checked={published && featured} disabled={!published} onChange={(e) => setFeatured(e.target.checked)} />
            <span><strong>Show on the homepage</strong><span className="a-sub block text-[0.8125rem]">The homepage has room for three projects. Projects that are not ticked still appear on the Projects page.</span></span>
          </label>
        </div>
        <div className="flex gap-2">
          <button type="button" className="a-btn a-btn-secondary" onClick={() => router.push("/admin/projects")} disabled={saving}>Cancel</button>
          <button type="button" className="a-btn a-btn-primary" onClick={save} disabled={saving || uploading}>
            {saving ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
            {saving ? "Saving…" : "Save project"}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</p>}
    </div>
  );
}
