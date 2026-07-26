import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const job = await prisma.backgroundJob.create({
      data: {
        queue: 'search',
        type: 'REINDEX_ALL',
        payload: {
          requestedBy: session.user?.id || null,
          requestedAt: new Date().toISOString(),
        },
        status: 'PENDING',
        priority: 5,
      },
    });

    const counts = await prisma.$transaction(async (tx) => {
      const documentCount = await tx.document.count({ where: { deletedAt: null } });
      const clientCount = await tx.client.count({ where: { deletedAt: null } });
      const projectCount = await tx.project.count({ where: { deletedAt: null } });
      const quotationCount = await tx.quotation.count({ where: { deletedAt: null } });

      return { documentCount, clientCount, projectCount, quotationCount };
    });

    const totalEntities = counts.documentCount + counts.clientCount + counts.projectCount + counts.quotationCount;

    await prisma.auditLog.create({
      data: {
        action: 'REINDEX_TRIGGERED',
        entityType: 'SEARCH_INDEX',
        entityId: job.id,
        description: `Reindex triggered for ${totalEntities} entities (docs: ${counts.documentCount}, clients: ${counts.clientCount}, projects: ${counts.projectCount}, quotations: ${counts.quotationCount})`,
        userId: session.user?.id || null,
        metadata: counts,
      },
    }).catch(console.error);

    return NextResponse.json({
      jobId: job.id,
      status: 'PENDING',
      estimatedEntities: totalEntities,
      breakdown: counts,
    }, { status: 202 });
  } catch (error) {
    console.error('Failed to trigger reindex:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
