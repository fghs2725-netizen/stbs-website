"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  FileText,
  User,
  Calendar,
  Loader2,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { DOCUMENT_TYPE_CONFIGS } from "@/lib/documents/template-registry";

interface PendingApproval {
  id: string;
  status: string;
  requesterNote: string | null;
  expiresAt: string | null;
  createdAt: string;
  document: {
    id: string;
    reference: string;
    title: string;
    type: string;
    status: string;
    totalAmount: number;
    clientCompany: string | null;
    client: { companyName: string } | null;
    creator: { name: string | null; email: string | null } | null;
  };
  rule: { name: string } | null;
}

interface PendingApprovalsListProps {
  refreshKey?: number;
}

export function PendingApprovalsList({ refreshKey }: PendingApprovalsListProps) {
  const router = useRouter();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "REVISION_REQUESTED" | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPending() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/approvals/pending");
        if (!res.ok) throw new Error("Failed to load approvals");
        const data = await res.json();
        setApprovals(data.pendingApprovals || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPending();
  }, [refreshKey]);

  const handleDecision = async (approvalRequestId: string) => {
    if (!decision) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/approvals/${approvalRequestId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment: comment || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setApprovals((prev) => prev.filter((a) => a.id !== approvalRequestId));
      setDecidingId(null);
      setDecision(null);
      setComment("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading pending approvals...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
        <AlertTriangle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500/50" />
        No pending approvals. All caught up!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {approvals.map((approval) => {
        const typeConfig =
          DOCUMENT_TYPE_CONFIGS[
            approval.document.type as keyof typeof DOCUMENT_TYPE_CONFIGS
          ] || { name: approval.document.type };
        const clientName =
          approval.document.client?.companyName ||
          approval.document.clientCompany ||
          "Unknown";

        return (
          <div
            key={approval.id}
            className="bg-surface border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() =>
                      router.push(
                        `/admin/documents/${approval.document.id}/builder`
                      )
                    }
                    className="text-gold font-medium text-sm hover:underline truncate"
                  >
                    {approval.document.reference}
                  </button>
                  <span className="px-2 py-0.5 text-[10px] rounded-md bg-white/5 text-gray-400 border border-white/10 whitespace-nowrap">
                    {typeConfig.name}
                  </span>
                  <span className="text-sm font-medium text-gray-300 whitespace-nowrap">
                    {formatCurrency(Number(approval.document.totalAmount))}
                  </span>
                </div>

                <p className="text-sm text-white truncate mb-1">
                  {approval.document.title}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {clientName}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {approval.document.creator?.name || "Unknown"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(approval.createdAt).toLocaleDateString("en-IN")}
                  </span>
                  {approval.expiresAt && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Clock className="w-3 h-3" />
                      Expires{" "}
                      {new Date(approval.expiresAt).toLocaleDateString("en-IN")}
                    </span>
                  )}
                </div>

                {approval.requesterNote && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    &quot;{approval.requesterNote}&quot;
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {decidingId !== approval.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setDecidingId(approval.id);
                        setDecision("APPROVED");
                      }}
                      className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDecidingId(approval.id);
                        setDecision("REJECTED");
                      }}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors"
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDecidingId(approval.id);
                        setDecision("REVISION_REQUESTED");
                      }}
                      className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg transition-colors"
                      title="Request Revision"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 min-w-[200px]">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Comment (optional)..."
                      className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-gold/50 resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecision(approval.id)}
                        disabled={submitting}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 ${
                          decision === "APPROVED"
                            ? "bg-green-600 hover:bg-green-700"
                            : decision === "REJECTED"
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {submitting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setDecidingId(null);
                          setDecision(null);
                          setComment("");
                        }}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
