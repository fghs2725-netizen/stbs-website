/**
 * Client-visible document statuses for the portal.
 *
 * Only externally-facing states are shared with clients. Internal workflow
 * states (DRAFT, PENDING_REVIEW, UNDER_REVIEW, REVISION, ARCHIVED,
 * CANCELLED, REJECTED) never leave the admin side.
 *
 * Every portal query that reads documents must filter on this list so
 * clients never see drafts or cancelled paperwork.
 */
export const PORTAL_DOCUMENT_STATUSES = [
  "ISSUED",
  "VIEWED",
  "ACCEPTED",
  "APPROVED",
  "FINALIZED",
  "COMPLETED",
  "EXPIRED",
] as const;

export function isPortalVisibleStatus(status: string): boolean {
  return (PORTAL_DOCUMENT_STATUSES as readonly string[]).includes(status);
}
