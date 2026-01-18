import { Client } from 'minio';
import { config } from './config';

export const minioClient = new Client({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

/**
 * Ensure MinIO bucket exists on startup
 */
export async function ensureBucket() {
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
