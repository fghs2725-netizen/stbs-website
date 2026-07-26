import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import type { JobStatus as PrismaJobStatus } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export type JobQueueName =
  | "PDF_GENERATION"
  | "EMAIL"
  | "NOTIFICATIONS"
  | "IMAGE_PROCESSING"
  | "QR_GENERATION"
  | "CLEANUP"
  | "AUDIT_EXPORT"
  | "ANALYTICS";

export interface JobConfig {
  queue: JobQueueName;
  type: string;
  payload: unknown;
  priority?: number;
  delay?: number;
  maxAttempts?: number;
}

export type JobStatus = "pending" | "active" | "completed" | "failed" | "dead_letter";

export interface JobResult {
  jobId: string;
  status: JobStatus;
  progress?: number;
  result?: unknown;
  error?: string;
}

export type JobProcessor = (payload: unknown, jobId: string) => Promise<unknown>;

// ─── Concurrency config per queue ───────────────────────────────────────────

const QUEUE_CONCURRENCY: Record<string, number> = {
  PDF_GENERATION: 2,
  EMAIL: 3,
  NOTIFICATIONS: 5,
  IMAGE_PROCESSING: 2,
  QR_GENERATION: 3,
  CLEANUP: 1,
  AUDIT_EXPORT: 1,
  ANALYTICS: 2,
};

// ─── Exponential backoff helper ──────────────────────────────────────────────

function getBackoffMs(attempt: number): number {
  const base = 1000;
  const max = 60_000;
  return Math.min(base * Math.pow(2, attempt - 1), max);
}

// ─── Status mapping ─────────────────────────────────────────────────────────

function mapStatus(prismaStatus: PrismaJobStatus): JobStatus {
  const mapping: Record<PrismaJobStatus, JobStatus> = {
    PENDING: "pending",
    ACTIVE: "active",
    COMPLETED: "completed",
    FAILED: "failed",
    DELAYED: "pending",
    DEAD_LETTER: "dead_letter",
  };
  return mapping[prismaStatus] || "pending";
}

// ─── Job Queue Class ────────────────────────────────────────────────────────

class JobQueue {
  private processors = new Map<string, JobProcessor>();
  private running = new Map<string, Set<string>>();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private progressMap = new Map<string, number>();

  constructor() {
    for (const queue of Object.keys(QUEUE_CONCURRENCY)) {
      this.running.set(queue, new Set());
    }
  }

  /**
   * Register a processor function for a specific job type.
   */
  registerProcessor(type: string, processor: JobProcessor): void {
    this.processors.set(type, processor);
  }

  /**
   * Add a job to the queue.
   */
  async add(config: JobConfig): Promise<JobResult> {
    const jobId = randomUUID();
    const maxAttempts = config.maxAttempts ?? 3;

    const job = await prisma.backgroundJob.create({
      data: {
        id: jobId,
        queue: config.queue,
        type: config.type,
        payload: config.payload ? JSON.parse(JSON.stringify(config.payload)) : undefined,
        priority: config.priority ?? 0,
        maxAttempts,
        status: config.delay && config.delay > 0 ? "DELAYED" : "PENDING",
      },
    });

    const result: JobResult = {
      jobId: job.id,
      status: mapStatus(job.status),
    };

    if (!config.delay || config.delay <= 0) {
      this.processNextForQueue(config.queue);
    } else {
      setTimeout(() => {
        prisma.backgroundJob.update({
          where: { id: jobId },
          data: { status: "PENDING" },
        }).then(() => {
          this.processNextForQueue(config.queue);
        }).catch(() => {});
      }, config.delay);
    }

    return result;
  }

  /**
   * Get the status of a specific job.
   */
  async getJobStatus(jobId: string): Promise<JobResult | null> {
    const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
    if (!job) return null;

    return {
      jobId: job.id,
      status: mapStatus(job.status),
      progress: this.progressMap.get(jobId),
      result: job.result ?? undefined,
      error: job.error ?? undefined,
    };
  }

  /**
   * Update progress for a running job (called from within processors).
   */
  updateProgress(jobId: string, progress: number): void {
    this.progressMap.set(jobId, Math.min(100, Math.max(0, progress)));
  }

  /**
   * Process the next job for a given queue.
   * Uses SELECT ... FOR UPDATE SKIP LOCKED to atomically claim a job,
   * preventing duplicate processing across concurrent workers.
   */
  private async processNextForQueue(queue: string): Promise<void> {
    const maxConcurrent = QUEUE_CONCURRENCY[queue] || 1;
    const runningJobs = this.running.get(queue) || new Set();

    if (runningJobs.size >= maxConcurrent) return;

    // Atomically claim the next pending job — SKIP LOCKED prevents
    // two workers from picking up the same row.
    const claimed = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `UPDATE "BackgroundJob"
       SET "status" = 'ACTIVE', "startedAt" = NOW()
       WHERE id = (
         SELECT id FROM "BackgroundJob"
         WHERE "queue" = $1 AND "status" = 'PENDING'
         ORDER BY "priority" DESC, "createdAt" ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING id`,
      queue
    );

    if (!claimed || claimed.length === 0) return;

    const jobId = claimed[0].id;
    runningJobs.add(jobId);
    this.running.set(queue, runningJobs);

    // Fetch the full job record for processing
    const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
    if (!job) {
      this.removeFromRunning(queue, jobId);
      return;
    }

    await this.executeJob({
      id: job.id,
      queue: job.queue,
      type: job.type,
      payload: job.payload,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
    });
  }

  /**
   * Execute a single job.
   */
  private async executeJob(job: {
    id: string;
    queue: string;
    type: string;
    payload: unknown;
    attempts: number;
    maxAttempts: number;
  }): Promise<void> {
    const processor = this.processors.get(job.type);
    if (!processor) {
      await this.moveToDeadLetter(job.id, `No processor registered for type "${job.type}"`);
      this.removeFromRunning(job.queue, job.id);
      return;
    }

    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: { status: "ACTIVE", startedAt: new Date(), attempts: { increment: 1 } },
    });

    this.progressMap.set(job.id, 0);

    try {
      const result = await processor(job.payload, job.id);
      this.progressMap.set(job.id, 100);

      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          result: result ? JSON.parse(JSON.stringify(result)) : undefined,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown processing error";
      const currentAttempt = job.attempts + 1;

      if (currentAttempt >= job.maxAttempts) {
        await this.moveToDeadLetter(job.id, message);
      } else {
        const backoffMs = getBackoffMs(currentAttempt);
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: "PENDING",
            error: message,
          },
        });

        setTimeout(() => {
          this.processNextForQueue(job.queue);
        }, backoffMs);
      }
    } finally {
      this.progressMap.delete(job.id);
      this.removeFromRunning(job.queue, job.id);
      this.processNextForQueue(job.queue);
    }
  }

  /**
   * Move a job to the dead letter queue.
   */
  private async moveToDeadLetter(jobId: string, errorMessage: string): Promise<void> {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: "DEAD_LETTER",
        error: errorMessage,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Remove a job from the running set.
   */
  private removeFromRunning(queue: string, jobId: string): void {
    const runningJobs = this.running.get(queue);
    if (runningJobs) {
      runningJobs.delete(jobId);
    }
  }

  /**
   * Start polling for delayed and stuck jobs.
   */
  startPolling(intervalMs = 5000): void {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
      try {
        const staleJobs = await prisma.backgroundJob.findMany({
          where: {
            status: "ACTIVE",
            startedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
          },
          take: 10,
        });

        for (const job of staleJobs) {
          const currentAttempt = job.attempts;
          if (currentAttempt >= job.maxAttempts) {
            await this.moveToDeadLetter(job.id, "Job timed out after max attempts");
          } else {
            await prisma.backgroundJob.update({
              where: { id: job.id },
              data: { status: "PENDING" },
            });
            this.processNextForQueue(job.queue);
          }
        }

        const delayedJobs = await prisma.backgroundJob.findMany({
          where: {
            status: "DELAYED",
            createdAt: { lte: new Date() },
          },
          take: 10,
        });

        for (const job of delayedJobs) {
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: { status: "PENDING" },
          });
          this.processNextForQueue(job.queue);
        }
      } catch (error) {
        console.error("[JobQueue] Polling error:", error);
      }
    }, intervalMs);
  }

  /**
   * Stop polling.
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Retry a dead-lettered job.
   */
  async retryJob(jobId: string): Promise<JobResult | null> {
    const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== "DEAD_LETTER") return null;

    const updated = await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: "PENDING", attempts: 0, error: null },
    });

    this.processNextForQueue(updated.queue);

    return {
      jobId: updated.id,
      status: "pending",
    };
  }

  /**
   * Get queue statistics.
   */
  async getQueueStats(queue: string): Promise<{
    pending: number;
    active: number;
    completed: number;
    failed: number;
    deadLetter: number;
  }> {
    const [pending, active, completed, failed, deadLetter] = await Promise.all([
      prisma.backgroundJob.count({ where: { queue, status: "PENDING" } }),
      prisma.backgroundJob.count({ where: { queue, status: "ACTIVE" } }),
      prisma.backgroundJob.count({ where: { queue, status: "COMPLETED" } }),
      prisma.backgroundJob.count({ where: { queue, status: "FAILED" } }),
      prisma.backgroundJob.count({ where: { queue, status: "DEAD_LETTER" } }),
    ]);

    return { pending, active, completed, failed, deadLetter };
  }

  /**
   * Get all jobs for a queue with pagination.
   */
  async getJobs(
    queue: string,
    status?: PrismaJobStatus,
    limit = 50,
    offset = 0
  ): Promise<{ jobs: Array<{
    id: string;
    queue: string;
    type: string;
    payload: unknown;
    status: string;
    priority: number;
    attempts: number;
    maxAttempts: number;
    result: unknown;
    error: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }>; total: number }> {
    const where = { queue, ...(status ? { status } : {}) };

    const [jobs, total] = await Promise.all([
      prisma.backgroundJob.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.backgroundJob.count({ where }),
    ]);

    return {
      jobs: jobs.map((j) => ({
        id: j.id,
        queue: j.queue,
        type: j.type,
        payload: j.payload,
        status: j.status,
        priority: j.priority,
        attempts: j.attempts,
        maxAttempts: j.maxAttempts,
        result: j.result,
        error: j.error,
        createdAt: j.createdAt,
        completedAt: j.completedAt,
      })),
      total,
    };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: JobQueue | null = null;

export function getJobQueue(): JobQueue {
  if (!_instance) {
    _instance = new JobQueue();
    _instance.startPolling();
  }
  return _instance;
}

export const jobQueue = getJobQueue();

/**
 * Convenience helper to enqueue a job and await its completion.
 */
export async function runJob(config: JobConfig, timeoutMs = 300_000): Promise<JobResult> {
  const queue = getJobQueue();
  const result = await queue.add(config);

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = await queue.getJobStatus(result.jobId);
    if (!status) {
      return { jobId: result.jobId, status: "failed", error: "Job disappeared" };
    }
    if (status.status === "completed" || status.status === "failed" || status.status === "dead_letter") {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { jobId: result.jobId, status: "failed", error: "Job timed out" };
}
