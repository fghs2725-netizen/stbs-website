"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Clock,
  FileText,
  Users,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MetricCard {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}

interface BarData {
  label: string;
  count: number;
}

interface AnalyticsData {
  totalRevenue: number;
  avgApprovalTime: number;
  documentsThisMonth: number;
  activeClients: number;
  documentsByType: BarData[];
  documentsByStatus: BarData[];
  topClients: BarData[];
  approvalTrend: BarData[];
}

type DateRange = "7" | "30" | "90";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("30");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/dashboard?days=${dateRange}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const metrics: MetricCard[] = data
    ? [
        {
          label: "Total Revenue",
          value: formatCurrency(data.totalRevenue),
          icon: DollarSign,
          color: "text-green-400",
        },
        {
          label: "Avg Approval Time",
          value: `${data.avgApprovalTime}d`,
          icon: Clock,
          color: "text-blue-400",
        },
        {
          label: "Documents (MTD)",
          value: data.documentsThisMonth,
          icon: FileText,
          color: "text-signal",
        },
        {
          label: "Active Clients",
          value: data.activeClients,
          icon: Users,
          color: "text-purple-400",
        },
      ]
    : [];

  const maxBarValue = (items: BarData[]) =>
    Math.max(...items.map((i) => i.count), 1);

  const HorizontalBar = ({
    item,
    max,
    color = "bg-signal",
  }: {
    item: BarData;
    max: number;
    color?: string;
  }) => (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400 w-32 truncate">{item.label}</span>
      <div className="flex-1 h-6 bg-surface rounded overflow-hidden">
        <div
          className={`h-full ${color} rounded transition-all duration-500`}
          style={{ width: `${(item.count / max) * 100}%` }}
        />
      </div>
      <span className="text-sm text-white font-medium w-10 text-right">
        {item.count}
      </span>
    </div>
  );

  const dateRanges: { value: DateRange; label: string }[] = [
    { value: "7", label: "7 Days" },
    { value: "30", label: "30 Days" },
    { value: "90", label: "90 Days" },
  ];

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-500",
    PENDING_REVIEW: "bg-yellow-500",
    APPROVED: "bg-green-500",
    FINALIZED: "bg-blue-500",
    REVISION: "bg-orange-500",
    REJECTED: "bg-red-500",
    CANCELLED: "bg-gray-600",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-oswald font-bold text-white">
            Analytics
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Business intelligence and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            {dateRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  dateRange === range.value
                    ? "bg-signal/10 text-signal"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center text-gray-500">
          Loading analytics...
        </div>
      ) : !data ? (
        <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center text-gray-500">
          No analytics data available
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">
                    {metric.label}
                  </span>
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                </div>
                <div className="text-2xl font-bold text-white">
                  {metric.value}
                </div>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Documents by Type */}
            <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-oswald font-semibold text-white mb-4">
                Documents by Type
              </h3>
              <div className="space-y-3">
                {data.documentsByType.length > 0 ? (
                  data.documentsByType.map((item) => (
                    <HorizontalBar
                      key={item.label}
                      item={item}
                      max={maxBarValue(data.documentsByType)}
                      color="bg-blue-500"
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No data available</p>
                )}
              </div>
            </div>

            {/* Documents by Status */}
            <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-oswald font-semibold text-white mb-4">
                Documents by Status
              </h3>
              <div className="space-y-3">
                {data.documentsByStatus.length > 0 ? (
                  data.documentsByStatus.map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-32 truncate">
                        {item.label.replace("_", " ")}
                      </span>
                      <div className="flex-1 h-6 bg-surface rounded overflow-hidden">
                        <div
                          className={`h-full ${
                            statusColors[item.label] || "bg-signal"
                          } rounded transition-all duration-500`}
                          style={{
                            width: `${(item.count / maxBarValue(data.documentsByStatus)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-white font-medium w-10 text-right">
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No data available</p>
                )}
              </div>
            </div>

            {/* Top Clients */}
            <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-oswald font-semibold text-white mb-4">
                Top Clients
              </h3>
              <div className="space-y-3">
                {data.topClients.length > 0 ? (
                  data.topClients.map((item) => (
                    <HorizontalBar
                      key={item.label}
                      item={item}
                      max={maxBarValue(data.topClients)}
                      color="bg-signal"
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No data available</p>
                )}
              </div>
            </div>

            {/* Approval Trend */}
            <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-oswald font-semibold text-white mb-4">
                Approval Trend
              </h3>
              <div className="space-y-3">
                {data.approvalTrend.length > 0 ? (
                  data.approvalTrend.map((item) => (
                    <HorizontalBar
                      key={item.label}
                      item={item}
                      max={maxBarValue(data.approvalTrend)}
                      color="bg-green-500"
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No data available</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
