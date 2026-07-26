import { appendFile, mkdir } from "fs/promises";
import { join } from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  service: string;
  stack?: string;
}

// ─── Sensitive fields to redact ─────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apikey",
  "api_key",
  "accesskey",
  "access_key",
  "secretkey",
  "secret_key",
  "authorization",
  "auth",
  "credential",
  "credentials",
  "creditcard",
  "credit_card",
  "cvv",
  "ssn",
]);

function sanitizeValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEYS.has(key.toLowerCase())) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    if (value.length > 500) return value.substring(0, 500) + "...[truncated]";
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sanitized[k] = sanitizeValue(v, k);
    }
    return sanitized;
  }

  return value;
}

function sanitizeEntry(entry: LogEntry): LogEntry {
  const sanitized = { ...entry };
  if (sanitized.context) {
    sanitized.context = sanitizeValue(sanitized.context) as LogContext;
  }
  return sanitized;
}

// ─── Logger Class ───────────────────────────────────────────────────────────

const LOG_DIR = join(process.cwd(), "logs");
const isProduction = process.env.NODE_ENV === "production";

class Logger {
  private serviceName: string;
  private baseContext: LogContext;
  private logFilePath: string | null = null;

  constructor(serviceName: string, baseContext: LogContext = {}) {
    this.serviceName = serviceName;
    this.baseContext = baseContext;
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!isProduction) return;

    try {
      if (!this.logFilePath) {
        await mkdir(LOG_DIR, { recursive: true });
        const date = new Date().toISOString().split("T")[0];
        this.logFilePath = join(LOG_DIR, `${date}.log`);
      }

      const line = JSON.stringify(entry) + "\n";
      await appendFile(this.logFilePath, line, "utf-8");
    } catch {
      // Fallback: write to stderr if file write fails
      process.stderr.write(`[Logger] File write failed: ${JSON.stringify(entry)}\n`);
    }
  }

  private log(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      context: {
        ...this.baseContext,
        ...extra,
      },
    };

    const sanitized = sanitizeEntry(entry);
    const jsonStr = JSON.stringify(sanitized);

    switch (level) {
      case "debug":
        console.debug(jsonStr);
        break;
      case "info":
        console.info(jsonStr);
        break;
      case "warn":
        console.warn(jsonStr);
        break;
      case "error":
        console.error(jsonStr);
        break;
    }

    this.writeToFile(sanitized).catch(() => {});
  }

  debug(message: string, extra?: Record<string, unknown>): void {
    this.log("debug", message, extra);
  }

  info(message: string, extra?: Record<string, unknown>): void {
    this.log("info", message, extra);
  }

  warn(message: string, extra?: Record<string, unknown>): void {
    this.log("warn", message, extra);
  }

  error(message: string, error?: Error | unknown, extra?: Record<string, unknown>): void {
    const errorInfo: Record<string, unknown> = { ...extra };

    if (error instanceof Error) {
      errorInfo.errorName = error.name;
      errorInfo.errorMessage = error.message;
      errorInfo.stack = error.stack;
    } else if (error !== undefined) {
      errorInfo.error = String(error);
    }

    this.log("error", message, errorInfo);
  }

  /**
   * Create a child logger with bound context fields.
   */
  child(context: LogContext): Logger {
    return new Logger(this.serviceName, { ...this.baseContext, ...context });
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a new logger instance for a service.
 */
export function createLogger(serviceName: string, context?: LogContext): Logger {
  return new Logger(serviceName, context);
}

/**
 * Get a logger bound to a specific request context.
 */
export function getRequestLogger(requestId: string, userId?: string): Logger {
  return new Logger("app", { requestId, userId });
}

// ─── Pre-built loggers ─────────────────────────────────────────────────────

export const storageLogger = createLogger("storage");
export const jobLogger = createLogger("jobs");
export const emailLogger = createLogger("email");
export const searchLogger = createLogger("search");
export const analyticsLogger = createLogger("analytics");
export const healthLogger = createLogger("health");
