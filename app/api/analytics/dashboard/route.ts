import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const fromDate = dateFrom ? new Date(dateFrom) : new Date(new Date().setDate(new Date().getDate() - 30));
    const toDate = dateTo ? new Date(dateTo) : new Date();

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const [
      documentsGenerated,
      totalRevenue,
      approvalRecords,
      topClients,
      storageUsage,
      recentDocuments,
      jobsByStatus,
    ] = await Promise.all([
      prisma.document.groupBy({
        by: ['type'],
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          deletedAt: null,
        },
        _count: { id: true },
      }),

      prisma.document.aggregate({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          deletedAt: null,
          status: { in: ['APPROVED', 'FINALIZED', 'COMPLETED', 'ISSUED'] },
        },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
        _count: { id: true },
      }),

      prisma.approvalRequest.findMany({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          status: { in: ['APPROVED', 'REJECTED'] },
          decidedAt: { not: null },
        },
        select: {
          createdAt: true,
          decidedAt: true,
        },
      }),

      prisma.document.groupBy({
        by: ['clientCompany'],
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          deletedAt: null,
          clientCompany: { not: null },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      prisma.storageFile.aggregate({
        where: { deletedAt: null },
        _sum: { size: true },
        _count: { id: true },
      }),

      prisma.document.findMany({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          reference: true,
          type: true,
          title: true,
          status: true,
          clientCompany: true,
          totalAmount: true,
          createdAt: true,
        },
      }),

      prisma.backgroundJob.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: fromDate, lte: toDate },
        },
        _count: { id: true },
      }),
    ]);

    const avgApprovalTime = (() => {
      if (approvalRecords.length === 0) return null;
      let totalMs = 0;
      let count = 0;
      for (const record of approvalRecords) {
        if (record.decidedAt) {
          totalMs += record.decidedAt.getTime() - record.createdAt.getTime();
          count++;
        }
      }
      if (count === 0) return null;
      return Math.round(totalMs / count / (1000 * 60 * 60 * 24));
    })();

    const revenueData = totalRevenue._sum.totalAmount
      ? Number(totalRevenue._sum.totalAmount)
      : 0;

    const jobStats: Record<string, number> = {};
    for (const row of jobsByStatus) {
      jobStats[row.status] = row._count.id;
    }

    return NextResponse.json({
      dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
      revenue: {
        total: revenueData,
        average: totalRevenue._avg.totalAmount ? Number(totalRevenue._avg.totalAmount) : 0,
        count: totalRevenue._count.id,
      },
      approvalTime: {
        averageDays: avgApprovalTime,
      },
      documentsGenerated: {
        total: documentsGenerated.reduce((sum, d) => sum + d._count.id, 0),
        byType: documentsGenerated.map(d => ({ type: d.type, count: d._count.id })),
      },
      topClients: topClients.map(c => ({
        company: c.clientCompany,
        documentCount: c._count.id,
        totalValue: c._sum.totalAmount ? Number(c._sum.totalAmount) : 0,
      })),
      storageUsage: {
        totalBytes: storageUsage._sum.size ? Number(storageUsage._sum.size) : 0,
        fileCount: storageUsage._count.id,
      },
      recentDocuments,
      jobs: jobStats,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard analytics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
