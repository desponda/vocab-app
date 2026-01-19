import { Queue } from 'bullmq';
import { config } from './config';

let vocabularyQueue: Queue | null = null;

/**
 * Get or create the vocabulary processing queue
 * Returns null if Redis is not configured (e.g., in tests)
 */
export function getVocabularyQueue(): Queue | null {
  if (!config.redisUrl) {
    return null;
  }

  if (!vocabularyQueue) {
    // Parse Redis URL to extract connection details
    const redisUrl = new URL(config.redisUrl);

    const connection = {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379'),
    };

    vocabularyQueue = new Queue('vocabulary-processing', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });
  }

  return vocabularyQueue;
}


export interface VocabularyProcessingJob {
  sheetId: string;
  action?: 'process' | 'regenerate'; // process = extract + generate, regenerate = only generate
}
