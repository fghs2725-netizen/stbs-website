import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const VALID_METRICS = [
  'documents_created',
  'documents_by_type',
  'revenue',
  'approval_time',
  'storage_usage',
  'job_throughput',
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ metric: string }> }
) {
  try {
    const { metric } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!VALID_METRICS.includes(metric as any)) {
      return NextResponse.json({
        error: `Invalid metric. Valid metrics: ${VALID_METRICS.join(', ')}`,
      }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const granularity = searchParams.get('granularity') || 'daily';

    const fromDate = dateFrom ? new Date(dateFrom) : new Date(new Date().setDate(new Date().getDate() - 30));
    const toDate = dateTo ? new Date(dateTo) : new Date();

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const snapshots = await prisma.analyticsSnapshot.findMany({
      where: {
        metric,
        date: { gte: fromDate, lte: toDate },
      },
      orderBy: { date: 'asc' },
    });

    let timeSeries: Array<{ date: string; value: unknown }> = [];

    switch (metric) {
      case 'documents_created': {
        const docs = await prisma.document.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: { gte: fromDate, lte: toDate },
            deletedAt: null,
          },
          _count: { id: true },
          orderBy: { createdAt: 'asc' },
        });

        timeSeries = docs.map(d => ({
          date: d.createdAt.toISOString().split('T')[0],
          value: d._count.id,
        }));
        break;
      }

      case 'documents_by_type': {
        const docs = await prisma.document.groupBy({
          by: ['type', 'createdAt'],
          where: {
            createdAt: { gte: fromDate, lte: toDate },
            deletedAt: null,
          },
          _count: { id: true },
          orderBy: { createdAt: 'asc' },
        });

        timeSeries = docs.map(d => ({
          date: d.createdAt.toISOString().split('T')[0],
          value: { type: d.type, count: d._count.id },
        }));
        break;
      }

      case 'revenue': {
        const invoices = await prisma.document.findMany({
          where: {
            createdAt: { gte: fromDate, lte: toDate },
            deletedAt: null,
            status: { in: ['APPROVED', 'FINALIZED', 'COMPLETED', 'ISSUED'] },
          },
          select: { totalAmount: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        });

        const dailyRevenue: Record<string, number> = {};
        for (const inv of invoices) {
          const day = inv.createdAt.toISOString().split('T')[0];
          dailyRevenue[day] = (dailyRevenue[day] || 0) + Number(inv.totalAmount);
        }

        timeSeries = Object.entries(dailyRevenue).map(([date, value]) => ({
          date,
          value,
        }));
        break;
      }

      case 'approval_time': {
        const approvals = await prisma.approvalRequest.findMany({
          where: {
            createdAt: { gte: fromDate, lte: toDate },
            decidedAt: { not: null },
          },
          select: { createdAt: true, decidedAt: true },
          orderBy: { createdAt: 'asc' },
        });

        const dailyAvg: Record<string, number[]> = {};
        for (const a of approvals) {
          if (a.decidedAt) {
            const day = a.createdAt.toISOString().split('T')[0];
            const hours = (a.decidedAt.getTime() - a.createdAt.getTime()) / (1000 * 60 * 60);
            if (!dailyAvg[day]) dailyAvg[day] = [];
            dailyAvg[day].push(hours);
          }
        }

        timeSeries = Object.entries(dailyAvg).map(([date, hours]) => ({
          date,
          value: Math.round(hours.reduce((a, b) => a + b, 0) / hours.length * 10) / 10,
        }));
        break;
      }

      case 'storage_usage': {
        const files = await prisma.storageFile.findMany({
          where: {
            createdAt: { gte: fromDate, lte: toDate },
            deletedAt: null,
          },
          select: { size: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        });

        let cumulative = 0;
        const dailyUsage: Record<string, number> = {};
        for (const f of files) {
          const day = f.createdAt.toISOString().split('T')[0];
          dailyUsage[day] = (dailyUsage[day] || 0) + f.size;
        }

        timeSeries = Object.entries(dailyUsage).map(([date, added]) => {
          cumulative += added;
          return { date, value: cumulative };
        });
        break;
      }

      case 'job_throughput': {
        const jobs = await prisma.backgroundJob.groupBy({
          by: ['status', 'createdAt'],
          where: {
            createdAt: { gte: fromDate, lte: toDate },
          },
          _count: { id: true },
          orderBy: { createdAt: 'asc' },
        });

        timeSeries = jobs.map(j => ({
          date: j.createdAt.toISOString().split('T')[0],
          value: { status: j.status, count: j._count.id },
        }));
        break;
      }
    }

    return NextResponse.json({
      metric,
      dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
      granularity,
      timeSeries,
      snapshots: snapshots.map(s => ({
        date: s.date,
        value: s.value,
      })),
    });
  } catch (error) {
    console.error(`Failed to fetch metric:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
