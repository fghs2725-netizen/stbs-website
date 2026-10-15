"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { FILM_SCENES, type FilmSceneId } from "@/lib/website/film-scenes";

/**
 * One scene of the STBS brand film as a silent, cinematic band: it plays once when scrolled
 * into view and holds on its last, fully built frame (which is also its poster). Landscape on
 * wide screens, portrait on phones. Nothing downloads until the band is near the viewport.
 *
 * Phones can refuse to autoplay even a muted video (iPhone Low Power Mode, "Auto-Play Video
 * Previews" off, Android data saver). Then a large Play button shows, and the first tap anywhere
 * on the page also starts a band that is on screen. People who ask for reduced motion get the
 * still frame with the same Play button, so the film only moves when they choose.
 */
export function FilmBand({ scene, label }: { scene: FilmSceneId; label?: string }) {
  const meta = FILM_SCENES[scene];
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [portrait, setPortrait] = useState(false);
  const [armed, setArmed] = useState(false); // source attached (band is near the viewport)
  const [ended, setEnded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [calm, setCalm] = useState(false); // prefers-reduced-motion: no autoplay, Play button instead
  const [blocked, setBlocked] = useState(false); // the browser refused autoplay

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px) and (orientation: portrait)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPortrait(mq.matches);
    sync();
    setCalm(rm.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setArmed(true); near.disconnect(); } }, { rootMargin: "600px 0px" });
    near.observe(el);
    return () => near.disconnect();
  }, []);

  useEffect(() => {
    const el = wrap.current, v = video.current;
    if (!el || !v || !armed) return;
    // React sets `muted` as a property only; phones also check the attribute before allowing autoplay.
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.load();
    if (calm) return;
    let started = false;
    let visible = false;
    const start = () => {
      if (started) return;
      started = true;
      const p = v.play();
      if (p) p.catch(() => { started = false; setBlocked(true); });
    };
    // A tap is a user gesture, which phones that refused autoplay accept.
    const onTap = () => { if (visible) start(); };
    const seen = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && e.intersectionRatio >= 0.4;
      if (visible) start();
    }, { threshold: [0, 0.4] });
    seen.observe(el);
    document.addEventListener("touchend", onTap, { passive: true });
    document.addEventListener("click", onTap);
    return () => {
      seen.disconnect();
      document.removeEventListener("touchend", onTap);
      document.removeEventListener("click", onTap);
    };
  }, [armed, portrait, calm]);

  const fmt = portrait ? "v" : "h";
  const src = `/film/${scene}-${fmt}.mp4`;
  const poster = `/film/${scene}-${fmt}.jpg`;

  const play = () => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    if (ended || v.ended) v.currentTime = 0;
    setEnded(false);
    setBlocked(false);
    v.play().catch(() => setBlocked(true));
  };

  return (
    <section className={`film-band ${scene === "hook" ? "film-band--bleed" : ""}`} aria-label={label ?? meta.label}>
      <div className={`film-band__inner ${scene === "hook" ? "" : "container-x"}`}>
        <div ref={wrap} className={`film-band__frame ${portrait ? "is-portrait" : ""}`}>
          <video
            key={fmt}
            ref={video}
            className="film-band__media"
            poster={poster}
            muted
            playsInline
            preload="none"
            aria-label={meta.alt}
            onPlay={() => { setPlaying(true); setEnded(false); setBlocked(false); }}
            onPause={() => setPlaying(false)}
            onEnded={() => { setEnded(true); setPlaying(false); }}
          >
            {armed && <source src={src} type="video/mp4" />}
          </video>
          {(calm || blocked) && !playing && !ended && (
            <button type="button" className="film-band__play" onClick={play} aria-label={`Play: ${meta.label}`}>
              <Play size={18} strokeWidth={1.75} fill="currentColor" aria-hidden />
              Play film
            </button>
          )}
          {ended && (
            <button type="button" className="film-band__replay" onClick={play} aria-label={`Replay: ${meta.label}`}>
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden />
              Replay
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
