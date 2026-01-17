import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { config } from './lib/config';
import { authRoutes } from './routes/auth';
import { studentRoutes } from './routes/students';
import { errorHandler } from './middleware/error-handler';

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

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
app.register(authRoutes, { prefix: '/api/auth' });
app.register(studentRoutes, { prefix: '/api/students' });

// Error handler
app.setErrorHandler(errorHandler);

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
