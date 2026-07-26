"use client";

import { useEffect, useState } from "react";
import {
  Send,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  Ban,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ApprovalStatusBadge } from "./ApprovalStatusBadge";

interface HistoryEntry {
  id: string;
  action: string;
  performedBy: string | null;
  comment: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  createdAt: string;
}

interface ApprovalRequest {
  id: string;
  status: string;
  requestedBy: string | null;
  requesterNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  expiresAt: string | null;
  createdAt: string;
  history: HistoryEntry[];
}

interface ApprovalTimelineProps {
  documentId: string;
  refreshKey?: number;
}

const ACTION_ICONS: Record<string, typeof Send> = {
  SUBMITTED: Send,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  REVISION_REQUESTED: RotateCcw,
  CANCELLED: Ban,
  EXPIRED: AlertCircle,
  RESTARTED: Clock,
};

const ACTION_COLORS: Record<string, string> = {
  SUBMITTED: "text-amber-400 bg-amber-400/10",
  APPROVED: "text-green-400 bg-green-400/10",
  REJECTED: "text-red-400 bg-red-400/10",
  REVISION_REQUESTED: "text-blue-400 bg-blue-400/10",
  CANCELLED: "text-gray-400 bg-gray-400/10",
  EXPIRED: "text-orange-400 bg-orange-400/10",
  RESTARTED: "text-purple-400 bg-purple-400/10",
};

export function ApprovalTimeline({
  documentId,
  refreshKey,
}: ApprovalTimelineProps) {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/documents/${documentId}/approval`
        );
        if (res.ok) {
          const data = await res.json();
          setRequests(data.history || []);
        }
      } catch (err) {
        console.error("Failed to load approval history", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [documentId, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading approval history...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No approval history yet. Submit this document for approval to start the
        workflow.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {requests.map((request) => (
        <div key={request.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ApprovalStatusBadge status={request.status} size="sm" />
              <span className="text-xs text-gray-500">
                {new Date(request.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {request.expiresAt && (
              <span className="text-xs text-gray-500">
                Expires{" "}
                {new Date(request.expiresAt).toLocaleDateString("en-IN")}
              </span>
            )}
          </div>

          {request.requesterNote && (
            <div className="text-sm text-gray-400 italic pl-4 border-l-2 border-white/10">
              &quot;{request.requesterNote}&quot;
            </div>
          )}

          <div className="relative ml-4">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10" />
            {request.history.map((entry, idx) => {
              const Icon = ACTION_ICONS[entry.action] || Clock;
              const colorClass =
                ACTION_COLORS[entry.action] || "text-gray-400 bg-gray-400/10";
              return (
                <div key={entry.id} className="relative flex items-start gap-3 pb-4 pl-4">
                  <div
                    className={`absolute left-[-5px] top-1 w-[10px] h-[10px] rounded-full border-2 border-steel ${colorClass.split(" ")[1]}`}
                  />
                  <div
                    className={`shrink-0 p-1 rounded-full ${colorClass}`}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {entry.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      {entry.previousStatus && entry.newStatus && (
                        <span className="text-xs text-gray-500">
                          {entry.previousStatus} → {entry.newStatus}
                        </span>
                      )}
                    </div>
                    {entry.comment && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        &quot;{entry.comment}&quot;
                      </p>
                    )}
                    <span className="text-[10px] text-gray-600 mt-0.5 block">
                      {new Date(entry.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
