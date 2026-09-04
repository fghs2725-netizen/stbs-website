"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Database,
  HardDrive,
  Cpu,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency: number;
  lastChecked: string;
  message?: string;
}

interface HealthData {
  status: "healthy" | "degraded" | "down";
  uptime: number;
  checks: HealthCheck[];
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (error) {
      console.error("Failed to fetch health data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "degraded":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "down":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "degraded":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case "down":
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getServiceIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "database":
        return <Database className="w-5 h-5" />;
      case "storage":
        return <HardDrive className="w-5 h-5" />;
      case "memory":
        return <Cpu className="w-5 h-5" />;
      case "jobs":
        return <Clock className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Health</h1>
          <p className="text-sm text-gray-400 mt-1">
            System health status and service monitoring
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 inline mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {loading && !health ? (
        <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center text-gray-500">
          Loading health data...
        </div>
      ) : !health ? (
        <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center text-gray-500">
          No health data available
        </div>
      ) : (
        <>
          {/* Overall Status */}
          <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                    health.status === "healthy"
                      ? "bg-green-500/20"
                      : health.status === "degraded"
                      ? "bg-yellow-500/20"
                      : "bg-red-500/20"
                  }`}
                >
                  {getStatusIcon(health.status)}
                </div>
                <div>
                  <h2 className="text-xl font-display font-semibold text-white">
                    System Status
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
                        health.status
                      )}`}
                    >
                      {health.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Uptime</div>
                <div className="text-xl font-bold text-white">
                  {formatUptime(health.uptime)}
                </div>
              </div>
            </div>
          </div>

          {/* Service Checks */}
          <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-lg font-display font-semibold text-white">
                Service Checks
              </h2>
            </div>

            <div className="divide-y divide-white/5">
              {health.checks.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  No service checks configured
                </div>
              ) : (
                health.checks.map((check) => (
                  <div
                    key={check.name}
                    className="px-6 py-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="p-2 bg-surface border border-white/5 rounded-lg mr-4">
                          {getServiceIcon(check.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {check.name}
                          </div>
                          {check.message && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {check.message}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Latency</div>
                          <div className="text-sm text-white">
                            {check.latency}ms
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Last Checked
                          </div>
                          <div className="text-sm text-gray-400">
                            {new Date(check.lastChecked).toLocaleTimeString()}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
                            check.status
                          )}`}
                        >
                          {check.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
