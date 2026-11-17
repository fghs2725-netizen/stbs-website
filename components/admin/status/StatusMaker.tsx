"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ImagePlus, Share2, Sparkles, X } from "lucide-react";
import { CUSTOM_OCCASION, OCCASIONS, upcomingOccasions, whenLabel, type Occasion, type StatusLang } from "@/lib/status/occasions";
import { STORY, STORY_FONTS, STORY_LAYOUTS, drawStory, lightenLogo, storyFileName, type StoryBrand, type StoryPhoto } from "@/lib/status/render";

function loadImage(url: string): Promise<StoryPhoto> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("That file could not be opened as a photo."));
    img.src = url;
  });
}

/** Makes today's WhatsApp status: pick the occasion and a photo, get four finished stories to share. */
export function StatusMaker({ today, brand }: { today: string; brand: StoryBrand }) {
  const upcoming = useMemo(() => upcomingOccasions(today), [today]);
  const todays = upcoming.filter((d) => d.daysAway === 0);
  const first = upcoming[0]?.occasion ?? CUSTOM_OCCASION;

  const [occasionId, setOccasionId] = useState(first.id);
  const [lang, setLang] = useState<StatusLang>("en");
  const [title, setTitle] = useState(first.title.en);
  const [line, setLine] = useState(first.lines.en[0]);
  const [photo, setPhoto] = useState<StoryPhoto | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [logo, setLogo] = useState<StoryPhoto | null>(null);
  const [logoLight, setLogoLight] = useState<StoryPhoto | null>(null);
  const [hint, setHint] = useState("");
  const [making, setMaking] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const photoUrl = useRef("");

  const occasion: Occasion = occasionId === CUSTOM_OCCASION.id ? CUSTOM_OCCASION : OCCASIONS.find((x) => x.id === occasionId) ?? CUSTOM_OCCASION;
  const dated = upcoming.find((d) => d.occasion.id === occasionId);

  // The stories draw with the site's own fonts and logo; wait for both so the first draw is the real one.
  useEffect(() => {
    let live = true;
    const fonts = STORY_FONTS.map(async (f) => {
      const face = new FontFace(f.family, `url(${f.url})`, { weight: f.weight });
      document.fonts.add(await face.load());
    });
    Promise.allSettled([...fonts, loadImage("/stbs-logo-dark.png").then((l) => { if (live) { setLogo(l); setLogoLight(lightenLogo(l)); } })]).then(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);

  useEffect(() => () => { if (photoUrl.current) URL.revokeObjectURL(photoUrl.current); }, []);

  useEffect(() => {
    if (!ready) return;
    STORY_LAYOUTS.forEach((layout, n) => {
      const ctx = canvases.current[n]?.getContext("2d");
      if (ctx) drawStory(ctx, layout.id, { title: title.trim(), line: line.trim(), photo, logo, logoLight, brand });
    });
  }, [ready, title, line, photo, logo, logoLight, brand]);

  function choose(id: string, nextLang: StatusLang = lang) {
    const next = id === CUSTOM_OCCASION.id ? CUSTOM_OCCASION : OCCASIONS.find((x) => x.id === id) ?? CUSTOM_OCCASION;
    setOccasionId(next.id);
    setLang(nextLang);
    setTitle(next.title[nextLang]);
    setLine(next.lines[nextLang][0]);
    setNotice("");
  }

  async function applyPicture(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    try {
      const loaded = await loadImage(url);
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
      photoUrl.current = url;
      setPhoto(loaded);
      setPhotoName(name);
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  /** Asks the server to make a picture for the occasion. Each one is billed to the OpenAI account. */
  async function makePicture() {
    setNotice(""); setMaking(true);
    try {
      const response = await fetch("/api/status/artwork", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ occasionId, hint }) });
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as { error?: string } | null;
        setNotice(problem?.error ?? "The picture could not be made. Please try again.");
        return;
      }
      await applyPicture(await response.blob(), "Picture made for this occasion");
    } catch {
      setNotice("The picture could not be made. Check your internet and try again.");
    } finally { setMaking(false); }
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setNotice("");
    try {
      await applyPicture(file, file.name);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That photo could not be opened.");
    }
  }

  function removePhoto() {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = "";
    setPhoto(null);
    setPhotoName("");
  }

  function storyFile(n: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = canvases.current[n];
      if (!canvas) return reject(new Error("The story is not ready yet."));
      canvas.toBlob((blob) => (blob ? resolve(new File([blob], storyFileName(occasion.id, n), { type: "image/jpeg" })) : reject(new Error("The story could not be saved."))), "image/jpeg", 0.92);
    });
  }

  function save(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function share(n: number) {
    setNotice("");
    try {
      const file = await storyFile(n);
      if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        save(file);
        setNotice("Saved to your downloads. Open WhatsApp, tap Updates, then My status, and pick it.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setNotice("Sharing did not work. Tap Save, then add the picture to your status from WhatsApp.");
    }
  }

  async function download(n: number) {
    setNotice("");
    try { save(await storyFile(n)); } catch { setNotice("The story could not be saved. Please try again."); }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="a-card flex flex-col gap-4 p-4 sm:p-5">
        <div>
          <label className="a-label" htmlFor="status-occasion">Occasion</label>
          <select id="status-occasion" className="a-input mt-1" value={occasionId} onChange={(e) => choose(e.target.value)}>
            {upcoming.map((d) => <option key={d.occasion.id} value={d.occasion.id}>{whenLabel(d)} · {d.occasion.name}</option>)}
            <option value={CUSTOM_OCCASION.id}>{CUSTOM_OCCASION.name}</option>
          </select>
          <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--a-muted)" }}>
            {todays.length > 0 ? `Today is ${todays.map((d) => d.occasion.name).join(" and ")}.` : upcoming[0] ? `Nothing on the calendar today. Next: ${upcoming[0].occasion.name}, ${whenLabel(upcoming[0]).toLowerCase() === "tomorrow" ? "tomorrow" : `on ${whenLabel(upcoming[0])}`}.` : "Pick “Other” to write your own greeting."}
            {dated?.occasion.tentative ? " This date follows the moon sighting and can move by a day." : ""}
          </p>
        </div>

        <div>
          <span className="a-label">Picture</span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button type="button" className="a-btn a-btn-primary" disabled={making || (occasionId === CUSTOM_OCCASION.id && !hint.trim())} onClick={() => void makePicture()}>
              <Sparkles className="size-4" aria-hidden /> {making ? "Making picture…" : photo ? "Make another" : "Make picture"}
            </button>
            <label className="a-btn a-btn-secondary cursor-pointer">
              <ImagePlus className="size-4" aria-hidden />
              {photo ? "Change photo" : "Use my photo"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {photo && (
              <button type="button" className="a-btn a-btn-secondary" onClick={removePhoto}>
                <X className="size-4" aria-hidden /> Remove
              </button>
            )}
            <span className="min-w-0 truncate text-[0.8125rem]" style={{ color: "var(--a-muted)" }}>
              {making ? "This takes up to a minute." : photo ? photoName : "No picture yet. The stories use a plain design until you add one."}
            </span>
          </div>
          <input className="a-input mt-2" aria-label="What the picture should show" placeholder={occasionId === CUSTOM_OCCASION.id ? "What should the picture show? (needed for Make picture)" : "Anything to add to the picture? (optional)"} value={hint} maxLength={200} onChange={(e) => setHint(e.target.value)} />
          <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--a-muted)" }}>Make picture draws one for the occasion with OpenAI; each picture is charged to your OpenAI account. Your own photo stays on this phone and is not uploaded.</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="a-label">Words</span>
            <div className="a-segment" role="group" aria-label="Language">
              <button type="button" data-active={lang === "en"} onClick={() => choose(occasionId, "en")}>English</button>
              <button type="button" data-active={lang === "hi"} onClick={() => choose(occasionId, "hi")}>हिंदी</button>
            </div>
          </div>
          <input className="a-input" aria-label="Greeting" placeholder="Greeting" value={title} maxLength={70} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="a-input" aria-label="Message under the greeting" placeholder="Message under the greeting (optional)" rows={2} value={line} maxLength={140} onChange={(e) => setLine(e.target.value)} style={{ height: "auto", paddingTop: 10, paddingBottom: 10 }} />
          <div className="flex flex-col gap-2">
            {occasion.lines[lang].map((suggestion) => (
              <button
                key={suggestion} type="button" onClick={() => setLine(suggestion)} lang={lang}
                className="rounded-lg border px-3 py-2 text-left text-[0.875rem]"
                style={{ borderColor: line === suggestion ? "var(--a-brand)" : "var(--a-hairline)", color: "var(--a-body)", background: line === suggestion ? "var(--a-brand-soft)" : "transparent" }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </section>

      {notice && <p role="status" className="rounded-lg px-3 py-2 text-[0.875rem]" style={{ background: "var(--a-brand-soft)", color: "var(--a-ink)" }}>{notice}</p>}

      <section aria-label="Stories" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STORY_LAYOUTS.map((layout, n) => (
          <div key={layout.id} className="flex flex-col gap-2">
            <canvas
              ref={(el) => { canvases.current[n] = el; }} width={STORY.width} height={STORY.height}
              role="img" aria-label={`${layout.name} story: ${title}`}
              className="w-full rounded-xl" style={{ aspectRatio: "9 / 16", background: "#1f2325", border: "1px solid var(--a-hairline)" }}
            />
            <p className="text-[0.8125rem] font-medium" style={{ color: "var(--a-ink)" }}>{layout.name}</p>
            <div className="flex gap-2">
              <button type="button" className="a-btn a-btn-primary a-btn-sm flex-1" disabled={!ready} onClick={() => void share(n)}>
                <Share2 className="size-4" aria-hidden /> Share
              </button>
              <button type="button" className="a-btn a-btn-secondary a-btn-sm" disabled={!ready} aria-label={`Save the ${layout.name} story`} onClick={() => void download(n)}>
                <Download className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
