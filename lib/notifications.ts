import { prisma } from "@/lib/prisma";

interface CreateNotificationInput {
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    return await prisma.notification.create({
      data: {
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        actionUrl: input.actionUrl,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error("[NotificationService] Failed to create notification:", error);
  }
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  try {
    await prisma.notification.createMany({
      data: inputs.map((input) => ({
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        actionUrl: input.actionUrl,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
      })),
    });
  } catch (error) {
    console.error("[NotificationService] Failed to create notifications:", error);
  }
}

export async function getNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number }) {
  return prisma.notification.findMany({
    where: { userId, ...(options?.unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: Math.min(options?.limit ?? 50, 100),
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function deleteNotification(notificationId: string, userId: string) {
  return prisma.notification.deleteMany({ where: { id: notificationId, userId } });
}

export async function notifyAdmins(input: Omit<CreateNotificationInput, "userId">) {
  const adminRole = await prisma.role.findFirst({ where: { name: "SUPER_ADMIN" }, select: { id: true } });
  if (!adminRole) return;

  const admins = await prisma.user.findMany({ where: { roleId: adminRole.id }, select: { id: true } });
  if (admins.length === 0) return;

  await createNotifications(
    admins.map((admin) => ({ ...input, userId: admin.id }))
  );
}

export async function notifyApprovalSubmitted(params: {
  documentId: string;
  documentTitle: string;
  documentReference: string;
  submittedByName: string;
}) {
  await notifyAdmins({
    type: "APPROVAL_SUBMITTED",
    title: "Document submitted for approval",
    message: `${params.submittedByName} submitted "${params.documentTitle}" (${params.documentReference}) for approval.`,
    entityType: "Document",
    entityId: params.documentId,
    actionUrl: `/admin/approvals`,
    metadata: { documentReference: params.documentReference },
  });
}

export async function notifyApprovalDecision(params: {
  documentId: string;
  documentTitle: string;
  documentReference: string;
  decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  decidedByName: string;
  targetUserId?: string;
}) {
  const label =
    params.decision === "APPROVED" ? "approved" :
    params.decision === "REJECTED" ? "rejected" : "requested revision for";

  await createNotification({
    type: `APPROVAL_${params.decision}`,
    title: `Document ${label}`,
    message: `${params.decidedByName} ${label} "${params.documentTitle}" (${params.documentReference}).`,
    entityType: "Document",
    entityId: params.documentId,
    userId: params.targetUserId,
    actionUrl: `/admin/documents/${params.documentId}/builder`,
    metadata: { decision: params.decision, documentReference: params.documentReference },
  });
}
