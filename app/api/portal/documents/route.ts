import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPortalToken } from '@/lib/portal-auth';
import { PORTAL_DOCUMENT_STATUSES } from '@/lib/portal-doc-auth';

async function getClientFromRequest(req: NextRequest) {
  const token = req.cookies.get('portal_token')?.value;
  return verifyPortalToken(token);
}

export async function GET(req: NextRequest) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: {
        clientId: client.clientId,
        deletedAt: null,
        status: { in: [...PORTAL_DOCUMENT_STATUSES] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        type: true,
        title: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        pdfUrl: true,
      },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Failed to fetch portal documents:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
