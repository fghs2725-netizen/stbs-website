"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
} from "lucide-react";

interface JobStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  deadLetter: number;
}

interface QueueStatus {
  name: string;
  pending: number;
  active: number;
  completed: number;
  failed: number;
}

interface Job {
  id: string;
  type: string;
  queue: string;
  status: "pending" | "active" | "completed" | "failed" | "dead_letter";
  createdAt: string;
  data?: any;
}

type StatusFilter = "all" | "pending" | "active" | "completed" | "failed";

export default function JobsPage() {
  const [stats, setStats] = useState<JobStats>({
    pending: 0,
    active: 0,
    completed: 0,
    failed: 0,
    deadLetter: 0,
  });
  const [queues, setQueues] = useState<QueueStatus[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, jobsRes] = await Promise.all([
        fetch("/api/jobs/stats"),
        fetch(
          `/api/jobs${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`
        ),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || { pending: 0, active: 0, completed: 0, failed: 0, deadLetter: 0 });
        setQueues(data.queues || []);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error("Failed to fetch jobs data:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleCancelJob = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this job?")) return;
    try {
      await fetch(`/api/jobs/${id}/cancel`, { method: "POST" });
      fetchData();
    } catch (error) {
      console.error("Cancel failed:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      completed: "bg-green-500/20 text-green-400 border-green-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30",
      dead_letter: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    return (
      <span
        className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
          styles[status] || styles.pending
        }`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  const statCards = [
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-400" },
    { label: "Active", value: stats.active, icon: Play, color: "text-blue-400" },
    { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-400" },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-400" },
    { label: "Dead Letter", value: stats.deadLetter, icon: AlertTriangle, color: "text-gray-400" },
  ];

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-oswald font-bold text-white">Jobs</h1>
          <p className="text-sm text-gray-400 mt-1">
            Monitor and manage background job queues
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${
              autoRefresh
                ? "bg-signal/10 border-signal/30 text-signal"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            }`}
          >
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                {card.label}
              </span>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Queue Breakdown */}
      {queues.length > 0 && (
        <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-oswald font-semibold text-white mb-4">
            Queue Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Queue
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Pending
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Active
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Completed
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Failed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {queues.map((queue) => (
                  <tr key={queue.name} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {queue.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-yellow-400">
                      {queue.pending}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-400">
                      {queue.active}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-400">
                      {queue.completed}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-400">
                      {queue.failed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Job List */}
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
                  ID
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Queue
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No jobs found
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400 font-mono">
                        {job.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white">{job.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">{job.queue}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(job.status)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(job.status === "pending" || job.status === "active") && (
                        <button
                          onClick={() => handleCancelJob(job.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
