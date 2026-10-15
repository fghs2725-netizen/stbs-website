"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { FILM_SCENES, type FilmSceneId } from "@/lib/website/film-scenes";

/**
 * One scene of the STBS brand film as a silent, cinematic band: it plays once when scrolled
 * into view and holds on its last, fully built frame (which is also its poster). Landscape on
 * wide screens, portrait on phones. Nothing downloads until the band is near the viewport, and
 * people who ask for reduced motion only ever see the still frame.
 */
export function FilmBand({ scene, label }: { scene: FilmSceneId; label?: string }) {
  const meta = FILM_SCENES[scene];
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [portrait, setPortrait] = useState(false);
  const [armed, setArmed] = useState(false); // sources attached (band is near the viewport)
  const [ended, setEnded] = useState(false);
  const [still, setStill] = useState(false); // reduced motion: poster only

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px) and (orientation: portrait)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPortrait(mq.matches);
    sync();
    setStill(rm.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el || still) return;
    const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setArmed(true); near.disconnect(); } }, { rootMargin: "600px 0px" });
    near.observe(el);
    return () => near.disconnect();
  }, [still]);

  useEffect(() => {
    const el = wrap.current, v = video.current;
    if (!el || !v || !armed || still) return;
    v.load();
    let played = false;
    const seen = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio >= 0.55 && !played) {
        played = true;
        v.play().catch(() => { /* autoplay refused: the poster stays */ });
      }
    }, { threshold: [0, 0.55] });
    seen.observe(el);
    return () => seen.disconnect();
  }, [armed, portrait, still]);

  const fmt = portrait ? "v" : "h";
  const src = `/film/${scene}-${fmt}.mp4`;
  const poster = `/film/${scene}-${fmt}.jpg`;

  const replay = () => {
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    setEnded(false);
    v.play().catch(() => {});
  };

  return (
    <section className={`film-band ${scene === "hook" ? "film-band--bleed" : ""}`} aria-label={label ?? meta.label}>
      <div className={`film-band__inner ${scene === "hook" ? "" : "container-x"}`}>
        <div ref={wrap} className={`film-band__frame ${portrait ? "is-portrait" : ""}`}>
          {still ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt={meta.alt} className="film-band__media" loading="lazy" />
          ) : (
            <video
              key={fmt}
              ref={video}
              className="film-band__media"
              poster={poster}
              muted
              playsInline
              preload="none"
              aria-label={meta.alt}
              onEnded={() => setEnded(true)}
              onPlay={() => setEnded(false)}
            >
              {armed && <source src={src} type="video/mp4" />}
            </video>
          )}
          {!still && ended && (
            <button type="button" className="film-band__replay" onClick={replay} aria-label={`Replay: ${meta.label}`}>
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden />
              Replay
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
