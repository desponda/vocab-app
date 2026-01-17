import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../lib/config';
import { requireAuth } from '../middleware/auth';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_COOKIE = 'refreshToken';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Helper functions
const hashPassword = (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

const comparePassword = (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

const generateTokens = async (
  app: FastifyInstance,
  userId: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = app.jwt.sign({ userId });

  const refreshToken = jwt.sign(
    { userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  // Store refresh token in database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

export const authRoutes = async (app: FastifyInstance) => {
  // Register
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.code(409).send({
        error: 'Conflict',
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(app, user.id);

    // Set refresh token cookie
    reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    return reply.send({
      user,
      accessToken,
    });
  });

  // Login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(
      body.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(app, user.id);

    // Set refresh token cookie
    reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
    });
  });

  // Refresh token
  app.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Refresh token not found',
      });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
        userId: string;
      };

      // Check if token exists in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired refresh token',
        });
      }

      // Generate new access token
      const accessToken = app.jwt.sign({ userId: decoded.userId });

      return reply.send({ accessToken });
    } catch (err) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid refresh token',
      });
    }
  });

  // Logout
  app.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];

    if (refreshToken) {
      // Delete refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Clear cookie
    reply.clearCookie(REFRESH_TOKEN_COOKIE, {
      path: '/',
    });

    return reply.send({ message: 'Logged out successfully' });
  });

  // Get current user
  app.get(
    '/me',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return reply.send({ user });
    }
  );
};
