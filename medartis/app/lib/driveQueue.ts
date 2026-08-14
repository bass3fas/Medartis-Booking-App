const MAX_CONCURRENT_DRIVE_REQUESTS = 2;
const RATE_LIMIT_RETRY_DELAY_MS = 1000;
const MAX_RATE_LIMIT_RETRIES = 3;

type QueueTask<T> = () => Promise<T>;

let activeCount = 0;
const pendingTasks: Array<() => void> = [];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /\b429\b|rate limit|quota|too many requests/i.test(message);
}

function dequeue() {
  if (activeCount >= MAX_CONCURRENT_DRIVE_REQUESTS) return;
  const next = pendingTasks.shift();
  if (next) next();
}

export function enqueueDriveRequest<T>(task: QueueTask<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = async () => {
      activeCount += 1;
      try {
        let attempt = 0;
        while (true) {
          try {
            resolve(await task());
            return;
          } catch (error) {
            if (!isRateLimitError(error) || attempt >= MAX_RATE_LIMIT_RETRIES) throw error;
            attempt += 1;
            await sleep(RATE_LIMIT_RETRY_DELAY_MS * attempt);
          }
        }
      } catch (error) {
        reject(error);
      } finally {
        activeCount -= 1;
        dequeue();
      }
    };

    pendingTasks.push(run);
    dequeue();
  });
}

export async function runDriveRequestsInChunks<T>(tasks: Array<QueueTask<T>>, chunkSize = 3) {
  const results: PromiseSettledResult<T>[] = [];
  for (let index = 0; index < tasks.length; index += chunkSize) {
    const chunk = tasks.slice(index, index + chunkSize).map((task) => enqueueDriveRequest(task));
    results.push(...await Promise.allSettled(chunk));
  }
  return results;
}
