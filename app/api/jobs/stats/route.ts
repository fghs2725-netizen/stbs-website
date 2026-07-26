import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const statusCounts = await prisma.backgroundJob.groupBy({
      by: ['queue', 'status'],
      _count: { id: true },
    });

    const queues: Record<string, Record<string, number>> = {};
    let totalPending = 0;
    let totalActive = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    for (const row of statusCounts) {
      if (!queues[row.queue]) {
        queues[row.queue] = { PENDING: 0, ACTIVE: 0, COMPLETED: 0, FAILED: 0, DELAYED: 0, DEAD_LETTER: 0 };
      }
      queues[row.queue][row.status] = row._count.id;

      switch (row.status) {
        case 'PENDING': totalPending += row._count.id; break;
        case 'ACTIVE': totalActive += row._count.id; break;
        case 'COMPLETED': totalCompleted += row._count.id; break;
        case 'FAILED':
        case 'DEAD_LETTER': totalFailed += row._count.id; break;
      }
    }

    const oldestPending = await prisma.backgroundJob.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const recentFailures = await prisma.backgroundJob.findMany({
      where: { status: { in: ['FAILED', 'DEAD_LETTER'] } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        queue: true,
        type: true,
        error: true,
        attempts: true,
        maxAttempts: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      totals: {
        pending: totalPending,
        active: totalActive,
        completed: totalCompleted,
        failed: totalFailed,
      },
      queues,
      oldestPendingJobAt: oldestPending?.createdAt || null,
      recentFailures,
    });
  } catch (error) {
    console.error('Failed to fetch job stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
