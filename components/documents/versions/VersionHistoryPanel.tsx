"use client";

import { useEffect, useState, useCallback } from "react";
import {
  History,
  GitCompare,
  RotateCcw,
  Download,
  FileText,
  Clock,
  User,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface VersionEntry {
  id: string;
  versionNumber: number;
  changeNote: string | null;
  createdBy: string | null;
  createdAt: string;
  hasSnapshot: boolean;
  snapshotSize: number;
  itemCount: number;
  sectionCount: number;
}

interface VersionHistoryPanelProps {
  documentId: string;
  currentStatus: string;
  onRestore?: () => void;
  refreshKey?: number;
}

export function VersionHistoryPanel({
  documentId,
  currentStatus,
  onRestore,
  refreshKey,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions/history`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.history || []);
      }
    } catch {
      console.error("Failed to load version history");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions, refreshKey]);

  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Restore to version ${versionNumber}? This will create a new version with the restored content.`)) {
      return;
    }
    setRestoringId(versionId);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to restore");
      }
      await fetchVersions();
      onRestore?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRestoringId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canRestore = currentStatus !== "ARCHIVED" && currentStatus !== "CANCELLED";

  return (
    <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-white">Version History</span>
          {versions.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white/5 text-gray-400">
              {versions.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/5">
          {error && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading versions...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No versions saved yet. Versions are created automatically when you save changes.
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {versions.map((version, idx) => {
                const isLatest = idx === 0;
                const isRestoring = restoringId === version.id;

                return (
                  <div
                    key={version.id}
                    className={`px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                      isLatest ? "bg-white/[0.02]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                              isLatest
                                ? "bg-gold/20 text-gold border border-gold/30"
                                : "bg-white/5 text-gray-400 border border-white/10"
                            }`}
                          >
                            v{version.versionNumber}
                          </span>
                          {isLatest && (
                            <span className="text-[10px] text-gold font-medium">
                              CURRENT
                            </span>
                          )}
                          {version.changeNote && (
                            <span className="text-xs text-gray-500 truncate">
                              — {version.changeNote}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(version.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {version.createdBy && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {version.createdBy}
                            </span>
                          )}
                          {version.hasSnapshot && (
                            <span>
                              {version.itemCount} items · {version.sectionCount} sections · {formatBytes(version.snapshotSize)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isLatest && canRestore && (
                          <button
                            onClick={() => handleRestore(version.id, version.versionNumber)}
                            disabled={isRestoring}
                            className="p-1.5 text-gray-500 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors disabled:opacity-50"
                            title="Restore this version"
                          >
                            {isRestoring ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
