import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

// Validation schemas
const studentIdSchema = z.object({
  id: z.string().cuid(),
});

export const studentRoutes = async (app: FastifyInstance) => {
  // All student routes require authentication
  app.addHook('onRequest', requireAuth);

  // List students - Returns student records for the authenticated user
  // Used by student dashboard to get their own Student record
  app.get('/', async (request: FastifyRequest, reply) => {
    const students = await prisma.student.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        createdAt: true,
        updatedAt: true,
        enrollments: {
          select: {
            id: true,
            classroomId: true,
          },
        },
      },
    });

    return reply.send({ students });
  });

  // Get student by ID - Used for viewing student details
  app.get('/:id', async (request: FastifyRequest, reply) => {
    const params = studentIdSchema.parse(request.params);

    const student = await prisma.student.findFirst({
      where: {
        id: params.id,
        userId: request.userId, // Ensure user owns this student
      },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!student) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Student not found',
      });
    }

    return reply.send({ student });
  });
};
