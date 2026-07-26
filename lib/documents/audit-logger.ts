import { prisma } from '@/lib/prisma';

interface LogParams {
  action: string;
  entityType: string;
  entityId: string;
  description?: string;
  userId?: string;
  documentId?: string;
  clientId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Logs an action to the audit trail.
 * Catches all errors internally so it never interrupts the main application flow.
 */
export async function logAudit(params: LogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        userId: params.userId || null,
        documentId: params.documentId || null,
        clientId: params.clientId || null,
        projectId: params.projectId || null,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) as any : undefined,
        ipAddress: params.ipAddress || null,
      }
    });
  } catch (error) {
    console.error('[AuditLogger] Failed to write audit log:', error);
  }
}

export class AuditLogger {
  static async logAction(params: LogParams): Promise<void> {
    return logAudit(params);
  }
}
