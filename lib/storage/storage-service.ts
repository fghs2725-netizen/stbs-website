import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { join, extname } from "path";
import { mkdir, writeFile, unlink, readdir, stat, access } from "fs/promises";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StorageUploadResult {
  success: boolean;
  fileId?: string;
  key?: string;
  url?: string;
  size?: number;
  mimeType?: string;
  error?: string;
}

export interface SignedUploadUrl {
  success: boolean;
  uploadUrl?: string;
  key?: string;
  fields?: Record<string, string>;
  expiresAt?: Date;
  error?: string;
}

export interface SignedDownloadUrl {
  success: boolean;
  downloadUrl?: string;
  expiresAt?: Date;
  error?: string;
}

export interface FileMetadata {
  id: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  bucket: string;
  region?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListFilesOptions {
  prefix: string;
  limit?: number;
  offset?: number;
}

export interface StorageQuotaInfo {
  entityType: string;
  entityId: string;
  maxBytes: bigint;
  usedBytes: bigint;
  fileCount: number;
  remainingBytes: bigint;
  usagePercent: number;
}

// ─── Allowed MIME types ─────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/zip",
]);

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/json": ".json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/msword": ".doc",
  "application/vnd.ms-excel": ".xls",
  "application/zip": ".zip",
};

// ─── Environment config ─────────────────────────────────────────────────────

function getStorageConfig() {
  return {
    provider: (process.env.STORAGE_PROVIDER as "local" | "s3" | "r2") || "local",
    bucket: process.env.STORAGE_BUCKET || "stbs-storage",
    region: process.env.STORAGE_REGION || "us-east-1",
    accessKey: process.env.STORAGE_ACCESS_KEY || "",
    secretKey: process.env.STORAGE_SECRET_KEY || "",
    endpoint: process.env.STORAGE_ENDPOINT,
    publicUrl: process.env.STORAGE_PUBLIC_URL,
    maxFileSize: parseInt(process.env.STORAGE_MAX_FILE_SIZE || "52428800", 10), // 50MB
  };
}

// ─── Storage Provider Interface ─────────────────────────────────────────────

export interface StorageProvider {
  upload(key: string, buffer: Buffer, mimeType: string, metadata?: Record<string, string>): Promise<{ etag?: string; versionId?: string }>;
  delete(key: string): Promise<void>;
  list(prefix: string, limit?: number): Promise<{ key: string; size: number; lastModified: Date }[]>;
  getSignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<{ url: string; fields?: Record<string, string>; expiresAt: Date }>;
  getSignedDownloadUrl(key: string, expiresIn?: number): Promise<{ url: string; expiresAt: Date }>;
  getMetadata(key: string): Promise<{ size: number; contentType: string; etag?: string } | null>;
  getPublicUrl(key: string): string;
}

// ─── Local Filesystem Provider ──────────────────────────────────────────────

const LOCAL_STORAGE_ROOT = join(process.cwd(), ".storage");

class LocalStorageProvider implements StorageProvider {
  private bucketDir: string;

  constructor(bucket: string) {
    this.bucketDir = join(LOCAL_STORAGE_ROOT, bucket);
  }

  private async ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
  }

  private getFilePath(key: string): string {
    return join(this.bucketDir, key);
  }

  async upload(key: string, buffer: Buffer, _mimeType: string, _metadata?: Record<string, string>): Promise<{ etag?: string }> {
    const filePath = this.getFilePath(key);
    await this.ensureDir(join(filePath, ".."));
    await writeFile(filePath, buffer);
    return { etag: randomUUID() };
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async list(prefix: string, limit = 1000): Promise<{ key: string; size: number; lastModified: Date }[]> {
    const dirPath = this.getFilePath(prefix);
    const results: { key: string; size: number; lastModified: Date }[] = [];

    try {
      await access(dirPath);
    } catch {
      return results;
    }

    const entries = await readdir(dirPath, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fullPath = join(dirPath, entry.name);
      const relativeKey = join(prefix, entry.name).replace(/\\/g, "/");
      const fileStat = await stat(fullPath);
      results.push({ key: relativeKey, size: fileStat.size, lastModified: fileStat.mtime });
      if (results.length >= limit) break;
    }

    return results;
  }

  async getSignedUploadUrl(key: string, _contentType: string, expiresIn = 3600): Promise<{ url: string; expiresAt: Date }> {
    const filePath = this.getFilePath(key);
    await this.ensureDir(join(filePath, ".."));
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const uploadUrl = `file://local/upload?key=${encodeURIComponent(key)}&expires=${expiresAt.getTime()}`;
    return { url: uploadUrl, expiresAt };
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<{ url: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const downloadUrl = `file://local/download?key=${encodeURIComponent(key)}&expires=${expiresAt.getTime()}`;
    return { url: downloadUrl, expiresAt };
  }

  async getMetadata(key: string): Promise<{ size: number; contentType: string; etag?: string } | null> {
    const filePath = this.getFilePath(key);
    try {
      const fileStat = await stat(filePath);
      return { size: fileStat.size, contentType: "application/octet-stream", etag: undefined };
    } catch {
      return null;
    }
  }

  getPublicUrl(key: string): string {
    return `/api/storage/local/${encodeURIComponent(key)}`;
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

function createProvider(config: ReturnType<typeof getStorageConfig>): StorageProvider {
  switch (config.provider) {
    case "s3":
    case "r2":
      throw new Error(`S3/R2 provider not implemented. Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner to enable.`);
    case "local":
    default:
      return new LocalStorageProvider(config.bucket);
  }
}

// ─── Key Generation ─────────────────────────────────────────────────────────

function generateKey(entityType: string, entityId: string, originalName: string): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const ext = extname(originalName).toLowerCase() || ".bin";
  const uuid = randomUUID();
  return `${entityType}/${entityId}/${year}/${month}/${uuid}${ext}`;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateFile(mimeType: string, size: number, maxFileSize: number): string | null {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return `File type "${mimeType}" is not allowed. Allowed types: ${Array.from(ALLOWED_MIME_TYPES).join(", ")}`;
  }
  if (size <= 0) {
    return "File is empty";
  }
  if (size > maxFileSize) {
    const maxMB = (maxFileSize / 1048576).toFixed(0);
    const sizeMB = (size / 1048576).toFixed(1);
    return `File size ${sizeMB}MB exceeds maximum allowed size of ${maxMB}MB`;
  }
  return null;
}

// ─── Main Storage Service ───────────────────────────────────────────────────

class StorageService {
  private config = getStorageConfig();
  private provider: StorageProvider;

  constructor() {
    this.provider = createProvider(this.config);
  }

  /**
   * Upload a file with full validation, metadata tracking, and quota enforcement.
   */
  async upload(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    entityType: string;
    entityId: string;
    uploadedById?: string;
    metadata?: Record<string, unknown>;
  }): Promise<StorageUploadResult> {
    try {
      const validationError = validateFile(params.mimeType, params.buffer.length, this.config.maxFileSize);
      if (validationError) {
        return { success: false, error: validationError };
      }

      const key = generateKey(params.entityType, params.entityId, params.originalName);
      const { etag } = await this.provider.upload(key, params.buffer, params.mimeType);

      const dbFile = await prisma.storageFile.create({
        data: {
          key,
          originalName: params.originalName,
          mimeType: params.mimeType,
          size: params.buffer.length,
          bucket: this.config.bucket,
          region: this.config.region,
          etag: etag || null,
          entityType: params.entityType,
          entityId: params.entityId,
          uploadedById: params.uploadedById || null,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        },
      });

      await this.updateQuota(params.entityType, params.entityId, params.buffer.length, 1);

      return {
        success: true,
        fileId: dbFile.id,
        key: dbFile.key,
        url: this.provider.getPublicUrl(key),
        size: dbFile.size,
        mimeType: dbFile.mimeType,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown storage error";
      console.error("[StorageService] Upload failed:", message);
      return { success: false, error: message };
    }
  }

  /**
   * Generate a presigned upload URL for client-side uploads.
   */
  async generateUploadUrl(params: {
    originalName: string;
    mimeType: string;
    entityType: string;
    entityId: string;
    uploadedById?: string;
    expiresIn?: number;
  }): Promise<SignedUploadUrl> {
    try {
      const validationError = validateFile(params.mimeType, 0, this.config.maxFileSize);
      if (validationError) {
        return { success: false, error: validationError };
      }

      const key = generateKey(params.entityType, params.entityId, params.originalName);
      const { url, fields, expiresAt } = await this.provider.getSignedUploadUrl(key, params.mimeType, params.expiresIn);

      await prisma.storageFile.create({
        data: {
          key,
          originalName: params.originalName,
          mimeType: params.mimeType,
          size: 0,
          bucket: this.config.bucket,
          region: this.config.region,
          entityType: params.entityType,
          entityId: params.entityId,
          uploadedById: params.uploadedById || null,
        },
      });

      return { success: true, uploadUrl: url, key, fields, expiresAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error generating upload URL";
      return { success: false, error: message };
    }
  }

  /**
   * Generate a presigned download URL for file access.
   */
  async generateDownloadUrl(fileId: string, expiresIn = 3600): Promise<SignedDownloadUrl> {
    try {
      const file = await prisma.storageFile.findUnique({ where: { id: fileId } });
      if (!file) {
        return { success: false, error: "File not found" };
      }

      const { url, expiresAt } = await this.provider.getSignedDownloadUrl(file.key, expiresIn);
      return { success: true, downloadUrl: url, expiresAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error generating download URL";
      return { success: false, error: message };
    }
  }

  /**
   * Delete a file from storage and remove its database record.
   */
  async delete(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const file = await prisma.storageFile.findUnique({ where: { id: fileId } });
      if (!file) {
        return { success: false, error: "File not found" };
      }

      await this.provider.delete(file.key);

      await prisma.storageFile.delete({ where: { id: fileId } });

      await this.updateQuota(file.entityType || "unknown", file.entityId || "unknown", -file.size, -1);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error deleting file";
      return { success: false, error: message };
    }
  }

  /**
   * List files by prefix path.
   */
  async listFiles(options: ListFilesOptions): Promise<{ success: boolean; files: FileMetadata[]; total: number; error?: string }> {
    try {
      const dbFiles = await prisma.storageFile.findMany({
        where: { key: { startsWith: options.prefix } },
        orderBy: { createdAt: "desc" },
        take: options.limit || 100,
        skip: options.offset || 0,
      });

      const total = await prisma.storageFile.count({
        where: { key: { startsWith: options.prefix } },
      });

      const files: FileMetadata[] = dbFiles.map((f) => ({
        id: f.id,
        key: f.key,
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        bucket: f.bucket,
        region: f.region || undefined,
        entityType: f.entityType || undefined,
        entityId: f.entityId || undefined,
        metadata: (f.metadata as Record<string, unknown>) || undefined,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      }));

      return { success: true, files, total };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error listing files";
      return { success: false, files: [], total: 0, error: message };
    }
  }

  /**
   * Get file metadata from the database.
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    const file = await prisma.storageFile.findUnique({ where: { id: fileId } });
    if (!file) return null;

    return {
      id: file.id,
      key: file.key,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      bucket: file.bucket,
      region: file.region || undefined,
      entityType: file.entityType || undefined,
      entityId: file.entityId || undefined,
      metadata: (file.metadata as Record<string, unknown>) || undefined,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  /**
   * Get storage quota for an entity.
   */
  async getQuota(entityType: string, entityId: string): Promise<StorageQuotaInfo> {
    const quota = await prisma.storageQuota.findFirst({
      where: { entityType, entityId },
    });

    const maxBytes = quota?.maxBytes ?? BigInt(10737418240);
    const usedBytes = quota?.usedBytes ?? BigInt(0);
    const fileCount = quota?.fileCount ?? 0;
    const remainingBytes = maxBytes - usedBytes;
    const usagePercent = maxBytes > 0 ? Number((usedBytes * BigInt(100)) / maxBytes) : 0;

    return { entityType, entityId, maxBytes, usedBytes, fileCount, remainingBytes, usagePercent };
  }

  /**
   * Update storage quota for an entity.
   */
  private async updateQuota(entityType: string, entityId: string, sizeDelta: number, countDelta: number): Promise<void> {
    try {
      const existing = await prisma.storageQuota.findFirst({
        where: { entityType, entityId },
      });

      if (existing) {
        await prisma.storageQuota.update({
          where: { id: existing.id },
          data: {
            usedBytes: { increment: BigInt(sizeDelta) },
            fileCount: { increment: countDelta },
          },
        });
      } else {
        await prisma.storageQuota.create({
          data: {
            entityType,
            entityId,
            usedBytes: BigInt(Math.max(0, sizeDelta)),
            fileCount: Math.max(0, countDelta),
          },
        });
      }
    } catch (error) {
      console.error("[StorageService] Failed to update quota:", error);
    }
  }

  /**
   * Find and clean up orphaned files (files in storage with no matching DB record, or DB records with no actual file).
   */
  async cleanupOrphanedFiles(): Promise<{ success: boolean; removed: number; errors: string[] }> {
    const errors: string[] = [];
    let removed = 0;

    try {
      const staleFiles = await prisma.storageFile.findMany({
        where: {
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          entityType: null,
          entityId: null,
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      for (const file of staleFiles) {
        try {
          await this.provider.delete(file.key);
          await prisma.storageFile.delete({ where: { id: file.id } });
          removed++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          errors.push(`Failed to delete orphan ${file.key}: ${msg}`);
        }
      }

      return { success: true, removed, errors };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error during cleanup";
      return { success: false, removed, errors: [...errors, message] };
    }
  }

  /**
   * Generate a CDN-ready public URL for a file.
   */
  getPublicUrl(fileId: string): string | null {
    if (this.config.publicUrl) {
      return `${this.config.publicUrl}/${fileId}`;
    }
    return `/api/storage/${encodeURIComponent(fileId)}`;
  }

  /**
   * Get storage provider info.
   */
  getProviderInfo(): { provider: string; bucket: string; region: string; maxFileSize: number } {
    return {
      provider: this.config.provider,
      bucket: this.config.bucket,
      region: this.config.region,
      maxFileSize: this.config.maxFileSize,
    };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!_instance) {
    _instance = new StorageService();
  }
  return _instance;
}

export const storage = getStorageService();
