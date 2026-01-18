import { Client } from 'minio';
import { config } from './config';

if (!config.minio?.accessKey || !config.minio?.secretKey) {
  throw new Error(
    'MinIO credentials not configured. Set MINIO_ACCESS_KEY and MINIO_SECRET_KEY environment variables.'
  );
}

export const minioClient = new Client({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

export const BUCKET_NAME = config.minio.bucket;

/**
 * Initialize MinIO bucket (create if doesn't exist)
 */
export async function initializeBucket(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`MinIO bucket '${BUCKET_NAME}' created successfully`);
    } else {
      console.log(`MinIO bucket '${BUCKET_NAME}' already exists`);
    }
  } catch (error) {
    console.error('Failed to initialize MinIO bucket:', error);
    throw error;
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
  await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, metadata);
}

/**
 * Download file from MinIO
 */
export async function downloadFile(objectName: string): Promise<Buffer> {
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
  await minioClient.removeObject(BUCKET_NAME, objectName);
}

/**
 * Get presigned URL for file download (valid for 24 hours)
 */
export async function getPresignedUrl(objectName: string): Promise<string> {
  return await minioClient.presignedGetObject(BUCKET_NAME, objectName, 24 * 60 * 60);
}
