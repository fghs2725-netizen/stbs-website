import { prisma } from "@/lib/prisma";
import { logAudit } from "./audit-logger";
import { notifyApprovalSubmitted, notifyApprovalDecision } from "@/lib/notifications";
import type { DocumentStatus, ApprovalStatus, ApprovalAction } from "@prisma/client";

// ─── Valid Document Status Transitions ───────────────────────────────────────

const VALID_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ["PENDING_REVIEW", "UNDER_REVIEW", "CANCELLED"],
  PENDING_REVIEW: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "REVISION", "CANCELLED"],
  REVISION: ["PENDING_REVIEW", "UNDER_REVIEW", "CANCELLED"],
  APPROVED: ["ISSUED", "FINALIZED", "CANCELLED"],
  REJECTED: ["DRAFT", "REVISION", "CANCELLED"],
  ISSUED: ["VIEWED", "ACCEPTED", "COMPLETED"],
  VIEWED: ["ACCEPTED", "COMPLETED"],
  ACCEPTED: ["COMPLETED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
  CANCELLED: ["DRAFT"],
  FINALIZED: ["ARCHIVED"],
  EXPIRED: ["DRAFT"],
};

const APPROVAL_DECISION_TRANSITIONS: Record<string, DocumentStatus> = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  REVISION_REQUESTED: "REVISION",
};

// ─── Core State Machine ──────────────────────────────────────────────────────

export function canTransitionStatus(from: DocumentStatus, to: DocumentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(status: DocumentStatus): DocumentStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

// ─── Approval Request Lifecycle ──────────────────────────────────────────────

interface SubmitApprovalInput {
  documentId: string;
  userId: string;
  note?: string;
}

export async function submitForApproval(input: SubmitApprovalInput) {
  const { documentId, userId, note } = input;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      approvalRequests: {
        where: { status: "PENDING" as ApprovalStatus },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!document) throw new Error("Document not found");
  if (document.approvalRequests.length > 0) {
    throw new Error("Document already has a pending approval request");
  }
  if (!canTransitionStatus(document.status, "PENDING_REVIEW")) {
    throw new Error(`Cannot submit document in ${document.status} status for approval`);
  }

  const rule = await prisma.approvalRule.findFirst({
    where: { documentType: document.type, isActive: true },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  const previousStatus = document.status;

  const approvalRequest = await prisma.$transaction(async (tx) => {
    const req = await tx.approvalRequest.create({
      data: {
        documentId,
        ruleId: rule?.id,
        requestedBy: userId,
        requesterNote: note,
        expiresAt: rule ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      },
    });

    await tx.document.update({
      where: { id: documentId },
      data: { status: "PENDING_REVIEW" },
    });

    await tx.approvalHistoryEntry.create({
      data: {
        approvalRequestId: req.id,
        action: "SUBMITTED",
        performedBy: userId,
        comment: note,
        previousStatus,
        newStatus: "PENDING_REVIEW",
      },
    });

    return req;
  });

  await logAudit({
    action: "APPROVAL_SUBMITTED",
    entityType: "Document",
    entityId: documentId,
    description: "Document submitted for approval",
    userId,
    metadata: { approvalRequestId: approvalRequest.id, previousStatus },
  });

  const submitter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notifyApprovalSubmitted({
    documentId,
    documentTitle: document.title,
    documentReference: document.reference,
    submittedByName: submitter?.name || "Unknown",
  });

  return approvalRequest;
}

interface DecideApprovalInput {
  approvalRequestId: string;
  decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  userId: string;
  comment?: string;
}

export async function decideApproval(input: DecideApprovalInput) {
  const { approvalRequestId, decision, userId, comment } = input;

  const newDocStatus = APPROVAL_DECISION_TRANSITIONS[decision] as DocumentStatus;
  if (!newDocStatus) throw new Error(`Invalid decision: ${decision}`);

  const finalStatus = decision === "REVISION_REQUESTED" ? "PENDING" : decision;

  // Atomic claim: use FOR UPDATE inside the transaction to lock the row,
  // preventing concurrent decisions on the same request.
  const approvalRequest = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRawUnsafe<Array<{
      id: string;
      documentId: string;
      status: string;
      expiresAt: Date | null;
      requestedBy: string | null;
    }>>(
      `SELECT id, "documentId", status, "expiresAt", "requestedBy"
       FROM "ApprovalRequest"
       WHERE id = $1
       FOR UPDATE`,
      approvalRequestId
    );

    if (!locked || locked.length === 0) throw new Error("Approval request not found");

    const row = locked[0];
    if (row.status !== "PENDING") throw new Error("Approval request is not pending");
    if (row.expiresAt && row.expiresAt < new Date()) throw new Error("Approval request has expired");

    await tx.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: finalStatus as ApprovalStatus,
        decidedBy: userId,
        decidedAt: new Date(),
        decisionNote: comment,
      },
    });

    return row;
  });

  // Fetch the full document for notifications
  const document = await prisma.document.findUnique({ where: { id: approvalRequest.documentId } });
  if (!document) throw new Error("Document not found for this approval request");

  const previousStatus = document.status;

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: approvalRequest.documentId },
      data: { status: newDocStatus },
    });

    await tx.approvalHistoryEntry.create({
      data: {
        approvalRequestId,
        action: decision as ApprovalAction,
        performedBy: userId,
        comment,
        previousStatus,
        newStatus: newDocStatus,
      },
    });
  });

  await logAudit({
    action: `APPROVAL_${decision}`,
    entityType: "Document",
    entityId: approvalRequest.documentId,
    description: `Document ${decision.toLowerCase().replace(/_/g, " ")} by approver`,
    userId,
    metadata: { approvalRequestId, previousStatus, newStatus: newDocStatus, comment },
  });

  const decider = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notifyApprovalDecision({
    documentId: approvalRequest.documentId,
    documentTitle: document.title,
    documentReference: document.reference,
    decision: decision as "APPROVED" | "REJECTED" | "REVISION_REQUESTED",
    decidedByName: decider?.name || "Unknown",
    targetUserId: approvalRequest.requestedBy ?? undefined,
  });
}

export async function cancelApproval(approvalRequestId: string, userId: string) {
  const approvalRequest = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: { document: true },
  });

  if (!approvalRequest) throw new Error("Approval request not found");
  if (approvalRequest.status !== "PENDING") throw new Error("Only pending requests can be cancelled");

  const previousStatus = approvalRequest.document?.status;

  await prisma.$transaction(async (tx) => {
    await tx.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: "CANCELLED", decidedBy: userId, decidedAt: new Date() },
    });

    await tx.document.update({
      where: { id: approvalRequest.documentId },
      data: { status: "DRAFT" },
    });

    await tx.approvalHistoryEntry.create({
      data: {
        approvalRequestId,
        action: "CANCELLED",
        performedBy: userId,
        previousStatus,
        newStatus: "DRAFT",
      },
    });
  });

  await logAudit({
    action: "APPROVAL_CANCELLED",
    entityType: "Document",
    entityId: approvalRequest.documentId,
    description: "Approval request cancelled",
    userId,
    metadata: { approvalRequestId, previousStatus },
  });
}

export async function getApprovalHistory(documentId: string) {
  return prisma.approvalRequest.findMany({
    where: { documentId },
    include: { history: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveApprovalRequest(documentId: string) {
  return prisma.approvalRequest.findFirst({
    where: { documentId, status: "PENDING" },
    include: { history: { orderBy: { createdAt: "desc" } } },
  });
}

export async function getPendingApprovals() {
  return prisma.approvalRequest.findMany({
    where: { status: "PENDING" },
    include: {
      document: { include: { client: true, creator: true } },
      rule: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Rule Management ─────────────────────────────────────────────────────────

interface CreateRuleInput {
  name: string;
  documentType: string;
  minApprovers?: number;
  roleRequired?: string;
  steps?: { stepOrder: number; name: string; requiredRole?: string; requiredUserId?: string; isAutoApprove?: boolean }[];
}

export async function createApprovalRule(input: CreateRuleInput) {
  const { steps, ...ruleData } = input;
  return prisma.approvalRule.create({
    data: {
      name: ruleData.name,
      documentType: ruleData.documentType as any,
      minApprovers: ruleData.minApprovers ?? 1,
      roleRequired: ruleData.roleRequired,
      steps: steps ? { create: steps.map((s) => ({ stepOrder: s.stepOrder, name: s.name, requiredRole: s.requiredRole, requiredUserId: s.requiredUserId, isAutoApprove: s.isAutoApprove ?? false })) } : undefined,
    },
    include: { steps: true },
  });
}

export async function getApprovalRules(documentType?: string) {
  return prisma.approvalRule.findMany({
    where: documentType ? { documentType: documentType as any, isActive: true } : { isActive: true },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateApprovalRule(id: string, data: Partial<CreateRuleInput>) {
  const { steps, ...ruleData } = data;
  return prisma.approvalRule.update({
    where: { id },
    data: {
      name: ruleData.name,
      documentType: ruleData.documentType as any,
      minApprovers: ruleData.minApprovers,
      roleRequired: ruleData.roleRequired,
    },
    include: { steps: true },
  });
}

export async function deleteApprovalRule(id: string) {
  return prisma.approvalRule.update({ where: { id }, data: { isActive: false } });
}

export async function getApprovalStats() {
  const [pending, approved, rejected, total] = await Promise.all([
    prisma.approvalRequest.count({ where: { status: "PENDING" } }),
    prisma.approvalRequest.count({ where: { status: "APPROVED" } }),
    prisma.approvalRequest.count({ where: { status: "REJECTED" } }),
    prisma.approvalRequest.count(),
  ]);
  return { pending, approved, rejected, total };
}

export async function expireStaleApprovals() {
  const expired = await prisma.approvalRequest.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
  });

  for (const request of expired) {
    await prisma.$transaction(async (tx) => {
      await tx.approvalRequest.update({ where: { id: request.id }, data: { status: "EXPIRED" } });
      await tx.document.update({ where: { id: request.documentId }, data: { status: "EXPIRED" } });
      await tx.approvalHistoryEntry.create({
        data: { approvalRequestId: request.id, action: "EXPIRED", comment: "Approval request expired automatically", newStatus: "EXPIRED" },
      });
    });

    await logAudit({
      action: "APPROVAL_EXPIRED",
      entityType: "Document",
      entityId: request.documentId,
      description: "Approval request expired",
      metadata: { approvalRequestId: request.id },
    }).catch(() => {});
  }

  return expired.length;
}
