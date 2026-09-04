"use client";

import { useEffect, useState, useCallback } from "react";
import {
  GitCompare,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Equal,
  Loader2,
  X,
  FileText,
  Package,
  LayoutList,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface VersionMeta {
  id: string;
  versionNumber: number;
  createdAt: string;
}

interface FieldDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changed: boolean;
}

interface ArrayDiffItem {
  key: string;
  status: "added" | "removed" | "modified" | "unchanged";
  oldItem?: Record<string, unknown>;
  newItem?: Record<string, unknown>;
  fields?: FieldDiff[];
}

interface VersionDiff {
  versionA: VersionMeta;
  versionB: VersionMeta;
  metadata: FieldDiff[];
  items: ArrayDiffItem[];
  sections: ArrayDiffItem[];
}

interface VersionCompareViewProps {
  documentId: string;
  onClose: () => void;
}

const METADATA_LABELS: Record<string, string> = {
  title: "Title",
  subject: "Subject",
  notes: "Notes",
  terms: "Terms",
  clientName: "Client Name",
  clientEmail: "Client Email",
  clientCompany: "Client Company",
  totalAmount: "Total Amount",
};

export function VersionCompareView({ documentId, onClose }: VersionCompareViewProps) {
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"metadata" | "items" | "sections">("metadata");

  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await fetch(`/api/documents/${documentId}/versions/history`);
        if (res.ok) {
          const data = await res.json();
          const list: VersionMeta[] = (data.history || []).map((v: any) => ({
            id: v.id,
            versionNumber: v.versionNumber,
            createdAt: v.createdAt,
          }));
          setVersions(list);
          if (list.length >= 2) {
            setFromId(list[1].id);
            setToId(list[0].id);
          }
        }
      } catch {
        console.error("Failed to load versions");
      } finally {
        setVersionsLoading(false);
      }
    }
    fetchVersions();
  }, [documentId]);

  const fetchDiff = useCallback(async () => {
    if (!fromId || !toId) return;
    setLoading(true);
    setError(null);
    setDiff(null);
    try {
      const res = await fetch(
        `/api/documents/${documentId}/versions/compare?from=${fromId}&to=${toId}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to compare");
      }
      const data = await res.json();
      setDiff(data.diff);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [documentId, fromId, toId]);

  useEffect(() => {
    if (fromId && toId) fetchDiff();
  }, [fromId, toId, fetchDiff]);

  const formatValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (field === "totalAmount") return formatCurrency(Number(value));
    return String(value);
  };

  const stats = diff
    ? {
        metadataChanged: diff.metadata.filter((f) => f.changed).length,
        itemsAdded: diff.items.filter((i) => i.status === "added").length,
        itemsRemoved: diff.items.filter((i) => i.status === "removed").length,
        itemsModified: diff.items.filter((i) => i.status === "modified").length,
        sectionsChanged: diff.sections.filter((i) => i.status !== "unchanged").length,
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[90vh] bg-ink border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <GitCompare className="w-5 h-5 text-gold" />
            <h2 className="text-lg font-display font-bold text-white">Compare Versions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version Selectors */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-surface/50">
          {versionsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          ) : (
            <>
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">
                  Base Version
                </label>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} — {new Date(v.createdAt).toLocaleDateString("en-IN")}
                    </option>
                  ))}
                </select>
              </div>

              <ArrowRight className="w-5 h-5 text-gray-500 mt-5 shrink-0" />

              <div className="flex-1">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">
                  Compare Version
                </label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} — {new Date(v.createdAt).toLocaleDateString("en-IN")}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Comparing versions...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400 text-sm">{error}</div>
          ) : !diff ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              Select two versions to compare
            </div>
          ) : (
            <>
              {/* Stats */}
              {stats && (
                <div className="flex gap-4 mb-6">
                  {stats.metadataChanged > 0 && (
                    <span className="px-2 py-1 text-xs rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {stats.metadataChanged} metadata field{stats.metadataChanged !== 1 ? "s" : ""} changed
                    </span>
                  )}
                  {stats.itemsAdded > 0 && (
                    <span className="px-2 py-1 text-xs rounded-md bg-green-500/10 text-green-400 border border-green-500/20">
                      {stats.itemsAdded} item{stats.itemsAdded !== 1 ? "s" : ""} added
                    </span>
                  )}
                  {stats.itemsRemoved > 0 && (
                    <span className="px-2 py-1 text-xs rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                      {stats.itemsRemoved} item{stats.itemsRemoved !== 1 ? "s" : ""} removed
                    </span>
                  )}
                  {stats.itemsModified > 0 && (
                    <span className="px-2 py-1 text-xs rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {stats.itemsModified} item{stats.itemsModified !== 1 ? "s" : ""} modified
                    </span>
                  )}
                  {stats.sectionsChanged > 0 && (
                    <span className="px-2 py-1 text-xs rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {stats.sectionsChanged} section{stats.sectionsChanged !== 1 ? "s" : ""} changed
                    </span>
                  )}
                  {stats.metadataChanged === 0 && stats.itemsAdded === 0 && stats.itemsRemoved === 0 && stats.itemsModified === 0 && stats.sectionsChanged === 0 && (
                    <span className="px-2 py-1 text-xs rounded-md bg-white/5 text-gray-400 border border-white/10">
                      No differences found
                    </span>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1 w-fit">
                {[
                  { id: "metadata" as const, label: "Metadata", icon: FileText },
                  { id: "items" as const, label: "BOQ Items", icon: Package },
                  { id: "sections" as const, label: "Sections", icon: LayoutList },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? "bg-white/10 text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Metadata Diff */}
              {activeTab === "metadata" && (
                <div className="space-y-1">
                  {diff.metadata.map((field) => (
                    <div
                      key={field.field}
                      className={`flex items-stretch rounded-lg overflow-hidden ${
                        field.changed ? "bg-white/[0.03]" : ""
                      }`}
                    >
                      <div className="w-36 shrink-0 px-3 py-2 text-xs text-gray-500 bg-white/[0.02] border-r border-white/5 flex items-center">
                        {METADATA_LABELS[field.field] || field.field}
                      </div>
                      <div className="flex-1 flex">
                        <div
                          className={`flex-1 px-3 py-2 text-sm border-r border-white/5 ${
                            field.changed ? "bg-red-500/5 text-red-300" : "text-gray-400"
                          }`}
                        >
                          {field.changed && <Minus className="w-3 h-3 inline mr-1 text-red-400" />}
                          {formatValue(field.field, field.oldValue)}
                        </div>
                        <div
                          className={`flex-1 px-3 py-2 text-sm ${
                            field.changed ? "bg-green-500/5 text-green-300" : "text-gray-400"
                          }`}
                        >
                          {field.changed && <Plus className="w-3 h-3 inline mr-1 text-green-400" />}
                          {formatValue(field.field, field.newValue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Items Diff */}
              {activeTab === "items" && (
                <div className="space-y-1">
                  {diff.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">No items in either version</div>
                  ) : (
                    diff.items.map((item) => (
                      <div
                        key={item.key}
                        className={`rounded-lg overflow-hidden border ${
                          item.status === "added"
                            ? "border-green-500/20 bg-green-500/5"
                            : item.status === "removed"
                              ? "border-red-500/20 bg-red-500/5"
                              : item.status === "modified"
                                ? "border-blue-500/20 bg-blue-500/5"
                                : "border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 px-3 py-2">
                          <span
                            className={`shrink-0 p-0.5 rounded ${
                              item.status === "added"
                                ? "bg-green-500/20 text-green-400"
                                : item.status === "removed"
                                  ? "bg-red-500/20 text-red-400"
                                  : item.status === "modified"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-white/5 text-gray-500"
                            }`}
                          >
                            {item.status === "added" && <Plus className="w-3 h-3" />}
                            {item.status === "removed" && <Minus className="w-3 h-3" />}
                            {item.status === "modified" && <GitCompare className="w-3 h-3" />}
                            {item.status === "unchanged" && <Equal className="w-3 h-3" />}
                          </span>
                          <span className="text-sm text-white truncate">
                            {String(item.newItem?.description || item.oldItem?.description || item.key)}
                          </span>
                          <span className="text-[10px] text-gray-600 ml-auto shrink-0">
                            {item.status}
                          </span>
                        </div>

                        {item.status === "modified" && item.fields && (
                          <div className="border-t border-white/5 px-3 py-2">
                            {item.fields
                              .filter((f) => f.changed)
                              .map((field) => (
                                <div key={field.field} className="flex items-center gap-2 text-xs mb-1 last:mb-0">
                                  <span className="text-gray-500 w-20 shrink-0">{field.field}</span>
                                  <span className="text-red-400 line-through truncate max-w-[200px]">
                                    {formatValue(field.field, field.oldValue)}
                                  </span>
                                  <span className="text-gray-600">→</span>
                                  <span className="text-green-400 truncate max-w-[200px]">
                                    {formatValue(field.field, field.newValue)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sections Diff */}
              {activeTab === "sections" && (
                <div className="space-y-1">
                  {diff.sections.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">No sections in either version</div>
                  ) : (
                    diff.sections.map((section) => (
                      <div
                        key={section.key}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                          section.status === "added"
                            ? "bg-green-500/5 border border-green-500/20"
                            : section.status === "removed"
                              ? "bg-red-500/5 border border-red-500/20"
                              : section.status === "modified"
                                ? "bg-blue-500/5 border border-blue-500/20"
                                : "bg-white/[0.02]"
                        }`}
                      >
                        <span
                          className={`shrink-0 p-0.5 rounded ${
                            section.status === "added"
                              ? "bg-green-500/20 text-green-400"
                              : section.status === "removed"
                                ? "bg-red-500/20 text-red-400"
                                : section.status === "modified"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-white/5 text-gray-500"
                          }`}
                        >
                          {section.status === "added" && <Plus className="w-3 h-3" />}
                          {section.status === "removed" && <Minus className="w-3 h-3" />}
                          {section.status === "modified" && <GitCompare className="w-3 h-3" />}
                          {section.status === "unchanged" && <Equal className="w-3 h-3" />}
                        </span>
                        <span className="text-sm text-white">{section.key}</span>
                        <span className="text-[10px] text-gray-600 ml-auto">{section.status}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
