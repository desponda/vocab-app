import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().default(3001),
  host: z.string().default('0.0.0.0'),
  logLevel: z.string().default('info'),
  version: z.string().default('dev'),

  // Database
  databaseUrl: z.string().url(),

  // Redis
  redisUrl: z.string().url(),

  // JWT
  jwt: z.object({
    accessSecret: z.string().min(32),
    refreshSecret: z.string().min(32),
    accessExpiresIn: z.string().default('15m'),
    refreshExpiresIn: z.string().default('7d'),
  }),

  // CORS
  corsOrigin: z.string().default('http://localhost:3000'),

  // Anthropic
  anthropicApiKey: z.string().optional(),

  // MinIO Object Storage
  minio: z.object({
    endpoint: z.string().default('localhost'),
    port: z.coerce.number().default(9000),
    useSSL: z.coerce.boolean().default(false),
    accessKey: z.string().min(1),
    secretKey: z.string().min(32),
    bucket: z.string().default('vocab-documents'),
  }),

  // File Upload
  upload: z.object({
    maxFileSize: z.coerce.number().default(10 * 1024 * 1024), // 10 MB
    allowedMimeTypes: z.array(z.string()).default([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ]),
  }),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  host: process.env.HOST,
  logLevel: process.env.LOG_LEVEL,
  version: process.env.VERSION,

  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },

  corsOrigin: process.env.CORS_ORIGIN,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT,
    useSSL: process.env.MINIO_USE_SSL,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET,
  },

  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE,
  },
});
