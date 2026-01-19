// Initialize Sentry FIRST (before other imports) for proper error tracking
import { initializeSentry } from './lib/sentry';
initializeSentry();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { config } from './lib/config';
import { authRoutes } from './routes/auth';
import { studentRoutes } from './routes/students';
import { classroomRoutes } from './routes/classrooms';
import { vocabularySheetRoutes } from './routes/vocabulary-sheets';
import { testRoutes } from './routes/tests';
import { teachersRoutes } from './routes/teachers';
import { errorHandler } from './middleware/error-handler';
import { initializeBucket } from './lib/minio';
import { createVocabularyWorker } from './jobs/process-vocabulary-sheet';
import { livenessCheck, performHealthCheck } from './lib/health';

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

// Security: Helmet headers (HSTS, CSP, X-Frame-Options, etc.)
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding from same origin
});

// Security: Rate limiting to prevent abuse
app.register(rateLimit, {
  max: 100, // Maximum 100 requests
  timeWindow: '15 minutes', // Per 15 minute window
  errorResponseBuilder: (request, context) => {
    const retryAfter = typeof context.after === 'string' ? context.after : Math.ceil((context.after as number) / 1000);
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
    };
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
app.register(testRoutes, { prefix: '/api/tests' });
app.register(teachersRoutes, { prefix: '/api/teachers' });

// Liveness check (simple check - is the app running?)
// Used by Kubernetes liveness probe
app.get('/api/health', async () => {
  return livenessCheck();
});

// Readiness check (comprehensive check - are all dependencies available?)
// Used by Kubernetes readiness probe
app.get('/api/health/ready', async (request, reply) => {
  const health = await performHealthCheck();

  // Return 503 if unhealthy (database down)
  if (health.status === 'unhealthy') {
    return reply.code(503).send(health);
  }

  // Return 200 even if degraded (optional services down, but core functionality works)
  return reply.code(200).send(health);
});

// Error handler
app.setErrorHandler(errorHandler);

// Initialize MinIO bucket and start background workers on startup
app.addHook('onReady', async () => {
  await initializeBucket();
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

    // Log Sentry status
    if (config.sentryDsn) {
      app.log.info('Sentry error tracking enabled');
    } else {
      app.log.warn('Sentry error tracking not configured (SENTRY_DSN missing)');
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
