import { type Session } from "next-auth";
import { NextResponse } from "next/server";

type AdminSessionResult =
  | { ok: true; session: Session & { user: { id: string; role: string } } }
  | { ok: false; response: NextResponse };

/**
 * Validate the session is an authenticated admin.
 * Returns the narrowed session on success, or a 401/403 response on failure.
 */
export function requireAdmin(session: Session | null): AdminSessionResult {
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN" && role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, session: session as Session & { user: { id: string; role: string } } };
}
