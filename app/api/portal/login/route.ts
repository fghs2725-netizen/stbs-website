import { NextRequest, NextResponse } from 'next/server';
import { authenticatePortalClient, createPortalToken } from '@/lib/portal-auth';
import { checkRateLimit, applyRateLimitHeaders } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const rateLimitResult = await checkRateLimit(`portal-login:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
    });

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const body = await req.json();
    const { email, accessCode } = body;

    if (!email || !accessCode) {
      return NextResponse.json({ error: 'Email and access code are required' }, { status: 400 });
    }

    const client = await authenticatePortalClient(String(email).slice(0, 254), String(accessCode).slice(0, 100));
    if (!client) {
      const response = NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    const token = await createPortalToken(client.clientId, client.email, client.companyName);

    const response = NextResponse.json({
      success: true,
      client: {
        clientId: client.clientId,
        companyName: client.companyName,
        contactPerson: client.contactPerson,
      },
    });

    response.cookies.set('portal_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return applyRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Portal login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
