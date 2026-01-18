import { Client } from 'minio';
import { config } from './config';

if (!config.minio) {
  throw new Error('MinIO configuration is required. Please set MINIO_* environment variables.');
}

if (!config.minio.accessKey || !config.minio.secretKey) {
  throw new Error('MinIO credentials (MINIO_ACCESS_KEY and MINIO_SECRET_KEY) are required.');
}

const minioConfig = config.minio;

export const minioClient = new Client({
  endPoint: minioConfig.endpoint,
  port: minioConfig.port,
  useSSL: minioConfig.useSSL,
  accessKey: minioConfig.accessKey!,
  secretKey: minioConfig.secretKey!,
});

/**
 * Ensure MinIO bucket exists on startup
 */
export async function ensureBucket() {
  if (!config.minio) {
    throw new Error('MinIO not configured');
  }

  try {
    const bucketExists = await minioClient.bucketExists(config.minio.bucket);
    if (!bucketExists) {
      await minioClient.makeBucket(config.minio.bucket);
      console.log(`✓ Created MinIO bucket: ${config.minio.bucket}`);
    } else {
      console.log(`✓ MinIO bucket exists: ${config.minio.bucket}`);
    }
  } catch (error) {
    console.error(`✗ Failed to ensure MinIO bucket:`, error);
    throw error;
  }
}
