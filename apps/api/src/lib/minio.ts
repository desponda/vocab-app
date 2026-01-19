import { Client } from 'minio';
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

// MinIO is optional - create client only if credentials are configured
export const minioClient: Client | null = config.minio?.accessKey && config.minio?.secretKey
  ? createMinIOClient(
      config.minio.endpoint,
      config.minio.port,
      config.minio.useSSL,
      config.minio.accessKey as string,
      config.minio.secretKey as string
    )
  : null;

function createMinIOClient(
  endpoint: string,
  port: number,
  useSSL: boolean,
  accessKey: string,
  secretKey: string
): Client {
  const client = new Client({
    endPoint: endpoint,
    port,
    useSSL,
    accessKey,
    secretKey,
  });

  // Accept self-signed certificates for MinIO Operator-managed tenants
  // This is safe for internal Kubernetes cluster communication
  if (useSSL) {
    client.setRequestOptions({
      rejectUnauthorized: false,
    });
  }

  return client;
}

export const BUCKET_NAME = config.minio?.bucket || 'vocab-documents';

/**
 * Initialize MinIO bucket (create if doesn't exist)
 * Returns silently if MinIO is not configured
 */
export async function initializeBucket(): Promise<void> {
  if (!minioClient) {
    logger.warn('MinIO not configured. File upload features will be unavailable.');
    return;
  }

  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      logger.info({ bucket: BUCKET_NAME }, 'MinIO bucket created successfully');
    } else {
      logger.info({ bucket: BUCKET_NAME }, 'MinIO bucket already exists');
    }
  } catch (error) {
    // Log error but don't throw - MinIO might not be available
    logger.warn(
      { err: error, errorMessage: error instanceof Error ? error.message : String(error) },
      'Failed to initialize MinIO bucket. File upload features will be unavailable'
    );
  }
}

/**
 * Upload file to MinIO
 */
export async function uploadFile(
  objectName: string,
  buffer: Buffer,
  metadata?: Record<string, string>
): Promise<void> {
  if (!minioClient) {
    throw new Error('MinIO not configured. File upload is unavailable.');
  }
  await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, metadata);
}

/**
 * Download file from MinIO
 */
export async function downloadFile(objectName: string): Promise<Buffer> {
  if (!minioClient) {
    throw new Error('MinIO not configured. File download is unavailable.');
  }
  const stream = await minioClient.getObject(BUCKET_NAME, objectName);
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Delete file from MinIO
 */
export async function deleteFile(objectName: string): Promise<void> {
  if (!minioClient) {
    throw new Error('MinIO not configured. File deletion is unavailable.');
  }
  await minioClient.removeObject(BUCKET_NAME, objectName);
}

/**
 * Get presigned URL for file download (valid for 24 hours)
 */
export async function getPresignedUrl(objectName: string): Promise<string> {
  if (!minioClient) {
    throw new Error('MinIO not configured. Presigned URLs are unavailable.');
  }
  return await minioClient.presignedGetObject(BUCKET_NAME, objectName, 24 * 60 * 60);
}
