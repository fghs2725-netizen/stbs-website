import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const APP_VERSION = process.env.npm_package_version || '1.0.0';
const startTime = Date.now();

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  error?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      service: 'database',
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkStorage(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const bucket = process.env.STORAGE_BUCKET;
    if (!bucket) {
      return {
        service: 'storage',
        status: 'degraded',
        latencyMs: Date.now() - start,
        error: 'Storage not configured',
      };
    }
    return {
      service: 'storage',
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      service: 'storage',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkJobQueue(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const stuckJobs = await prisma.backgroundJob.count({
      where: {
        status: 'ACTIVE',
        startedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
    });

    if (stuckJobs > 5) {
      return {
        service: 'job_queue',
        status: 'degraded',
        latencyMs: Date.now() - start,
        error: `${stuckJobs} stuck jobs detected`,
      };
    }

    return {
      service: 'job_queue',
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      service: 'job_queue',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkJobQueue(),
  ]);

  const overallStatus = checks.every(c => c.status === 'healthy')
    ? 'healthy'
    : checks.some(c => c.status === 'unhealthy')
      ? 'unhealthy'
      : 'degraded';

  await prisma.healthCheck.createMany({
    data: checks.map(c => ({
      service: c.service,
      status: c.status,
      latencyMs: c.latencyMs || null,
      error: c.error || null,
    })),
  }).catch(() => {});

  const response = NextResponse.json({
    status: overallStatus,
    checks,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  });

  if (overallStatus !== 'healthy') {
    response.headers.set('Cache-Control', 'no-store');
  } else {
    response.headers.set('Cache-Control', 'public, max-age=30');
  }

  return response;
}
