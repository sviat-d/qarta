import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config.js";

export interface WebhookJobData {
  webhookEventId: string;
  stripeEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  account?: string;
  isConnect: boolean;
}

const QUEUE_NAME = "webhook-processing";

let connection: IORedis | null = null;
let queue: Queue<WebhookJobData> | null = null;
let worker: Worker<WebhookJobData> | null = null;

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

/**
 * Get (or create) the webhook processing queue.
 */
export function getWebhookQueue(): Queue<WebhookJobData> {
  if (!queue) {
    queue = new Queue<WebhookJobData>(QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return queue;
}

/**
 * Enqueue a webhook event for async processing.
 */
export async function enqueueWebhook(data: WebhookJobData): Promise<void> {
  const q = getWebhookQueue();
  await q.add(`webhook:${data.eventType}`, data, {
    jobId: data.stripeEventId, // prevents duplicate jobs
  });
}

/**
 * Start the webhook processing worker.
 * The processor function is injected to avoid circular deps.
 */
export function startWebhookWorker(
  processor: (job: Job<WebhookJobData>) => Promise<void>,
): Worker<WebhookJobData> {
  if (worker) return worker;

  worker = new Worker<WebhookJobData>(QUEUE_NAME, processor, {
    connection: getConnection(),
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    console.log(`Webhook job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Webhook job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

/**
 * Gracefully shut down queue and worker connections.
 */
export async function closeWebhookQueue(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
  if (connection) {
    connection.disconnect();
    connection = null;
  }
}
