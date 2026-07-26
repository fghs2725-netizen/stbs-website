import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: Record<string, unknown> = {};
    if (activeOnly) where.isActive = true;

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Failed to list email templates:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, name, subject, htmlBody, textBody, variables, isActive } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json({ error: 'Template subject is required' }, { status: 400 });
    }

    if (!htmlBody || typeof htmlBody !== 'string' || htmlBody.trim().length === 0) {
      return NextResponse.json({ error: 'Template HTML body is required' }, { status: 400 });
    }

    if (variables && !Array.isArray(variables)) {
      return NextResponse.json({ error: 'Variables must be an array of strings' }, { status: 400 });
    }

    let template;

    if (id) {
      const existing = await prisma.emailTemplate.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      template = await prisma.emailTemplate.update({
        where: { id },
        data: {
          name: name.trim(),
          subject: subject.trim(),
          htmlBody: htmlBody.trim(),
          textBody: textBody || null,
          variables: variables || [],
          ...(typeof isActive === 'boolean' && { isActive }),
        },
      });
    } else {
      const existingByName = await prisma.emailTemplate.findUnique({
        where: { name: name.trim() },
      });

      if (existingByName) {
        return NextResponse.json({ error: 'A template with this name already exists' }, { status: 409 });
      }

      template = await prisma.emailTemplate.create({
        data: {
          name: name.trim(),
          subject: subject.trim(),
          htmlBody: htmlBody.trim(),
          textBody: textBody || null,
          variables: variables || [],
          isActive: isActive !== false,
        },
      });
    }

    return NextResponse.json(template, { status: id ? 200 : 201 });
  } catch (error) {
    console.error('Failed to save email template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
