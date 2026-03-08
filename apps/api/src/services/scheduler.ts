import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config.js";
import { sendDailySummaries } from "./daily-summary.js";

const QUEUE_NAME = "scheduled-jobs";

let connection: IORedis | null = null;
let queue: Queue | null = null;
let worker: Worker | null = null;

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

/**
 * Start the scheduler: registers repeatable jobs and a worker to process them.
 */
export async function startScheduler(): Promise<void> {
  const conn = getConnection();

  queue = new Queue(QUEUE_NAME, {
    connection: conn,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });

  // Daily summary at 8:00 AM UTC every day
  await queue.upsertJobScheduler(
    "daily-summary",
    { pattern: "0 8 * * *" },
    { name: "daily-summary" },
  );

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case "daily-summary":
          await sendDailySummaries();
          break;
        default:
          console.warn(`Unknown scheduled job: ${job.name}`);
      }
    },
    { connection: conn, concurrency: 1 },
  );

  worker.on("completed", (job) => {
    console.log(`Scheduled job ${job.name} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Scheduled job ${job?.name} failed:`, err.message);
  });

  console.log("Scheduler started — daily summary at 08:00 UTC");
}

/**
 * Gracefully shut down the scheduler.
 */
export async function closeScheduler(): Promise<void> {
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
