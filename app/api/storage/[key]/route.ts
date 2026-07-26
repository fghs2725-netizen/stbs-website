import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decodedKey = decodeURIComponent(key);

    const file = await prisma.storageFile.findUnique({
      where: { key: decodedKey },
    });

    if (!file || file.deletedAt) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const endpoint = process.env.STORAGE_ENDPOINT || `https://${file.bucket}.s3.${file.region || 'ap-south-1'}.amazonaws.com`;
    const expiresIn = 3600;
    const expiryDate = new Date(Date.now() + expiresIn * 1000);
    const dateStr = expiryDate.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const credentialScope = `${dateStr.slice(0, 8)}/${file.region || 'ap-south-1'}/s3/aws4_request`;

    const downloadUrl = `${endpoint}/${file.key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${process.env.STORAGE_ACCESS_KEY_ID || ''}/${credentialScope}&X-Amz-Date=${dateStr}&X-Amz-Expires=${expiresIn}&X-Amz-SignedHeaders=host&X-Amz-Signature=placeholder`;

    return NextResponse.json({
      downloadUrl,
      file: {
        id: file.id,
        key: file.key,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        createdAt: file.createdAt,
      },
      expiresAt: expiryDate.toISOString(),
    });
  } catch (error) {
    console.error('Failed to generate download URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decodedKey = decodeURIComponent(key);

    const file = await prisma.storageFile.findUnique({
      where: { key: decodedKey },
    });

    if (!file || file.deletedAt) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const updated = await prisma.storageFile.update({
      where: { key: decodedKey },
      data: { deletedAt: new Date() },
    });

    if (file.entityType && file.entityId) {
      const quota = await prisma.storageQuota.findFirst({
        where: { entityType: file.entityType, entityId: file.entityId },
      });

      if (quota) {
        await prisma.storageQuota.update({
          where: { id: quota.id },
          data: {
            usedBytes: { decrement: BigInt(file.size) },
            fileCount: { decrement: 1 },
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        action: 'DELETED',
        entityType: 'STORAGE_FILE',
        entityId: updated.id,
        description: `Deleted file ${file.originalName} (${file.key})`,
        userId: session.user?.id || null,
      },
    }).catch(console.error);

    return NextResponse.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Failed to delete file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
