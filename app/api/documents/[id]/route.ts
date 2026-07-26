import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    const admin = requireAdmin(session);
    if (!admin.ok) return admin.response;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        items: { orderBy: { position: 'asc' } },
        sections: { orderBy: { position: 'asc' } },
        versions: { orderBy: { versionNumber: 'desc' } }
      }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error(`Failed to fetch document:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    const admin = requireAdmin(session);
    if (!admin.ok) return admin.response;
    const { session: validSession } = admin;

    const body = await req.json();
    const { items, sections, ...rawFields } = body;

    // Explicit allowlist — only these fields can be updated via the API.
    const allowedFields: Record<string, unknown> = {};
    const mutableKeys = [
      "title", "status", "subject", "notes", "terms",
      "clientName", "clientEmail", "clientCompany",
      "totalAmount", "pdfUrl", "clientId",
    ] as const;

    for (const key of mutableKeys) {
      if (rawFields[key] !== undefined) {
        allowedFields[key] = rawFields[key];
      }
    }

    const updatedDocument = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.update({
        where: { id },
        data: allowedFields,
      });

      if (Array.isArray(items)) {
        await tx.documentItem.deleteMany({ where: { documentId: id } });
        if (items.length > 0) {
          await tx.documentItem.createMany({
            data: items.map((item: any, index: number) => ({
              documentId: id,
              position: item.position ?? index,
              itemCode: item.itemCode || null,
              description: item.description,
              unit: item.unit || null,
              quantity: item.quantity ?? 0,
              rate: item.rate ?? 0,
              amount: item.amount ?? 0,
              gstPercent: item.gstPercent ?? 18,
              gstAmount: item.gstAmount ?? 0,
              hsnCode: item.hsnCode || null,
              category: item.category || null,
              notes: item.notes || null,
            }))
          });
        }
      }

      if (Array.isArray(sections)) {
        await tx.documentSection.deleteMany({ where: { documentId: id } });
        if (sections.length > 0) {
          await tx.documentSection.createMany({
            data: sections.map((section: any, index: number) => ({
              documentId: id,
              type: section.type,
              position: section.position ?? index,
              title: section.title || null,
              content: section.content ?? {},
              visible: section.visible ?? true,
            }))
          });
        }
      }

      return tx.document.findUnique({
        where: { id },
        include: {
          items: { orderBy: { position: 'asc' } },
          sections: { orderBy: { position: 'asc' } },
          versions: { orderBy: { versionNumber: 'desc' } },
        }
      });
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATED',
        entityType: 'DOCUMENT',
        entityId: id,
        description: `Updated document ${updatedDocument?.reference}`,
        userId: validSession.user.id,
        documentId: id,
      }
    }).catch(console.error);

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error(`Failed to update document:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    const admin = requireAdmin(session);
    if (!admin.ok) return admin.response;
    const { session: validSession } = admin;

    const document = await prisma.document.update({
      where: { id },
      data: { status: 'CANCELLED', deletedAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        action: 'CANCELLED',
        entityType: 'DOCUMENT',
        entityId: id,
        description: `Cancelled document ${document.reference}`,
        userId: validSession.user.id,
        documentId: id,
      }
    }).catch(console.error);

    return NextResponse.json({ success: true, message: 'Document cancelled' });
  } catch (error) {
    console.error(`Failed to delete document:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
