import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { config } from './lib/config';
import { authRoutes } from './routes/auth';
import { studentRoutes } from './routes/students';
import { classroomRoutes } from './routes/classrooms';
import { vocabularySheetRoutes } from './routes/vocabulary-sheets';
import { errorHandler } from './middleware/error-handler';
import { initializeBucket } from './lib/minio';
import { createVocabularyWorker } from './jobs/process-vocabulary-sheet';

const app = Fastify({
  logger: {
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
  },
});

// Register plugins
app.register(cors, {
  origin: config.corsOrigin,
  credentials: true,
});

app.register(cookie, {
  secret: config.jwt.refreshSecret,
  parseOptions: {},
});

app.register(jwt, {
  secret: config.jwt.accessSecret,
  sign: {
    expiresIn: config.jwt.accessExpiresIn,
  },
});

app.register(multipart, {
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1, // One file per request
  },
});

// Register routes
app.register(authRoutes, { prefix: '/api/auth' });
app.register(studentRoutes, { prefix: '/api/students' });
app.register(classroomRoutes, { prefix: '/api/classrooms' });
app.register(vocabularySheetRoutes, { prefix: '/api/vocabulary-sheets' });

// Health check (under /api for consistency with frontend API_URL)
app.get('/api/health', async () => {
  return {
    status: 'ok',
    version: config.version,
    timestamp: new Date().toISOString(),
  };
});

// Error handler
app.setErrorHandler(errorHandler);

// Initialize MinIO bucket and start background workers on startup
app.addHook('onReady', async () => {
  try {
    await initializeBucket();
  } catch (error) {
    // Log warning but don't crash - MinIO might not be available yet
    app.log.warn(
      `Failed to initialize MinIO bucket. File upload features may not be available. Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  createVocabularyWorker();
});

// Start server
const start = async () => {
  try {
    await app.listen({
      port: config.port,
      host: config.host,
    });
    app.log.info(`Server listening on ${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
