"use client";

/**
 * An image on the printed document that has something to fall back on.
 *
 * The logo and the signature can both be pointed at a URL from Settings. When that URL stops
 * resolving — the file moved, the upload was removed — a plain `<img>` prints an empty box on the
 * invoice, which is what a client then receives. The bundled default is always there, so it is what
 * gets drawn instead.
 */
import { useState } from "react";

export function DocumentImage({ src, fallback, alt, className }: {
  src?: string;
  fallback: string;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const chosen = !src || broken ? fallback : src;
  return (
    <img
      className={className}
      src={chosen}
      alt={alt}
      onError={() => setBroken(true)}
    />
  );
}
