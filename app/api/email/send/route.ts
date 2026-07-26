import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT_LENGTH = 500;
const MAX_BODY_LENGTH = 500000;
const MAX_RECIPIENTS = 50;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { to, cc, bcc, subject, htmlBody, textBody, templateId, templateVariables, attachments, metadata } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 });
    }

    if (to.length > MAX_RECIPIENTS) {
      return NextResponse.json({ error: `Too many recipients (max ${MAX_RECIPIENTS})` }, { status: 400 });
    }

    for (const addr of to) {
      if (typeof addr !== 'string' || !EMAIL_REGEX.test(addr)) {
        return NextResponse.json({ error: `Invalid email address: ${addr}` }, { status: 400 });
      }
    }

    if (cc && Array.isArray(cc)) {
      for (const addr of cc) {
        if (typeof addr !== 'string' || !EMAIL_REGEX.test(addr)) {
          return NextResponse.json({ error: `Invalid CC email address: ${addr}` }, { status: 400 });
        }
      }
    }

    if (bcc && Array.isArray(bcc)) {
      for (const addr of bcc) {
        if (typeof addr !== 'string' || !EMAIL_REGEX.test(addr)) {
          return NextResponse.json({ error: `Invalid BCC email address: ${addr}` }, { status: 400 });
        }
      }
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    if (subject.length > MAX_SUBJECT_LENGTH) {
      return NextResponse.json({ error: 'Subject is too long' }, { status: 400 });
    }

    let finalHtmlBody = htmlBody || '';
    let finalTextBody = textBody || '';

    if (templateId) {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return NextResponse.json({ error: 'Email template not found' }, { status: 404 });
      }

      if (!template.isActive) {
        return NextResponse.json({ error: 'Email template is inactive' }, { status: 400 });
      }

      finalHtmlBody = template.htmlBody;
      finalTextBody = template.textBody || '';

      if (templateVariables && typeof templateVariables === 'object') {
        for (const [key, value] of Object.entries(templateVariables)) {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          const replacement = String(value ?? '');
          finalHtmlBody = finalHtmlBody.replace(regex, replacement);
          finalTextBody = finalTextBody.replace(regex, replacement);
        }
      }
    }

    if (!finalHtmlBody && !finalTextBody) {
      return NextResponse.json({ error: 'Email body is required (htmlBody, textBody, or templateId)' }, { status: 400 });
    }

    if (finalHtmlBody.length > MAX_BODY_LENGTH) {
      return NextResponse.json({ error: 'Email body is too large' }, { status: 400 });
    }

    const emailLog = await prisma.emailLog.create({
      data: {
        to,
        cc: cc || [],
        bcc: bcc || [],
        subject: subject.trim(),
        templateId: templateId || null,
        body: finalHtmlBody || finalTextBody,
        attachments: attachments || null,
        status: 'PENDING',
        metadata: {
          ...metadata,
          requestedBy: session.user?.id || null,
          queuedAt: new Date().toISOString(),
          textBody: finalTextBody || null,
        },
      },
    });

    const job = await prisma.backgroundJob.create({
      data: {
        queue: 'email',
        type: 'SEND_EMAIL',
        payload: { emailLogId: emailLog.id },
        status: 'PENDING',
        priority: 10,
      },
    });

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { jobId: job.id },
    });

    return NextResponse.json({
      emailLogId: emailLog.id,
      jobId: job.id,
      status: 'PENDING',
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to queue email:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
