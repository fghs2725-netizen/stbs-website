import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MetricName =
  | "revenue"
  | "approval_time"
  | "documents_generated"
  | "top_clients"
  | "storage_usage"
  | "documents_by_type"
  | "documents_by_status"
  | "pending_approvals"
  | "total_clients"
  | "total_projects";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DashboardData {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    trend: number;
  };
  approvalTime: {
    avgHours: number;
    trend: number;
  };
  documents: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    trend: number;
  };
  topClients: Array<{
    clientId: string;
    clientName: string;
    documentCount: number;
    totalAmount: number;
  }>;
  storage: {
    totalFiles: number;
    totalBytes: number;
    quotaUsed: number;
  };
  pendingApprovals: number;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    description: string | null;
    createdAt: Date;
  }>;
}

export interface MetricHistoryPoint {
  date: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsSnapshotData {
  date: Date;
  metric: string;
  value: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ─── Analytics Service ──────────────────────────────────────────────────────

class AnalyticsService {
  /**
   * Generate a daily snapshot of a specific metric.
   */
  async generateDailySnapshot(metric: MetricName, date?: Date): Promise<void> {
    const targetDate = date || new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      const value = await this.computeMetric(metric, dayStart, dayEnd);

      await prisma.analyticsSnapshot.upsert({
        where: {
          date_metric: {
            date: dayStart,
            metric,
          },
        },
        create: {
          date: dayStart,
          metric,
          value: JSON.parse(JSON.stringify(value)),
        },
        update: {
          value: JSON.parse(JSON.stringify(value)),
        },
      });
    } catch (error) {
      console.error(`[AnalyticsService] Failed to generate snapshot for ${metric}:`, error);
    }
  }

  /**
   * Generate all daily snapshots.
   */
  async generateAllSnapshots(date?: Date): Promise<void> {
    const metrics: MetricName[] = [
      "revenue",
      "documents_generated",
      "documents_by_type",
      "documents_by_status",
      "storage_usage",
      "total_clients",
      "total_projects",
    ];

    for (const metric of metrics) {
      await this.generateDailySnapshot(metric, date);
    }
  }

  /**
   * Compute a single metric value for a date range.
   */
  private async computeMetric(metric: MetricName, from: Date, to: Date): Promise<Record<string, unknown>> {
    switch (metric) {
      case "revenue":
        return this.computeRevenue(from, to);
      case "documents_generated":
        return this.computeDocumentsGenerated(from, to);
      case "documents_by_type":
        return this.computeDocumentsByType(from, to);
      case "documents_by_status":
        return this.computeDocumentsByStatus(from, to);
      case "storage_usage":
        return this.computeStorageUsage();
      case "total_clients":
        return this.computeTotalClients();
      case "total_projects":
        return this.computeTotalProjects();
      default:
        return {};
    }
  }

  private async computeRevenue(from: Date, to: Date): Promise<Record<string, unknown>> {
    const result = await prisma.document.aggregate({
      where: {
        createdAt: { gte: from, lte: to },
        deletedAt: null,
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    return {
      totalAmount: Number(result._sum.totalAmount || 0),
      count: result._count,
    };
  }

  private async computeDocumentsGenerated(from: Date, to: Date): Promise<Record<string, unknown>> {
    const count = await prisma.document.count({
      where: {
        createdAt: { gte: from, lte: to },
        deletedAt: null,
      },
    });

    return { count };
  }

  private async computeDocumentsByType(from: Date, to: Date): Promise<Record<string, unknown>> {
    const grouped = await prisma.document.groupBy({
      by: ["type"],
      where: {
        createdAt: { gte: from, lte: to },
        deletedAt: null,
      },
      _count: true,
    });

    return Object.fromEntries(grouped.map((g) => [g.type, g._count]));
  }

  private async computeDocumentsByStatus(from: Date, to: Date): Promise<Record<string, unknown>> {
    const grouped = await prisma.document.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: from, lte: to },
        deletedAt: null,
      },
      _count: true,
    });

    return Object.fromEntries(grouped.map((g) => [g.status, g._count]));
  }

  private async computeStorageUsage(): Promise<Record<string, unknown>> {
    const result = await prisma.storageFile.aggregate({
      _sum: { size: true },
      _count: true,
    });

    const quotas = await prisma.storageQuota.aggregate({
      _sum: { usedBytes: true, maxBytes: true },
    });

    return {
      totalFiles: result._count,
      totalBytes: Number(result._sum.size || 0),
      totalQuotaUsed: Number(quotas._sum.usedBytes || 0),
      totalQuotaMax: Number(quotas._sum.maxBytes || 0),
    };
  }

  private async computeTotalClients(): Promise<Record<string, unknown>> {
    const count = await prisma.client.count({ where: { deletedAt: null } });
    return { count };
  }

  private async computeTotalProjects(): Promise<Record<string, unknown>> {
    const count = await prisma.project.count({ where: { deletedAt: null } });
    return { count };
  }

  /**
   * Get full dashboard data for a date range.
   */
  async getDashboardData(dateRange: DateRange): Promise<DashboardData> {
    const { from, to } = dateRange;

    const monthStart = new Date(from);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(to);

    const lastMonthEnd = new Date(monthStart);
    lastMonthEnd.setDate(0);
    lastMonthEnd.setHours(23, 59, 59, 999);
    const lastMonthStart = new Date(lastMonthEnd);
    lastMonthStart.setDate(1);
    lastMonthStart.setHours(0, 0, 0, 0);

    const [
      thisMonthRevenue,
      lastMonthRevenue,
      thisMonthDocs,
      lastMonthDocs,
      topClientsData,
      storageData,
      pendingApprovals,
      recentActivity,
    ] = await Promise.all([
      prisma.document.aggregate({
        where: { createdAt: { gte: monthStart, lte: monthEnd }, deletedAt: null },
        _sum: { totalAmount: true },
      }),
      prisma.document.aggregate({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, deletedAt: null },
        _sum: { totalAmount: true },
      }),
      prisma.document.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd }, deletedAt: null },
      }),
      prisma.document.count({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, deletedAt: null },
      }),
      prisma.document.groupBy({
        by: ["clientId"],
        where: { createdAt: { gte: from, lte: to }, deletedAt: null, clientId: { not: null } },
        _count: true,
        _sum: { totalAmount: true },
        orderBy: { _count: { clientId: "desc" } },
        take: 5,
      }),
      prisma.storageFile.aggregate({
        _sum: { size: true },
        _count: true,
      }),
      prisma.approvalRequest.count({
        where: { status: "PENDING" },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, action: true, entityType: true, description: true, createdAt: true },
      }),
    ]);

    const thisMonthAmount = Number(thisMonthRevenue._sum.totalAmount || 0);
    const lastMonthAmount = Number(lastMonthRevenue._sum.totalAmount || 0);

    const clientIds = topClientsData.map((c) => c.clientId).filter(Boolean) as string[];
    const clients = clientIds.length > 0
      ? await prisma.client.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, companyName: true },
        })
      : [];
    const clientMap = new Map(clients.map((c) => [c.id, c.companyName]));

    const topClients = topClientsData.map((c) => ({
      clientId: c.clientId!,
      clientName: clientMap.get(c.clientId!) || "Unknown",
      documentCount: c._count,
      totalAmount: Number(c._sum.totalAmount || 0),
    }));

    const totalApprovalDocs = await prisma.document.findMany({
      where: {
        status: { in: ["APPROVED", "REJECTED", "ISSUED"] },
        updatedAt: { gte: from, lte: to },
        deletedAt: null,
      },
      select: { createdAt: true, updatedAt: true },
    });

    const avgHours = totalApprovalDocs.length > 0
      ? totalApprovalDocs.reduce((sum, d) => sum + (d.updatedAt.getTime() - d.createdAt.getTime()), 0) / totalApprovalDocs.length / 3600000
      : 0;

    const revenueTrend = lastMonthAmount > 0 ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100 : 0;
    const docsTrend = lastMonthDocs > 0 ? ((thisMonthDocs - lastMonthDocs) / lastMonthDocs) * 100 : 0;

    const quotaData = await prisma.storageQuota.aggregate({
      _sum: { usedBytes: true },
    });

    return {
      revenue: {
        total: thisMonthAmount,
        thisMonth: thisMonthAmount,
        lastMonth: lastMonthAmount,
        trend: Math.round(revenueTrend * 100) / 100,
      },
      approvalTime: {
        avgHours: Math.round(avgHours * 100) / 100,
        trend: 0,
      },
      documents: {
        total: await prisma.document.count({ where: { deletedAt: null } }),
        thisMonth: thisMonthDocs,
        lastMonth: lastMonthDocs,
        trend: Math.round(docsTrend * 100) / 100,
      },
      topClients,
      storage: {
        totalFiles: storageData._count,
        totalBytes: Number(storageData._sum.size || 0),
        quotaUsed: Number(quotaData._sum.usedBytes || 0),
      },
      pendingApprovals,
      recentActivity,
    };
  }

  /**
   * Get metric history for chart data.
   */
  async getMetricHistory(metric: MetricName, dateRange: DateRange): Promise<MetricHistoryPoint[]> {
    const snapshots = await prisma.analyticsSnapshot.findMany({
      where: {
        metric,
        date: { gte: dateRange.from, lte: dateRange.to },
      },
      orderBy: { date: "asc" },
    });

    return snapshots.map((s) => ({
      date: s.date.toISOString().split("T")[0],
      value: this.extractMetricValue(s.value as Record<string, unknown>),
      metadata: (s.metadata as Record<string, unknown>) || undefined,
    }));
  }

  /**
   * Extract a numeric value from a metric snapshot.
   */
  private extractMetricValue(value: Record<string, unknown>): number {
    if (typeof value === "number") return value;
    if (value && typeof value === "object") {
      if ("totalAmount" in value) return Number(value.totalAmount || 0);
      if ("count" in value) return Number(value.count || 0);
      if ("totalFiles" in value) return Number(value.totalFiles || 0);
      if ("totalBytes" in value) return Number(value.totalBytes || 0);
    }
    return 0;
  }

  /**
   * Get real-time stats calculated from the live database.
   */
  async getRealtimeStats(): Promise<{
    totalDocuments: number;
    totalClients: number;
    totalProjects: number;
    pendingApprovals: number;
    totalRevenue: number;
    documentsThisMonth: number;
    storageFiles: number;
    storageBytes: number;
  }> {
    const [
      totalDocuments,
      totalClients,
      totalProjects,
      pendingApprovals,
      revenueAgg,
      thisMonthDocs,
      storageData,
    ] = await Promise.all([
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.approvalRequest.count({ where: { status: "PENDING" } }),
      prisma.document.aggregate({
        _sum: { totalAmount: true },
        where: { deletedAt: null },
      }),
      prisma.document.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.storageFile.aggregate({
        _sum: { size: true },
        _count: true,
      }),
    ]);

    return {
      totalDocuments,
      totalClients,
      totalProjects,
      pendingApprovals,
      totalRevenue: Number(revenueAgg._sum.totalAmount || 0),
      documentsThisMonth: thisMonthDocs,
      storageFiles: storageData._count,
      storageBytes: Number(storageData._sum.size || 0),
    };
  }

  /**
   * Get daily revenue breakdown for a date range.
   */
  async getDailyRevenue(dateRange: DateRange): Promise<Array<{ date: string; amount: number; count: number }>> {
    const results = await prisma.$queryRawUnsafe(`
      SELECT
        DATE("createdAt") as date,
        SUM("totalAmount")::float as amount,
        COUNT(*)::int as count
      FROM "Document"
      WHERE "createdAt" >= $1
        AND "createdAt" <= $2
        AND "deletedAt" IS NULL
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `, dateRange.from, dateRange.to) as Array<{ date: Date; amount: number; count: number }>;

    return results.map((r) => ({
      date: new Date(r.date).toISOString().split("T")[0],
      amount: Number(r.amount || 0),
      count: r.count,
    }));
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!_instance) {
    _instance = new AnalyticsService();
  }
  return _instance;
}

export const analyticsService = getAnalyticsService();
