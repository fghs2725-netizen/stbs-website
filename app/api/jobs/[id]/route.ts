import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const job = await prisma.backgroundJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const progress = (() => {
      switch (job.status) {
        case 'PENDING': return 0;
        case 'ACTIVE': return job.attempts > 0 ? Math.min(90, (job.attempts / job.maxAttempts) * 90) : 10;
        case 'COMPLETED': return 100;
        case 'FAILED': return -1;
        case 'DELAYED': return 0;
        case 'DEAD_LETTER': return -1;
        default: return 0;
      }
    })();

    return NextResponse.json({
      ...job,
      progress,
    });
  } catch (error) {
    console.error('Failed to fetch job:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const job = await prisma.backgroundJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Cannot cancel a completed job' }, { status: 400 });
    }

    if (job.status === 'FAILED' || job.status === 'DEAD_LETTER') {
      return NextResponse.json({ error: 'Job is already in a terminal state' }, { status: 400 });
    }

    const updated = await prisma.backgroundJob.update({
      where: { id },
      data: {
        status: 'FAILED',
        error: `Cancelled by ${session.user?.id || 'admin'}`,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, job: updated });
  } catch (error) {
    console.error('Failed to cancel job:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
