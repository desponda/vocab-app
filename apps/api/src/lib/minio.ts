import { Client } from 'minio';
import { config } from './config';

// MinIO is optional - create client only if credentials are configured
export const minioClient: Client | null = config.minio?.accessKey && config.minio?.secretKey
  ? new Client({
      endPoint: config.minio.endpoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    })
  : null;

export const BUCKET_NAME = config.minio?.bucket || 'vocab-documents';

/**
 * Initialize MinIO bucket (create if doesn't exist)
 * Returns silently if MinIO is not configured
 */
export async function initializeBucket(): Promise<void> {
  if (!minioClient) {
    console.warn('MinIO not configured. File upload features will be unavailable.');
    return;
  }

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
