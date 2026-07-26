import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { createDocumentRenderToken } from '@/lib/document-render-auth';
import { generateDocumentPdf } from '@/lib/document-pdf';

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

    const pdfUrl = `/api/documents/${id}/pdf/download`;

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
