"use client";

import type { ReactNode } from "react";
import { useWebsiteEditor } from "@/lib/website/editor-context";

/**
 * Wraps a rendered website element so it can be clicked to edit in the visual
 * editor. On the public site (no provider / preview mode) it is a transparent
 * pass-through and never renders any affordance.
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

  return (
    <div
      data-editor-safe
      role="button"
      tabIndex={0}
      title={`Edit ${label}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        editor.openEditor(target);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          editor.openEditor(target);
        }
      }}
      className={`group/editable relative cursor-pointer outline outline-2 outline-transparent outline-offset-2 transition outline-solid hover:outline-dashed hover:outline-signal/90 hover:outline-2 ${className ?? ""}`}
    >
      <span className="pointer-events-none absolute -top-2.5 left-2 z-[75] hidden rounded-sm bg-signal px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black shadow-[0_2px_10px_rgba(0,0,0,.4)] group-hover/editable:block">
        {label}
      </span>
      {children}
    </div>
  );
}