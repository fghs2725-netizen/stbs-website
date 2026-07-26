import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 500;

const VALID_ENTITY_TYPES = ['DOCUMENT', 'CLIENT', 'PROJECT', 'QUOTATION'] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q');
    const type = searchParams.get('type');
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), MAX_LIMIT);
    const skip = (page - 1) * limit;

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    if (q.length > MAX_SEARCH_LENGTH) {
      return NextResponse.json({ error: 'Search query is too long' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ],
    };

    if (type && VALID_ENTITY_TYPES.includes(type as any)) {
      where.entityType = type;
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (!isNaN(fromDate.getTime())) {
        where.createdAt = { ...(where.createdAt as object || {}), gte: fromDate };
      }
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      if (!isNaN(toDate.getTime())) {
        where.createdAt = { ...(where.createdAt as object || {}), lte: toDate };
      }
    }

    const [results, total] = await Promise.all([
      prisma.searchIndex.findMany({
        where,
        orderBy: { rank: 'desc' },
        skip,
        take: limit,
      }),
      prisma.searchIndex.count({ where }),
    ]);

    return NextResponse.json({
      results,
      query: q,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to search:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
