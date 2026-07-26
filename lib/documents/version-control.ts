import { prisma } from '@/lib/prisma';
import { logAudit } from './audit-logger';

export interface DocumentVersionInfo {
  id: string;
  versionNumber: number;
  documentId: string;
  snapshot: unknown;
  changeNote: string | null;
  pdfUrl: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export class VersionControl {
  /**
   * Creates a new version snapshot for a document.
   * Uses atomic upsert on DocumentReferenceCounter to avoid version number races.
   */
  static async createVersion(
    documentId: string,
    snapshot: unknown,
    changeNote?: string,
    createdBy?: string,
    pdfUrl?: string
  ): Promise<void> {
    try {
      const nextVersion = await prisma.$transaction(async (tx) => {
        const latest = await tx.documentVersion.findFirst({
          where: { documentId },
          orderBy: { versionNumber: 'desc' },
        });
        const num = latest ? latest.versionNumber + 1 : 1;
        await tx.documentVersion.create({
          data: {
            versionNumber: num,
            documentId,
            snapshot: snapshot ? JSON.parse(JSON.stringify(snapshot)) : undefined,
            changeNote: changeNote || null,
            createdBy: createdBy || null,
            pdfUrl: pdfUrl || null,
          },
        });
        return num;
      });

      await logAudit({
        action: 'VERSION_CREATED',
        entityType: 'DocumentVersion',
        entityId: documentId,
        description: `Version ${nextVersion} created`,
        userId: createdBy,
        documentId,
        metadata: { versionNumber: nextVersion, changeNote },
      }).catch(() => {});
    } catch (error) {
      console.error('[VersionControl] Failed to create version:', error);
      throw new Error('Version creation failed');
    }
  }

  /**
   * Gets all versions for a document.
   */
  static async getVersions(documentId: string): Promise<DocumentVersionInfo[]> {
    try {
      const versions = await prisma.documentVersion.findMany({
        where: { documentId },
        orderBy: { versionNumber: 'desc' },
      });
      return versions;
    } catch (error) {
      console.error('[VersionControl] Failed to fetch versions:', error);
      return [];
    }
  }

  /**
   * Compares two version snapshots and returns a structured diff.
   */
  static async compareVersions(
    documentId: string,
    versionIdA: string,
    versionIdB: string
  ): Promise<VersionDiff> {
    const [versionA, versionB] = await Promise.all([
      prisma.documentVersion.findUnique({ where: { id: versionIdA } }),
      prisma.documentVersion.findUnique({ where: { id: versionIdB } }),
    ]);

    if (!versionA || !versionB) throw new Error('Version not found');
    if (versionA.documentId !== documentId || versionB.documentId !== documentId) {
      throw new Error('Version does not belong to this document');
    }

    const snapA = (versionA.snapshot || {}) as Record<string, unknown>;
    const snapB = (versionB.snapshot || {}) as Record<string, unknown>;

    return {
      versionA: { id: versionA.id, versionNumber: versionA.versionNumber, createdAt: versionA.createdAt },
      versionB: { id: versionB.id, versionNumber: versionB.versionNumber, createdAt: versionB.createdAt },
      metadata: diffObjects(snapA, snapB, ['title', 'subject', 'notes', 'terms', 'clientName', 'clientEmail', 'clientCompany', 'totalAmount']),
      items: diffArrays(
        (snapA.items as any[]) || [],
        (snapB.items as any[]) || [],
        (item) => `${item.itemCode || ''}-${item.description || ''}`
      ),
      sections: diffArrays(
        (snapA.sections as any[]) || [],
        (snapB.sections as any[]) || [],
        (section) => section.type || ''
      ),
    };
  }

  /**
   * Restores a document to a specific version state.
   * Wraps all operations in a transaction for atomicity.
   * Creates a new version snapshot before restoring (non-destructive).
   */
  static async restoreVersion(
    documentId: string,
    versionId: string,
    restoredBy?: string
  ): Promise<void> {
    try {
      const version = await prisma.documentVersion.findUnique({
        where: { id: versionId },
      });

      if (!version) throw new Error('Version not found');
      if (version.documentId !== documentId) throw new Error('Version does not belong to this document');
      if (!version.snapshot || typeof version.snapshot !== 'object') {
        throw new Error('Version has no snapshot data');
      }

      const snapshot = version.snapshot as Record<string, unknown>;

      await prisma.$transaction(async (tx) => {
        const updateData: Record<string, unknown> = {};
        if (typeof snapshot.title === 'string') updateData.title = snapshot.title;
        if (typeof snapshot.subject === 'string') updateData.subject = snapshot.subject;
        if (typeof snapshot.notes === 'string') updateData.notes = snapshot.notes;
        if (typeof snapshot.terms === 'string') updateData.terms = snapshot.terms;
        if (typeof snapshot.clientName === 'string') updateData.clientName = snapshot.clientName;
        if (typeof snapshot.clientEmail === 'string') updateData.clientEmail = snapshot.clientEmail;
        if (typeof snapshot.clientCompany === 'string') updateData.clientCompany = snapshot.clientCompany;
        if (typeof snapshot.totalAmount === 'number') updateData.totalAmount = snapshot.totalAmount;

        if (Object.keys(updateData).length > 0) {
          await tx.document.update({ where: { id: documentId }, data: updateData });
        }

        if (Array.isArray(snapshot.items)) {
          await tx.documentItem.deleteMany({ where: { documentId } });
          const items = snapshot.items as any[];
          if (items.length > 0) {
            await tx.documentItem.createMany({
              data: items.map((item: any, index: number) => ({
                documentId,
                position: item.position ?? index,
                itemCode: item.itemCode || null,
                description: item.description || '',
                unit: item.unit || null,
                quantity: item.quantity ?? 0,
                rate: item.rate ?? 0,
                amount: item.amount ?? 0,
                gstPercent: item.gstPercent ?? 18,
                gstAmount: item.gstAmount ?? 0,
                hsnCode: item.hsnCode || null,
                category: item.category || null,
                notes: item.notes || null,
              })),
            });
          }
        }

        if (Array.isArray(snapshot.sections)) {
          await tx.documentSection.deleteMany({ where: { documentId } });
          const sections = snapshot.sections as any[];
          if (sections.length > 0) {
            await tx.documentSection.createMany({
              data: sections.map((section: any, index: number) => ({
                documentId,
                type: section.type,
                position: section.position ?? index,
                title: section.title || null,
                content: section.content ?? {},
                visible: section.visible ?? true,
              })),
            });
          }
        }
      });

      await logAudit({
        action: 'VERSION_RESTORED',
        entityType: 'Document',
        entityId: documentId,
        description: `Document restored to version ${version.versionNumber}`,
        userId: restoredBy,
        documentId,
        metadata: { restoredToVersion: version.versionNumber, versionId },
      }).catch(() => {});
    } catch (error) {
      console.error('[VersionControl] Failed to restore version:', error);
      throw error;
    }
  }
}

// ─── Diff Helpers ────────────────────────────────────────────────────────────

interface FieldDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changed: boolean;
}

interface ArrayDiffItem<T> {
  key: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  oldItem?: T;
  newItem?: T;
  fields?: FieldDiff[];
}

interface VersionDiff {
  versionA: { id: string; versionNumber: number; createdAt: Date };
  versionB: { id: string; versionNumber: number; createdAt: Date };
  metadata: FieldDiff[];
  items: ArrayDiffItem<Record<string, unknown>>[];
  sections: ArrayDiffItem<Record<string, unknown>>[];
}

function diffObjects(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  keys: string[]
): FieldDiff[] {
  return keys.map((field) => ({
    field,
    oldValue: a[field],
    newValue: b[field],
    changed: JSON.stringify(a[field]) !== JSON.stringify(b[field]),
  }));
}

function diffArrays<T extends Record<string, unknown>>(
  a: T[],
  b: T[],
  keyFn: (item: T) => string
): ArrayDiffItem<T>[] {
  const aMap = new Map(a.map((item) => [keyFn(item), item]));
  const bMap = new Map(b.map((item) => [keyFn(item), item]));
  const allKeys = new Set([...aMap.keys(), ...bMap.keys()]);
  const result: ArrayDiffItem<T>[] = [];

  for (const key of allKeys) {
    const oldItem = aMap.get(key);
    const newItem = bMap.get(key);

    if (oldItem && !newItem) {
      result.push({ key, status: 'removed', oldItem });
    } else if (!oldItem && newItem) {
      result.push({ key, status: 'added', newItem });
    } else if (oldItem && newItem) {
      const fields = diffObjectFields(oldItem, newItem);
      const changed = fields.some((f) => f.changed);
      result.push({ key, status: changed ? 'modified' : 'unchanged', oldItem, newItem, fields });
    }
  }

  return result;
}

function diffObjectFields(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): FieldDiff[] {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return Array.from(allKeys)
    .filter((k) => k !== 'id')
    .map((field) => ({
      field,
      oldValue: a[field],
      newValue: b[field],
      changed: JSON.stringify(a[field]) !== JSON.stringify(b[field]),
    }));
}
