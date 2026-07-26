/**
 * Portal authentication — full version (re-exports Edge-safe functions + server-only functions).
 *
 * Server-only functions (authenticatePortalClient, generateClientAccessCode) use Prisma and bcrypt.
 * Do NOT import this file from middleware.ts — use ./portal-auth-edge.ts instead.
 */
export { createPortalToken, verifyPortalToken, type PortalClaims } from './portal-auth-edge';

import { prisma } from '@/lib/prisma';

/**
 * Authenticate a portal client by email + access code.
 * Only called from API routes (not middleware), so bcrypt is safe here.
 */
export async function authenticatePortalClient(email: string, accessCode: string) {
  const bcrypt = await import('bcryptjs');
  const client = await prisma.client.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      deletedAt: null,
    },
  });

  if (!client || !client.accessCodeHash) return null;

  const valid = await bcrypt.compare(accessCode, client.accessCodeHash);
  if (!valid) return null;

  return {
    clientId: client.id,
    email: client.email || email,
    companyName: client.companyName,
    contactPerson: client.contactPerson,
  };
}

/**
 * Generates a new access code for a client and returns the plaintext.
 * The caller is responsible for securely delivering it to the client.
 */
export async function generateClientAccessCode(clientId: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  const { prisma: p } = await import('@/lib/prisma');
  const code = `STBS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const hash = await bcrypt.hash(code, 12);
  await p.client.update({
    where: { id: clientId },
    data: { accessCodeHash: hash },
  });
  return code;
}
