import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPortalToken } from '@/lib/portal-auth';
import { generateDocumentPdf } from '@/lib/document-pdf';
import { PORTAL_DOCUMENT_STATUSES } from '@/lib/portal-doc-auth';

// Streams the current document as a PDF for authenticated portal clients.
// Ownership (clientId) and client-visible status are enforced before
// rendering; generation reuses the same pipeline as the admin route.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await verifyPortalToken(req.cookies.get('portal_token')?.value);
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        clientId: client.clientId,
        deletedAt: null,
        status: { in: [...PORTAL_DOCUMENT_STATUSES] },
      },
      select: { id: true, reference: true },
    });
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    const pdfBytes = await generateDocumentPdf(id, origin);

    const filename = `${document.reference.replace(/\//g, '-')}.pdf`;
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Failed to stream portal document PDF:', error);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
