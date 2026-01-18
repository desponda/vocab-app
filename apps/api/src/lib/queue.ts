import { Queue } from 'bullmq';
import { config } from './config';

// Parse Redis URL to extract connection details
const redisUrl = new URL(config.redisUrl);

const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379'),
};

/**
 * Queue for processing vocabulary sheets
 */
export const vocabularyQueue = new Queue('vocabulary-processing', {
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

export interface VocabularyProcessingJob {
  sheetId: string;
}
