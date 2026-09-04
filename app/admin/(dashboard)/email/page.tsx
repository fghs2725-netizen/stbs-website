"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Search,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  X,
} from "lucide-react";

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: "sent" | "failed" | "pending";
  sentAt: string;
  templateId?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
}

interface EmailStats {
  sent: number;
  failed: number;
  pending: number;
  total: number;
}

type StatusFilter = "all" | "sent" | "failed" | "pending";

export default function EmailPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    sent: 0,
    failed: 0,
    pending: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
    templateId: "",
  });
  const [sending, setSending] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const [logsRes, templatesRes] = await Promise.all([
        fetch(`/api/email/logs?${params.toString()}`),
        fetch("/api/email/templates"),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
        setStats(
          data.stats || { sent: 0, failed: 0, pending: 0, total: 0 }
        );
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch email data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(composeData),
      });
      setShowCompose(false);
      setComposeData({ to: "", subject: "", body: "", templateId: "" });
      fetchData();
    } catch (error) {
      console.error("Send failed:", error);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      sent: "bg-green-500/20 text-green-400 border-green-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30",
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    };
    return (
      <span
        className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
          styles[status] || styles.pending
        }`}
      >
        {status}
      </span>
    );
  };

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "sent", label: "Sent" },
    { value: "failed", label: "Failed" },
    { value: "pending", label: "Pending" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Email</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage email logs, templates, and notifications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="px-4 py-2 bg-signal text-ink text-sm font-bold rounded-lg hover:bg-signal/90 transition-colors shadow-[0_0_15px_rgba(247,198,0,0.3)]"
          >
            <Send className="w-4 h-4 inline mr-2" />
            Compose
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase">Total</span>
            <Mail className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase">Sent</span>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.sent}</div>
        </div>
        <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase">Failed</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
        </div>
        <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase">Pending</span>
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {stats.pending}
          </div>
        </div>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-display font-semibold text-white mb-4">
            Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 bg-surface border border-white/5 rounded-xl hover:border-white/10 transition-colors"
              >
                <div className="flex items-center mb-2">
                  <FileText className="w-4 h-4 text-signal mr-2" />
                  <span className="text-sm font-medium text-white">
                    {template.name}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{template.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Log */}
      <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <div className="flex gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  statusFilter === filter.value
                    ? "bg-signal/10 text-signal border border-signal/30"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Sent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No email logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm text-white">{log.to}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">{log.subject}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">
                        {new Date(log.sentAt).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-steel border border-white/10 rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-lg font-display font-semibold text-white">
                Compose Email
              </h3>
              <button
                onClick={() => setShowCompose(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">
                  To
                </label>
                <input
                  type="email"
                  value={composeData.to}
                  onChange={(e) =>
                    setComposeData({ ...composeData, to: e.target.value })
                  }
                  className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-signal/50"
                  placeholder="recipient@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">
                  Template
                </label>
                <select
                  value={composeData.templateId}
                  onChange={(e) =>
                    setComposeData({ ...composeData, templateId: e.target.value })
                  }
                  className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-signal/50"
                >
                  <option value="">No template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) =>
                    setComposeData({ ...composeData, subject: e.target.value })
                  }
                  className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-signal/50"
                  placeholder="Email subject"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">
                  Body
                </label>
                <textarea
                  value={composeData.body}
                  onChange={(e) =>
                    setComposeData({ ...composeData, body: e.target.value })
                  }
                  rows={5}
                  className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-signal/50 resize-none"
                  placeholder="Email content..."
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 bg-signal text-ink text-sm font-bold rounded-lg hover:bg-signal/90 transition-colors disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
