import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { requireAdmin } from '@/lib/auth-helpers';

const MAX_SEARCH_LENGTH = 200;
const MAX_LIMIT = 100;

const VALID_DOCUMENT_TYPES = [
  'QUOTATION', 'TAX_INVOICE', 'PROFORMA_INVOICE', 'PURCHASE_ORDER',
  'WORK_ORDER', 'SITE_VISIT_REPORT', 'BOREWELL_COMPLETION_REPORT',
  'RWH_REPORT', 'HYDROGEO_SURVEY', 'TECHNICAL_PROPOSAL',
  'COMMERCIAL_PROPOSAL', 'PROJECT_ESTIMATE', 'COST_BREAKDOWN',
  'COMPLETION_CERTIFICATE', 'PAYMENT_RECEIPT', 'DELIVERY_CHALLAN',
  'WARRANTY_CERTIFICATE', 'AMC_AGREEMENT', 'SERVICE_REPORT',
  'INTERNAL_DOCUMENT',
] as const;

const VALID_STATUSES = [
  'DRAFT', 'PENDING_REVIEW', 'UNDER_REVIEW', 'REVISION', 'APPROVED',
  'REJECTED', 'EXPIRED', 'CANCELLED', 'FINALIZED', 'ISSUED',
  'VIEWED', 'ACCEPTED', 'COMPLETED', 'ARCHIVED',
] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const admin = requireAdmin(session);
    if (!admin.ok) return admin.response;
    const { session: validSession } = admin;

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const q = searchParams.get('q');
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), MAX_LIMIT);

    const where: Record<string, unknown> = { deletedAt: null };
    if (type && VALID_DOCUMENT_TYPES.includes(type as any)) where.type = type;
    if (status && VALID_STATUSES.includes(status as any)) where.status = status;
    if (q && q.length <= MAX_SEARCH_LENGTH) {
      where.OR = [
        { reference: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } },
        { clientCompany: { contains: q, mode: 'insensitive' } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { items: true, sections: true, versions: true }
        }
      }
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const admin = requireAdmin(session);
    if (!admin.ok) return admin.response;
    const { session: validSession } = admin;

    const body = await req.json();
    const { type, title, clientId } = body;

    if (!type || !VALID_DOCUMENT_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Valid document type is required' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const prefix = type.substring(0, 3).toUpperCase();

    const counter = await prisma.$transaction(async (tx) => {
      const updated = await tx.documentReferenceCounter.upsert({
        where: { year },
        update: { lastNumber: { increment: 1 } },
        create: { year, lastNumber: 1 },
      });
      return updated.lastNumber;
    });

    const reference = `STBS-${prefix}-${year}-${String(counter).padStart(4, '0')}`;

    const document = await prisma.document.create({
      data: {
        reference,
        type,
        title: title || `New ${type}`,
        status: 'DRAFT',
        clientId: clientId || null,
        createdById: validSession.user.id,
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATED',
        entityType: 'DOCUMENT',
        entityId: document.id,
        description: `Created new ${type} document ${reference}`,
        userId: validSession.user.id,
        documentId: document.id,
      }
    }).catch(e => console.error('Failed to log audit:', e));

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Failed to create document:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
