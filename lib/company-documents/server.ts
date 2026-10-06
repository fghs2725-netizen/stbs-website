import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { CompanyDocument } from "@prisma/client";
import { deleteDocumentObject, documentObjectInfo, readDocumentObject } from "./storage";
import { validDocumentSignature, type CompanyDocumentItem } from "./shared";

export class DocumentError extends Error { constructor(message: string, public status = 400) { super(message); } }
export async function requireDocumentAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new DocumentError("Please sign in again.", 401);
  if ((session.user as { role?: string }).role !== "SUPER_ADMIN") throw new DocumentError("Access denied.", 403);
  return session.user.id;
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new DocumentError("Access denied.", 403);
}
export function serializeDocument(row: CompanyDocument): CompanyDocumentItem {
  return { id: row.id, title: row.title, category: row.category, originalName: row.originalName, mimeType: row.mimeType, size: row.size, createdAt: row.createdAt.toISOString() };
}
export function documentResponse(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } }); }
export function documentFailure(error: unknown) {
  if (error instanceof DocumentError) return documentResponse({ error: error.message }, error.status);
  if (error instanceof ZodError) return documentResponse({ error: error.issues[0]?.message || "Invalid document details." }, 400);
  if (error instanceof SyntaxError) return documentResponse({ error: "Invalid request." }, 400);
  console.error("[company-documents] Request failed:", error instanceof Error ? error.name : "UnknownError");
  return documentResponse({ error: "Documents are unavailable right now. Please try again." }, 503);
}
export async function completeDocument(id: string) {
  const row = await prisma.companyDocument.findUnique({ where: { id } });
  if (!row) throw new DocumentError("Document not found.", 404);
  if (row.deletedAt) {
    await deleteDocumentObject(row.provider, row.storageKey);
    throw new DocumentError("Document was removed.", 404);
  }
  if (row.status === "READY") return row;
  if (row.createdAt.getTime() < Date.now() - 24 * 60 * 60 * 1000) throw new DocumentError("Upload expired. Please upload the file again.");
  const info = await documentObjectInfo(row.provider, row.storageKey);
  const stream = await readDocumentObject(row.provider, row.storageKey);
  if (!stream) throw new DocumentError("Upload has not finished. Please retry.");
  const reader = stream.getReader();
  const chunks: number[] = [];
  try {
    while (chunks.length < 512) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(...value.slice(0, 512 - chunks.length));
    }
  } finally { await reader.cancel(); }
  if (!info.private || info.pathname !== row.storageKey || info.size !== row.size || !validDocumentSignature(new Uint8Array(chunks), row.mimeType)) {
    await prisma.companyDocument.update({ where: { id }, data: { status: "DELETED", deletedAt: new Date() } });
    await deleteDocumentObject(row.provider, row.storageKey);
    throw new DocumentError("The uploaded file does not match its file type or size. Choose a valid file.");
  }
  const updated = await prisma.companyDocument.updateMany({ where: { id, status: "PENDING", deletedAt: null }, data: { status: "READY" } });
  if (!updated.count) {
    const latest = await prisma.companyDocument.findUnique({ where: { id } });
    if (latest?.status === "READY" && !latest.deletedAt) return latest;
    await deleteDocumentObject(row.provider, row.storageKey);
    throw new DocumentError("Document was removed.", 404);
  }
  return { ...row, status: "READY" };
}

/** Expired tokens can no longer write here. Retain tombstones to make late callbacks harmless. */
export async function cleanupDocuments() {
  const stale = await prisma.companyDocument.findMany({ where: { status: { in: ["PENDING", "DELETED"] }, createdAt: { lt: new Date(Date.now() - 86400000) } }, take: 10, orderBy: { updatedAt: "asc" } });
  for (const row of stale) {
    await prisma.companyDocument.update({ where: { id: row.id }, data: { status: "DELETED", deletedAt: row.deletedAt || new Date() } });
    await deleteDocumentObject(row.provider, row.storageKey);
    await prisma.companyDocument.delete({ where: { id: row.id } });
  }
}
