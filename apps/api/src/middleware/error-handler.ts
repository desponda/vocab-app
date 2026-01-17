import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }

  // Handle authentication errors
  if (error.statusCode === 401) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: error.message || 'Authentication required',
    });
  }

  // Handle not found
  if (error.statusCode === 404) {
    return reply.status(404).send({
      error: 'Not Found',
      message: error.message || 'Resource not found',
    });
  }

  // Log internal server errors
  if (error.statusCode === 500 || !error.statusCode) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }

  // Default error response
  return reply.status(error.statusCode || 500).send({
    error: error.name,
    message: error.message,
  });
};
