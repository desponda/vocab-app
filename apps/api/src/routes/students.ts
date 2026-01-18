import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

// Validation schemas
const createStudentSchema = z.object({
  name: z.string().min(1).max(100),
  gradeLevel: z.number().int().min(1).max(12),
});

const updateStudentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  gradeLevel: z.number().int().min(1).max(12).optional(),
});

const studentIdSchema = z.object({
  id: z.string().cuid(),
});

export const studentRoutes = async (app: FastifyInstance) => {
  // All student routes require authentication
  app.addHook('onRequest', requireAuth);

  // List students
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

  // Get student by ID
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

  // Create student
  app.post('/', async (request: FastifyRequest, reply) => {
    const body = createStudentSchema.parse(request.body);

    const student = await prisma.student.create({
      data: {
        name: body.name,
        gradeLevel: body.gradeLevel,
        userId: request.userId,
      },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.code(201).send({ student });
  });

  // Update student
  app.patch('/:id', async (request: FastifyRequest, reply) => {
    const params = studentIdSchema.parse(request.params);
    const body = updateStudentSchema.parse(request.body);

    // Check if student exists and belongs to user
    const existingStudent = await prisma.student.findFirst({
      where: {
        id: params.id,
        userId: request.userId,
      },
    });

    if (!existingStudent) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Student not found',
      });
    }

    // Update student
    const student = await prisma.student.update({
      where: { id: params.id },
      data: body,
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.send({ student });
  });

  // Delete student
  app.delete('/:id', async (request: FastifyRequest, reply) => {
    const params = studentIdSchema.parse(request.params);

    // Check if student exists and belongs to user
    const existingStudent = await prisma.student.findFirst({
      where: {
        id: params.id,
        userId: request.userId,
      },
    });

    if (!existingStudent) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Student not found',
      });
    }

    // Delete student
    await prisma.student.delete({
      where: { id: params.id },
    });

    return reply.code(204).send();
  });
};
