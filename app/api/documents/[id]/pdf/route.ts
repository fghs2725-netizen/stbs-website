import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { createDocumentRenderToken } from '@/lib/document-render-auth';
import { generateDocumentPdf } from '@/lib/document-pdf';

// Streams the current document as a PDF (regenerated on demand via the same
// pipeline as POST). Authenticated admins only.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const document = await prisma.document.findUnique({ where: { id }, select: { id: true } });
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const host = _req.headers.get('host') || 'localhost:3000';
    const proto = _req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    const pdfBytes = await generateDocumentPdf(id, origin);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Failed to stream document PDF:', error);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const document = await prisma.document.findUnique({
      where: { id },
      include: { items: true, sections: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const requestOrigin = req.headers.get('origin') || req.headers.get('host') || 'http://localhost:3000';
    const origin = requestOrigin.startsWith('http') ? requestOrigin : `http://${requestOrigin}`;

    const pdfBytes = await generateDocumentPdf(id, origin);

    const versionCount = await prisma.documentVersion.count({
      where: { documentId: id }
    });

    const pdfUrl = `/api/documents/${id}/pdf`;

    await prisma.documentVersion.create({
      data: {
        documentId: id,
        versionNumber: versionCount + 1,
        pdfUrl,
        createdBy: session.user?.id || null,
      }
    }).catch(console.error);

    await prisma.document.update({
      where: { id },
      data: { pdfUrl }
    });

    await prisma.auditLog.create({
      data: {
        action: 'PDF_GENERATED',
        entityType: 'DOCUMENT',
        entityId: id,
        description: `Generated PDF version ${versionCount + 1} for ${document.reference}`,
        userId: session.user?.id || null,
        documentId: id,
      }
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      pdfUrl,
      version: versionCount + 1
    });
  } catch (error) {
    console.error(`Failed to generate PDF:`, error);
    const message = error instanceof Error ? error.message : 'PDF generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
