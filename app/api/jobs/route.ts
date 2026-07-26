import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const MAX_LIMIT = 100;

const VALID_JOB_STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'DELAYED', 'DEAD_LETTER'] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const queue = searchParams.get('queue');
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status && VALID_JOB_STATUSES.includes(status as any)) where.status = status;
    if (queue && typeof queue === 'string') where.queue = queue;

    const [jobs, total] = await Promise.all([
      prisma.backgroundJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.backgroundJob.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to list jobs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { queue, type, payload, priority, maxAttempts } = body;

    if (!queue || typeof queue !== 'string' || queue.length === 0) {
      return NextResponse.json({ error: 'Queue name is required' }, { status: 400 });
    }

    if (!type || typeof type !== 'string' || type.length === 0) {
      return NextResponse.json({ error: 'Job type is required' }, { status: 400 });
    }

    if (priority !== undefined && (typeof priority !== 'number' || priority < 0 || priority > 100)) {
      return NextResponse.json({ error: 'Priority must be between 0 and 100' }, { status: 400 });
    }

    if (maxAttempts !== undefined && (typeof maxAttempts !== 'number' || maxAttempts < 1 || maxAttempts > 10)) {
      return NextResponse.json({ error: 'Max attempts must be between 1 and 10' }, { status: 400 });
    }

    const job = await prisma.backgroundJob.create({
      data: {
        queue,
        type,
        payload: payload || null,
        priority: priority ?? 0,
        maxAttempts: maxAttempts ?? 3,
        status: 'PENDING',
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('Failed to create job:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
