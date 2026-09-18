"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { useWebsiteEditor } from "@/lib/website/editor-context";

/**
 * Wraps a rendered website element so it can be clicked/tapped to edit in the
 * visual editor. On the public site (no provider / preview mode) it is a
 * transparent pass-through and never renders any affordance.
 *
 * Image-related slots (label includes "image", "logo", "photo"):
 *  - Always show a visible edit badge on mobile (no hover required).
 *  - The entire wrapper area is the tap target.
 *  - Badge is positioned at the bottom-left so it does not block the image.
 *
 * Text/content slots:
 *  - Show a small badge on hover (desktop) or focus.
 *  - Always have a subtle dashed outline in edit mode.
 */
export function Editable({
  target,
  label,
  className,
  children,
}: {
  target: Parameters<ReturnType<typeof useWebsiteEditor>["openEditor"]>[0];
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const editor = useWebsiteEditor();
  const active = editor.isEditor && editor.mode === "edit";

  if (!active) return <>{children}</>;

  const isImageOrMedia =
    label.toLowerCase().includes("image") ||
    label.toLowerCase().includes("logo") ||
    label.toLowerCase().includes("photo");

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    editor.openEditor(target);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      editor.openEditor(target);
    }
  };

  if (isImageOrMedia) {
    // For image slots: the whole wrapper is the tap target.
    // Badge is always visible on mobile; desktop shows it subtly on hover.
    return (
      <div
        data-editor-safe
        role="button"
        tabIndex={0}
        title={`Tap to edit ${label}`}
        onClick={handleTap}
        onTouchEnd={handleTap}
        onKeyDown={handleKey}
        className={`group/editable relative cursor-pointer outline-dashed outline-2 outline-signal/40 outline-offset-[-2px] hover:outline-signal/80 focus:outline-signal/80 transition-[outline-color] ${className ?? ""}`}
      >
        {children}
        {/* Edit badge — always visible on mobile, hover-fade on desktop */}
        <span className="pointer-events-none absolute bottom-2 left-2 z-[76] inline-flex items-center gap-1 rounded bg-black/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-signal border border-signal/30 shadow-lg lg:opacity-0 lg:group-hover/editable:opacity-100 lg:transition-opacity">
          <Pencil size={10} className="shrink-0" />
          {label}
        </span>
      </div>
    );
  }

  // Text/content slots: subtle dashed outline, badge on hover/focus
  return (
    <div
      data-editor-safe
      role="button"
      tabIndex={0}
      title={`Edit ${label}`}
      onClick={handleTap}
      onKeyDown={handleKey}
      className={`group/editable relative cursor-pointer outline-dashed outline-1 outline-signal/30 outline-offset-2 hover:outline-signal/70 focus:outline-signal/70 transition-[outline-color] ${className ?? ""}`}
    >
      <span className="pointer-events-none absolute -top-5 left-0 z-[76] inline-flex items-center gap-1 rounded bg-signal px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black opacity-0 group-hover/editable:opacity-100 focus-within:opacity-100 transition-opacity shadow-sm whitespace-nowrap">
        <Pencil size={9} className="shrink-0" />
        {label}
      </span>
      {children}
    </div>
  );
}
