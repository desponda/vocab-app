import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().default(3001),
  host: z.string().default('0.0.0.0'),
  logLevel: z.string().default('info'),

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
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  host: process.env.HOST,
  logLevel: process.env.LOG_LEVEL,

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
});
