import { prisma } from './prisma';
import { minioClient, BUCKET_NAME } from './minio';
import { getVocabularyQueue } from './queue';
import pino from 'pino';
import { config } from './config';

// Create standalone logger matching Fastify configuration
const logger = pino({
  level: config.logLevel,
  transport:
    config.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    database: DependencyCheck;
    redis: DependencyCheck;
    minio: DependencyCheck;
  };
  timestamp: string;
  version: string;
}

export interface DependencyCheck {
  status: 'up' | 'down' | 'not_configured';
  responseTime?: number; // milliseconds
  error?: string;
  details?: Record<string, any>;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<DependencyCheck> {
  const startTime = Date.now();

  try {
    // Simple query to check database connection
    await prisma.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - startTime;

    return {
      status: 'up',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error({ err: error }, 'Database health check failed');

    return {
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

/**
 * Check Redis connectivity (via BullMQ queue)
 */
async function checkRedis(): Promise<DependencyCheck> {
  if (!config.redisUrl) {
    return {
      status: 'not_configured',
      details: { message: 'Redis URL not configured' },
    };
  }

  const startTime = Date.now();

  try {
    const queue = getVocabularyQueue();

    if (!queue) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: 'Queue not initialized',
      };
    }

    // Ping Redis via BullMQ client
    const client = await queue.client;
    await client.ping();

    const responseTime = Date.now() - startTime;

    // Get queue stats
    const jobCounts = await queue.getJobCounts();

    return {
      status: 'up',
      responseTime,
      details: {
        waiting: jobCounts.waiting,
        active: jobCounts.active,
        completed: jobCounts.completed,
        failed: jobCounts.failed,
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error({ err: error }, 'Redis health check failed');

    return {
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown Redis error',
    };
  }
}

/**
 * Check MinIO connectivity
 */
async function checkMinIO(): Promise<DependencyCheck> {
  if (!minioClient) {
    return {
      status: 'not_configured',
      details: { message: 'MinIO not configured' },
    };
  }

  const startTime = Date.now();

  try {
    // Check if bucket exists
    const exists = await minioClient.bucketExists(BUCKET_NAME);

    const responseTime = Date.now() - startTime;

    if (!exists) {
      return {
        status: 'down',
        responseTime,
        error: `Bucket "${BUCKET_NAME}" does not exist`,
      };
    }

    return {
      status: 'up',
      responseTime,
      details: { bucket: BUCKET_NAME },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error({ err: error }, 'MinIO health check failed');

    return {
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown MinIO error',
    };
  }
}

/**
 * Run all health checks
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const [database, redis, minio] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkMinIO(),
  ]);

  // Determine overall status
  let status: 'healthy' | 'unhealthy' | 'degraded';

  // Critical: Database must be up
  if (database.status === 'down') {
    status = 'unhealthy';
  }
  // Degraded: Optional services down
  else if (
    redis.status === 'down' ||
    minio.status === 'down'
  ) {
    status = 'degraded';
  }
  // Healthy: All configured services up
  else {
    status = 'healthy';
  }

  return {
    status,
    checks: {
      database,
      redis,
      minio,
    },
    timestamp: new Date().toISOString(),
    version: config.version,
  };
}

/**
 * Simple liveness check (is the app running?)
 */
export function livenessCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: config.version,
  };
}
