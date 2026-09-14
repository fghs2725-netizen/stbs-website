"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPage } from "@/lib/website/actions";

export function NewPageForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function deriveSlug(value: string) {
    if (!slug || slug === sluggify(name)) setSlug(sluggify(value));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const page = await createPage({ name, slug, title: title || undefined });
      router.push(`/admin/website/pages/${page.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create page");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="admin-card max-w-2xl space-y-5 p-6">
      <div>
        <label className="admin-label">Page name *</label>
        <input className="admin-input" value={name} onChange={(e) => { setName(e.target.value); deriveSlug(e.target.value); }} required placeholder="e.g. Homepage" />
      </div>
      <div>
        <label className="admin-label">URL slug *</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">/</span>
          <input className="admin-input" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="home" />
        </div>
      </div>
      <div>
        <label className="admin-label">Navigation title</label>
        <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Shown in navigation (optional)" />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? "Creating…" : "Create page"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/website/pages")}>Cancel</Button>
      </div>
    </form>
  );
}

function sluggify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}