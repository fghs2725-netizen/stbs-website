import { Fragment, type ReactNode } from "react";

/** Renders "Water for *industrial* sites": text between asterisks becomes the serif italic accent. */
export function Accent({ text, className = "t-serif" }: { text: string; className?: string }): ReactNode {
  return text.split(/\*([^*]+)\*/g).map((part, i) =>
    i % 2 === 1 ? <em key={i} className={`${className}`} style={{ fontStyle: "italic" }}>{part}</em> : <Fragment key={i}>{part}</Fragment>,
  );
}
