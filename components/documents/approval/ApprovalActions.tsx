"use client";

import { useState } from "react";
import {
  Send,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface ApprovalActionsProps {
  documentId: string;
  documentStatus: string;
  activeApprovalRequest?: {
    id: string;
    status: string;
    expiresAt?: string | null;
  } | null;
  onAction?: () => void;
}

export function ApprovalActions({
  documentId,
  documentStatus,
  activeApprovalRequest,
  onAction,
}: ApprovalActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showDecision, setShowDecision] = useState<
    "APPROVED" | "REJECTED" | "REVISION_REQUESTED" | null
  >(null);

  const isDraft = documentStatus === "DRAFT";
  const isPending = activeApprovalRequest?.status === "PENDING";
  const isExpired =
    !!(activeApprovalRequest?.expiresAt &&
    new Date(activeApprovalRequest.expiresAt) < new Date());

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit for approval");
      }
      setNote("");
      onAction?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED") => {
    if (!activeApprovalRequest) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/approvals/${activeApprovalRequest.id}/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, comment: note || undefined }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process decision");
      }
      setNote("");
      setShowDecision(null);
      onAction?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeApprovalRequest) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/approvals/${activeApprovalRequest.id}/cancel`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel approval");
      }
      onAction?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Submit for approval (when draft) */}
      {isDraft && !isPending && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for reviewers (optional)..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-gold/50 resize-none"
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit for Approval
          </button>
        </div>
      )}

      {/* Active approval status */}
      {isPending && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-amber-400">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>Under review</span>
            {activeApprovalRequest?.expiresAt && (
              <span className="text-gray-500">
                &middot; Expires{" "}
                {new Date(activeApprovalRequest.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {isExpired && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              This approval request has expired
            </div>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Decision comment (optional)..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-gold/50 resize-none"
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
            {!showDecision && (
              <>
                <button
                  onClick={() => setShowDecision("APPROVED")}
                  disabled={loading || isExpired}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => setShowDecision("REJECTED")}
                  disabled={loading || isExpired}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => setShowDecision("REVISION_REQUESTED")}
                  disabled={loading || isExpired}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Request Revision
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
            {showDecision && (
              <>
                <button
                  onClick={() => handleDecision(showDecision)}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    showDecision === "APPROVED"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : showDecision === "REJECTED"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : showDecision === "APPROVED" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : showDecision === "REJECTED" ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Confirm{" "}
                  {showDecision === "REVISION_REQUESTED"
                    ? "Revision"
                    : showDecision}
                </button>
                <button
                  onClick={() => setShowDecision(null)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rejected or revision - can resubmit */}
      {(documentStatus === "REJECTED" || documentStatus === "REVISION") &&
        !isPending && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RotateCcw className="w-4 h-4" />
              <span>
                {documentStatus === "REJECTED"
                  ? "Document was rejected"
                  : "Document needs revision"}
                . Make changes and resubmit.
              </span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Resubmission note (optional)..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-gold/50 resize-none"
              rows={2}
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Resubmit for Approval
            </button>
          </div>
        )}
    </div>
  );
}
