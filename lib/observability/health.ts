import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/observability/logger";

const logger = createLogger("health");

// ─── Types ──────────────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ServiceHealthCheck {
  service: string;
  status: HealthStatus;
  latencyMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemHealthReport {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  services: ServiceHealthCheck[];
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
  };
}

// ─── Individual Checks ─────────────────────────────────────────────────────

async function checkDatabase(): Promise<ServiceHealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      service: "database",
      status: "healthy",
      latencyMs: Date.now() - start,
      metadata: { provider: "postgresql" },
    };
  } catch (error) {
    return {
      service: "database",
      status: "unhealthy",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

async function checkStorage(): Promise<ServiceHealthCheck> {
  const start = Date.now();
  try {
    const count = await prisma.storageFile.count({ take: 1 });
    return {
      service: "storage",
      status: "healthy",
      latencyMs: Date.now() - start,
      metadata: { filesIndexed: count },
    };
  } catch (error) {
    return {
      service: "storage",
      status: "degraded",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown storage error",
    };
  }
}

function checkMemory(): ServiceHealthCheck {
  const memUsage = process.memoryUsage();
  const rssMb = Math.round(memUsage.rss / 1048576);
  const heapUsedMb = Math.round(memUsage.heapUsed / 1048576);
  const heapTotalMb = Math.round(memUsage.heapTotal / 1048576);

  let status: HealthStatus = "healthy";
  if (heapUsedMb > 512) {
    status = "unhealthy";
  } else if (heapUsedMb > 256) {
    status = "degraded";
  }

  return {
    service: "memory",
    status,
    latencyMs: 0,
    metadata: {
      rssMb,
      heapUsedMb,
      heapTotalMb,
      externalMb: Math.round(memUsage.external / 1048576),
    },
  };
}

async function checkJobQueue(): Promise<ServiceHealthCheck> {
  const start = Date.now();
  try {
    const pending = await prisma.backgroundJob.count({ where: { status: "PENDING" } });
    const active = await prisma.backgroundJob.count({ where: { status: "ACTIVE" } });
    const deadLetter = await prisma.backgroundJob.count({ where: { status: "DEAD_LETTER" } });

    let status: HealthStatus = "healthy";
    if (deadLetter > 10) {
      status = "degraded";
    }
    if (pending > 100) {
      status = "degraded";
    }

    return {
      service: "job_queue",
      status,
      latencyMs: Date.now() - start,
      metadata: { pending, active, deadLetter },
    };
  } catch (error) {
    return {
      service: "job_queue",
      status: "unhealthy",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ─── Health Check Service ───────────────────────────────────────────────────

class HealthService {
  private startTime = Date.now();

  /**
   * Run all health checks and return a comprehensive report.
   */
  async getFullReport(): Promise<SystemHealthReport> {
    const [dbHealth, storageHealth, memoryHealth, jobQueueHealth] = await Promise.all([
      checkDatabase(),
      checkStorage(),
      Promise.resolve(checkMemory()),
      checkJobQueue(),
    ]);

    const services = [dbHealth, storageHealth, memoryHealth, jobQueueHealth];

    const hasUnhealthy = services.some((s) => s.status === "unhealthy");
    const hasDegraded = services.some((s) => s.status === "degraded");

    const overallStatus: HealthStatus = hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy";

    const memUsage = process.memoryUsage();

    const report: SystemHealthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services,
      memory: {
        rssMb: Math.round(memUsage.rss / 1048576),
        heapUsedMb: Math.round(memUsage.heapUsed / 1048576),
        heapTotalMb: Math.round(memUsage.heapTotal / 1048576),
        externalMb: Math.round(memUsage.external / 1048576),
      },
    };

    this.storeReport(report).catch(() => {});

    return report;
  }

  /**
   * Store health check results in the database.
   */
  private async storeReport(report: SystemHealthReport): Promise<void> {
    try {
      for (const service of report.services) {
        await prisma.healthCheck.create({
          data: {
            service: service.service,
            status: service.status,
            latencyMs: service.latencyMs,
            error: service.error || null,
            metadata: service.metadata ? JSON.parse(JSON.stringify(service.metadata)) : undefined,
          },
        });
      }
    } catch (error) {
      logger.error("Failed to store health check report", error);
    }
  }

  /**
   * Get a lightweight readiness check (for load balancers).
   */
  async getReadiness(): Promise<{ ready: boolean; reason?: string }> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch {
      return { ready: false, reason: "Database connection failed" };
    }
  }

  /**
   * Get a lightweight liveness check (for container orchestration).
   */
  getLiveness(): { alive: boolean; uptime: number } {
    return { alive: true, uptime: Math.floor((Date.now() - this.startTime) / 1000) };
  }

  /**
   * Get historical health check results for a service.
   */
  async getHistory(service: string, limit = 50): Promise<ServiceHealthCheck[]> {
    const records = await prisma.healthCheck.findMany({
      where: { service },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return records.map((r) => ({
      service: r.service,
      status: r.status as HealthStatus,
      latencyMs: r.latencyMs || 0,
      error: r.error || undefined,
      metadata: (r.metadata as Record<string, unknown>) || undefined,
    }));
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: HealthService | null = null;

export function getHealthService(): HealthService {
  if (!_instance) {
    _instance = new HealthService();
  }
  return _instance;
}

export const healthService = getHealthService();
