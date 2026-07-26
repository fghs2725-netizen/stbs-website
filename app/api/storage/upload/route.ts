import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { createHash } from 'crypto';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/zip',
  'text/plain',
];

function generateFileKey(originalName: string, mimeType: string): string {
  const timestamp = Date.now();
  const randomBytes = createHash('sha256').update(`${timestamp}-${originalName}`).digest('hex').slice(0, 16);
  const extension = originalName.split('.').pop() || 'bin';
  return `uploads/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${randomBytes}.${extension}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fileName, mimeType, fileSize, entityType, entityId } = body;

    if (!fileName || typeof fileName !== 'string' || fileName.length === 0) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    if (fileName.length > 255) {
      return NextResponse.json({ error: 'File name is too long' }, { status: 400 });
    }

    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    if (!fileSize || typeof fileSize !== 'number' || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File size must be between 1 byte and ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, { status: 400 });
    }

    if (entityType && typeof entityType !== 'string') {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    if (entityId && typeof entityId !== 'string') {
      return NextResponse.json({ error: 'Invalid entity ID' }, { status: 400 });
    }

    const bucket = process.env.STORAGE_BUCKET || 'stbs-documents';
    const region = process.env.STORAGE_REGION || 'ap-south-1';

    if (entityType && entityId) {
      const existingQuota = await prisma.storageQuota.findFirst({
        where: { entityType, entityId },
      });

      const quota = existingQuota || await prisma.storageQuota.create({
        data: { entityType, entityId, maxBytes: BigInt(10 * 1024 * 1024 * 1024) },
      });

      if (quota.usedBytes + BigInt(fileSize) > quota.maxBytes) {
        return NextResponse.json({ error: 'Storage quota exceeded for this entity' }, { status: 400 });
      }
    }

    const key = generateFileKey(fileName, mimeType);
    const endpoint = process.env.STORAGE_ENDPOINT || `https://${bucket}.s3.${region}.amazonaws.com`;
    const expiresIn = 600;

    const expiryDate = new Date(Date.now() + expiresIn * 1000);
    const dateStr = expiryDate.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const credentialScope = `${dateStr.slice(0, 8)}/${region}/s3/aws4_request`;

    const uploadUrl = `${endpoint}/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${process.env.STORAGE_ACCESS_KEY_ID || ''}/${credentialScope}&X-Amz-Date=${dateStr}&X-Amz-Expires=${expiresIn}&X-Amz-SignedHeaders=host&X-Amz-Signature=placeholder`;

    const storageFile = await prisma.storageFile.create({
      data: {
        key,
        originalName: fileName,
        mimeType,
        size: fileSize,
        bucket,
        region,
        entityType: entityType || null,
        entityId: entityId || null,
        uploadedById: session.user?.id || null,
        metadata: {
          uploadUrlExpiry: expiryDate.toISOString(),
          pendingUpload: true,
        },
      },
    });

    return NextResponse.json({
      uploadUrl,
      fileKey: key,
      fileId: storageFile.id,
      expiresAt: expiryDate.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to generate upload URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
