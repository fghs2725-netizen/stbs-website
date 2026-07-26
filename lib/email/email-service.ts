import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { jobQueue } from "@/lib/jobs/job-queue";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  templateId?: string;
  attachments?: EmailAttachment[];
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  success: boolean;
  emailLogId?: string;
  providerId?: string;
  error?: string;
}

export interface EmailProvider {
  send(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
  }): Promise<{ providerId: string }>;
}

// ─── Template Engine ────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    rendered = rendered.replace(pattern, escapeHtml(value ?? ""));
  }
  return rendered;
}

// ─── Built-in Templates ────────────────────────────────────────────────────

const BUILTIN_TEMPLATES: Record<string, { subject: string; html: string; text: string; variables: string[] }> = {
  approval_submitted: {
    subject: "Document Submitted for Approval — {{documentReference}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a5f;">Document Approval Required</h2>
        <p>Hello,</p>
        <p><strong>{{submittedByName}}</strong> has submitted <strong>{{documentTitle}}</strong> ({{documentReference}}) for your review.</p>
        <p style="margin: 20px 0;">
          <a href="{{approvalUrl}}" style="background: #1e3a5f; color: #fff; padding: 10px 24px; text-decoration: none; border-radius: 4px;">Review Document</a>
        </p>
        <p style="color: #666; font-size: 12px;">This is an automated notification from STBS Document Management.</p>
      </div>`,
    text: "Document Approval Required\n\n{{submittedByName}} has submitted \"{{documentTitle}}\" ({{documentReference}}) for your review.\n\nReview: {{approvalUrl}}",
    variables: ["documentTitle", "documentReference", "submittedByName", "approvalUrl"],
  },
  approval_decided: {
    subject: "Document {{decisionLabel}} — {{documentReference}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a5f;">Approval Decision</h2>
        <p>Hello,</p>
        <p><strong>{{decidedByName}}</strong> has <strong>{{decisionLabel}}</strong> the document <strong>{{documentTitle}}</strong> ({{documentReference}}).</p>
        {{#if comment}}<p><strong>Comment:</strong> {{comment}}</p>{{/if}}
        <p style="margin: 20px 0;">
          <a href="{{documentUrl}}" style="background: #1e3a5f; color: #fff; padding: 10px 24px; text-decoration: none; border-radius: 4px;">View Document</a>
        </p>
        <p style="color: #666; font-size: 12px;">This is an automated notification from STBS Document Management.</p>
      </div>`,
    text: "Approval Decision\n\n{{decidedByName}} has {{decisionLabel}} \"{{documentTitle}}\" ({{documentReference}}).\n\nView: {{documentUrl}}",
    variables: ["documentTitle", "documentReference", "decidedByName", "decisionLabel", "comment", "documentUrl"],
  },
  document_ready: {
    subject: "Document Ready — {{documentReference}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a5f;">Document Ready</h2>
        <p>Hello,</p>
        <p>Your document <strong>{{documentTitle}}</strong> ({{documentReference}}) has been generated and is ready for download.</p>
        <p style="margin: 20px 0;">
          <a href="{{downloadUrl}}" style="background: #1e3a5f; color: #fff; padding: 10px 24px; text-decoration: none; border-radius: 4px;">Download PDF</a>
        </p>
        <p style="color: #666; font-size: 12px;">This is an automated notification from STBS Document Management.</p>
      </div>`,
    text: "Document Ready\n\n\"{{documentTitle}}\" ({{documentReference}}) is ready for download.\n\nDownload: {{downloadUrl}}",
    variables: ["documentTitle", "documentReference", "downloadUrl"],
  },
  welcome: {
    subject: "Welcome to STBS — {{userName}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a5f;">Welcome, {{userName}}!</h2>
        <p>Your account has been created successfully.</p>
        <p><strong>Email:</strong> {{userEmail}}</p>
        <p><strong>Role:</strong> {{userRole}}</p>
        <p style="margin: 20px 0;">
          <a href="{{loginUrl}}" style="background: #1e3a5f; color: #fff; padding: 10px 24px; text-decoration: none; border-radius: 4px;">Go to Dashboard</a>
        </p>
        <p style="color: #666; font-size: 12px;">This is an automated notification from STBS Document Management.</p>
      </div>`,
    text: "Welcome, {{userName}}!\n\nYour account has been created successfully.\nEmail: {{userEmail}}\nRole: {{userRole}}\n\nLogin: {{loginUrl}}",
    variables: ["userName", "userEmail", "userRole", "loginUrl"],
  },
};

// ─── SMTP Provider ──────────────────────────────────────────────────────────

class SmtpEmailProvider implements EmailProvider {
  async send(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
  }): Promise<{ providerId: string }> {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host) throw new Error("SMTP_HOST is not configured");

    // Dynamic import — nodemailer is an optional peer dependency
    let nodemailerMod: unknown = null;
    try {
      nodemailerMod = await eval('import("nodemailer")');
    } catch {
      // not installed
    }
    if (!nodemailerMod) {
      throw new Error("nodemailer is not installed. Run: npm install nodemailer @types/nodemailer");
    }

    const nm = nodemailerMod as { default: { createTransport: (opts: Record<string, unknown>) => { sendMail: (opts: Record<string, unknown>) => Promise<{ messageId: string }> } } };
    const transporter = nm.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    const info = await transporter.sendMail({
      from,
      to: params.to.join(", "),
      cc: params.cc?.join(", "),
      bcc: params.bcc?.join(", "),
      subject: params.subject,
      html: params.html,
      text: params.text,
          attachments: params.attachments?.map((a) => ({
            filename: a.filename,
            content: typeof a.content === "string" ? Buffer.from(a.content, "base64") : a.content,
            contentType: a.contentType,
          })),
    });

    return { providerId: info.messageId };
  }
}

// ─── Resend Provider ────────────────────────────────────────────────────────

class ResendEmailProvider implements EmailProvider {
  async send(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
  }): Promise<{ providerId: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

    const from = process.env.SMTP_FROM || "STBS <noreply@stbs.in>";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        subject: params.subject,
        html: params.html,
        text: params.text,
        attachments: params.attachments?.map((a) => ({
          filename: a.filename,
          content: typeof a.content === "string" ? a.content : a.content.toString("base64"),
          content_type: a.contentType,
        })),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Resend API error: ${body.message || response.statusText}`);
    }

    const data = await response.json();
    return { providerId: data.id };
  }
}

// ─── SendGrid Provider ──────────────────────────────────────────────────────

class SendGridEmailProvider implements EmailProvider {
  async send(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
  }): Promise<{ providerId: string }> {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) throw new Error("SENDGRID_API_KEY is not configured");

    const from = process.env.SMTP_FROM || "STBS <noreply@stbs.in>";

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: params.to.map((email) => ({ email })),
            cc: params.cc?.map((email) => ({ email })),
            bcc: params.bcc?.map((email) => ({ email })),
          },
        ],
        from: { email: from },
        subject: params.subject,
        content: [
          { type: "text/html", value: params.html },
          ...(params.text ? [{ type: "text/plain", value: params.text }] : []),
        ],
        attachments: params.attachments?.map((a) => ({
          content: typeof a.content === "string" ? a.content : a.content.toString("base64"),
          filename: a.filename,
          type: a.contentType || "application/octet-stream",
          disposition: "attachment",
        })),
      }),
    });

    if (!response.ok && response.status !== 202) {
      const body = await response.json().catch(() => ({ errors: [{ message: response.statusText }] }));
      throw new Error(`SendGrid API error: ${body.errors?.[0]?.message || response.statusText}`);
    }

    return { providerId: randomUUID() };
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

function createEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) {
    return new ResendEmailProvider();
  }
  if (process.env.SENDGRID_API_KEY) {
    return new SendGridEmailProvider();
  }
  return new SmtpEmailProvider();
}

// ─── Email Service ──────────────────────────────────────────────────────────

class EmailService {
  private provider: EmailProvider;

  constructor() {
    this.provider = createEmailProvider();
  }

  /**
   * Send an email directly (bypasses job queue).
   */
  async sendDirect(params: SendEmailParams): Promise<EmailSendResult> {
    const emailLog = await prisma.emailLog.create({
      data: {
        to: params.to,
        cc: params.cc || [],
        bcc: params.bcc || [],
        subject: params.subject,
        templateId: params.templateId || null,
        body: params.htmlBody,
        attachments: params.attachments
          ? JSON.parse(JSON.stringify(params.attachments.map((a) => ({ filename: a.filename, contentType: a.contentType }))))
          : undefined,
        status: "PENDING",
        provider: process.env.RESEND_API_KEY ? "resend" : process.env.SENDGRID_API_KEY ? "sendgrid" : "smtp",
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      },
    });

    try {
      const { providerId } = await this.provider.send({
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        subject: params.subject,
        html: params.htmlBody,
        text: params.textBody,
        attachments: params.attachments,
      });

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: "SENT",
          providerId,
          sentAt: new Date(),
        },
      });

      return { success: true, emailLogId: emailLog.id, providerId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email send error";

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "FAILED", error: message },
      });

      return { success: false, emailLogId: emailLog.id, error: message };
    }
  }

  /**
   * Enqueue an email via the job queue (preferred method).
   * Falls back to direct send if queue is unavailable.
   */
  async send(params: SendEmailParams): Promise<EmailSendResult> {
    try {
      const result = await jobQueue.add({
        queue: "EMAIL",
        type: "SEND_EMAIL",
        payload: {
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          subject: params.subject,
          htmlBody: params.htmlBody,
          textBody: params.textBody,
          templateId: params.templateId,
          attachments: params.attachments?.map((a) => ({
            filename: a.filename,
            content: typeof a.content === "string" ? a.content : a.content.toString("base64"),
            contentType: a.contentType,
          })),
          metadata: params.metadata,
        },
        priority: 1,
      });

      return { success: true, emailLogId: result.jobId };
    } catch (error) {
      console.warn("[EmailService] Queue unavailable, falling back to direct send");
      return this.sendDirect(params);
    }
  }

  /**
   * Send an email using a template by name.
   */
  async sendWithTemplate(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    templateName: string;
    variables: Record<string, string>;
    attachments?: EmailAttachment[];
    metadata?: Record<string, unknown>;
  }): Promise<EmailSendResult> {
    let template = BUILTIN_TEMPLATES[params.templateName];

    if (!template) {
      const dbTemplate = await prisma.emailTemplate.findUnique({
        where: { name: params.templateName },
      });

      if (!dbTemplate) {
        return { success: false, error: `Template "${params.templateName}" not found` };
      }

      template = {
        subject: dbTemplate.subject,
        html: dbTemplate.htmlBody,
        text: dbTemplate.textBody || "",
        variables: dbTemplate.variables,
      };
    }

    const subject = renderTemplate(template.subject, params.variables);
    const htmlBody = renderTemplate(template.html, params.variables);
    const textBody = template.text ? renderTemplate(template.text, params.variables) : undefined;

    return this.send({
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject,
      htmlBody,
      textBody,
      templateId: params.templateName,
      attachments: params.attachments,
      metadata: params.metadata,
    });
  }

  /**
   * Register the email processor with the job queue.
   */
  registerProcessor(): void {
    jobQueue.registerProcessor("SEND_EMAIL", async (payload, jobId) => {
      const {
        to, cc, bcc, subject, htmlBody, textBody, templateId, attachments, metadata,
      } = payload as SendEmailParams & {
        attachments?: Array<{ filename: string; content: string; contentType?: string }>;
      };

      const emailLog = await prisma.emailLog.create({
        data: {
          to,
          cc: cc || [],
          bcc: bcc || [],
          subject,
          templateId: templateId || null,
          body: htmlBody,
          attachments: attachments
            ? JSON.parse(JSON.stringify(attachments.map((a) => ({ filename: a.filename, contentType: a.contentType }))))
            : undefined,
          status: "PENDING",
          provider: process.env.RESEND_API_KEY ? "resend" : process.env.SENDGRID_API_KEY ? "sendgrid" : "smtp",
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
          jobId,
        },
      });

      try {
        const { providerId } = await this.provider.send({
          to,
          cc,
          bcc,
          subject,
          html: htmlBody,
          text: textBody,
          attachments: attachments?.map((a) => ({
            filename: a.filename,
            content: typeof a.content === "string" ? Buffer.from(a.content, "base64") : a.content,
            contentType: a.contentType,
          })),
        });

        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: { status: "SENT", providerId, sentAt: new Date() },
        });

        return { providerId, emailLogId: emailLog.id };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Send failed";
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: { status: "FAILED", error: message },
        });
        throw error;
      }
    });
  }

  /**
   * Get email logs with filtering.
   */
  async getLogs(options?: {
    status?: string;
    templateId?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: unknown[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (options?.status) where.status = options.status;
    if (options?.templateId) where.templateId = options.templateId;
    if (options?.startDate || options?.endDate) {
      where.createdAt = {
        ...(options.startDate ? { gte: options.startDate } : {}),
        ...(options.endDate ? { lte: options.endDate } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.emailLog.count({ where }),
    ]);

    return { logs, total };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!_instance) {
    _instance = new EmailService();
    _instance.registerProcessor();
  }
  return _instance;
}

export const emailService = getEmailService();
