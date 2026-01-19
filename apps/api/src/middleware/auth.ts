import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export const requireAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // For download endpoints, support tokens in query params (for window.open downloads)
    const queryToken = (request.query as any)?.token;
    if (queryToken && typeof queryToken === 'string' && request.url.includes('/download')) {
      // Manually verify token from query param
      const decoded = request.server.jwt.verify<{ userId: string }>(queryToken);
      request.userId = decoded.userId;
      return;
    }

    // Default: verify from Authorization header
    const decoded = await request.jwtVerify<{ userId: string }>();
    request.userId = decoded.userId;
  } catch (err) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
};
