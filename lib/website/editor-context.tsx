"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SerializedSection } from "@/lib/website/action-types";
import {
  deleteSection,
  duplicateSection,
  reorderSections,
  toggleSectionVisibility,
} from "@/lib/website/actions";

/**
 * An "editor signal" describes what the contextual drawer should show after a
 * user clicks an element in the shared website preview. It is never exposed to
 * public visitors — those renders run without a WebsiteEditorProvider.
 */
export type EditorSignal =
  | { kind: "section"; section: SerializedSection }
  | { kind: "section-field"; section: SerializedSection; fieldKey?: string }
  | { kind: "services" }
  | { kind: "testimonials" }
  | { kind: "clients" }
  | { kind: "gallery" }
  | { kind: "nav" }
  | { kind: "settings" }
  | { kind: "seo" };

type Mode = "edit" | "preview";

interface WebsiteEditorContextValue {
  isEditor: boolean;
  mode: Mode;
  setMode: (mode: Mode) => void;
  signal: EditorSignal | null;
  openEditor: (signal: EditorSignal) => void;
  closeEditor: () => void;
  moveSection: (id: string, dir: "up" | "down") => void;
  hideSection: (id: string) => void;
  duplicateSectionById: (id: string) => void;
  removeSectionById: (id: string) => void;
}

const WebsiteEditorContext = createContext<WebsiteEditorContextValue>({
  isEditor: false,
  mode: "edit",
  setMode: () => {},
  signal: null,
  openEditor: () => {},
  closeEditor: () => {},
  moveSection: () => {},
  hideSection: () => {},
  duplicateSectionById: () => {},
  removeSectionById: () => {},
});

export function useWebsiteEditor() {
  return useContext(WebsiteEditorContext);
}

export function WebsiteEditorProvider({
  pageId,
  sections,
  children,
}: {
  pageId: string;
  sections: SerializedSection[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("edit");
  const [signal, setSignal] = useState<EditorSignal | null>(null);

  const openEditor = useCallback((s: EditorSignal) => setSignal(s), []);
  const closeEditor = useCallback(() => setSignal(null), []);

  const moveSection = useCallback(
    (id: string, dir: "up" | "down") => {
      const index = sections.findIndex((s) => s.id === id);
      const swapWith = dir === "up" ? index - 1 : index + 1;
      if (index < 0 || swapWith < 0 || swapWith >= sections.length) return;
      const ordered = sections.map((s) => s.id);
      [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];
      void reorderSections(pageId, ordered);
      router.refresh();
    },
    [pageId, sections, router]
  );

  const hideSection = useCallback(
    (id: string) => {
      void toggleSectionVisibility(id);
      router.refresh();
    },
    [router]
  );

  const duplicateSectionById = useCallback(
    (id: string) => {
      void duplicateSection(id);
      router.refresh();
    },
    [router]
  );

  const removeSectionById = useCallback(
    (id: string) => {
      void deleteSection(id);
      setSignal(null);
      router.refresh();
    },
    [router]
  );

  return (
    <WebsiteEditorContext.Provider
      value={{
        isEditor: true,
        mode,
        setMode,
        signal,
        openEditor,
        closeEditor,
        moveSection,
        hideSection,
        duplicateSectionById,
        removeSectionById,
      }}
    >
      {children}
    </WebsiteEditorContext.Provider>
  );
}