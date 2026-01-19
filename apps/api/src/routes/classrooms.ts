import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { generateClassroomCode } from '../lib/classroom-code';

const createClassroomSchema = z.object({
  name: z.string().min(1).max(100),
  gradeLevel: z.number().int().min(1).max(12),
});

const classroomIdSchema = z.object({
  id: z.string().cuid(),
});

const updateClassroomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  gradeLevel: z.number().int().min(1).max(12).optional(),
  isActive: z.boolean().optional(),
});

const enrollStudentSchema = z.object({
  code: z.string().length(6),
  studentId: z.string().cuid(),
});

const enrollmentIdSchema = z.object({
  enrollmentId: z.string().cuid(),
});

export const classroomRoutes = async (app: FastifyInstance) => {
  // All classroom routes require authentication
  app.addHook('onRequest', requireAuth);

  // Create classroom
  app.post('/', async (request: FastifyRequest, reply) => {
    const body = createClassroomSchema.parse(request.body);

    // Generate unique classroom code
    const code = await generateClassroomCode();

    const classroom = await prisma.classroom.create({
      data: {
        name: body.name,
        code,
        gradeLevel: body.gradeLevel,
        teacherId: request.userId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        gradeLevel: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return reply.code(201).send({ classroom });
  });

  // List teacher's classrooms
  app.get('/', async (request: FastifyRequest, reply) => {
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: request.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        gradeLevel: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return reply.send({ classrooms });
  });

  // Get classroom details with enrolled students
  app.get('/:id', async (request: FastifyRequest, reply) => {
    const params = classroomIdSchema.parse(request.params);

    const classroom = await prisma.classroom.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId, // Verify ownership
      },
      select: {
        id: true,
        name: true,
        code: true,
        gradeLevel: true,
        isActive: true,
        createdAt: true,
        enrollments: {
          select: {
            id: true,
            enrolledAt: true,
            student: {
              select: {
                id: true,
                name: true,
                gradeLevel: true,
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
    });

    if (!classroom) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    return reply.send({ classroom });
  });

  // Update classroom
  app.patch('/:id', async (request: FastifyRequest, reply) => {
    const params = classroomIdSchema.parse(request.params);
    const body = updateClassroomSchema.parse(request.body);

    // Verify ownership
    const existing = await prisma.classroom.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    const classroom = await prisma.classroom.update({
      where: { id: params.id },
      data: body,
      select: {
        id: true,
        name: true,
        code: true,
        gradeLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.send({ classroom });
  });

  // Delete classroom
  app.delete('/:id', async (request: FastifyRequest, reply) => {
    const params = classroomIdSchema.parse(request.params);

    // Verify ownership
    const existing = await prisma.classroom.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    await prisma.classroom.delete({
      where: { id: params.id },
    });

    return reply.code(204).send();
  });

  // Enroll student in classroom (via code)
  app.post('/enroll', async (request: FastifyRequest, reply) => {
    const body = enrollStudentSchema.parse(request.body);

    // Verify student ownership
    const student = await prisma.student.findFirst({
      where: {
        id: body.studentId,
        userId: request.userId,
      },
    });

    if (!student) {
      return reply.code(404).send({ error: 'Student not found' });
    }

    // Find classroom by code
    const classroom = await prisma.classroom.findUnique({
      where: { code: body.code },
    });

    if (!classroom || !classroom.isActive) {
      return reply.code(404).send({ error: 'Invalid classroom code' });
    }

    // Check if already enrolled
    const existing = await prisma.studentEnrollment.findUnique({
      where: {
        studentId_classroomId: {
          studentId: body.studentId,
          classroomId: classroom.id,
        },
      },
    });

    if (existing) {
      return reply.code(409).send({ error: 'Student already enrolled in this classroom' });
    }

    // Create enrollment
    const enrollment = await prisma.studentEnrollment.create({
      data: {
        studentId: body.studentId,
        classroomId: classroom.id,
      },
      select: {
        id: true,
        enrolledAt: true,
        classroom: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return reply.code(201).send({ enrollment });
  });

  // Unenroll student from classroom
  app.delete('/enroll/:enrollmentId', async (request: FastifyRequest, reply) => {
    const params = enrollmentIdSchema.parse(request.params);

    // Verify ownership of student
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: params.enrollmentId },
      include: {
        student: true,
      },
    });

    if (!enrollment || enrollment.student.userId !== request.userId) {
      return reply.code(404).send({ error: 'Enrollment not found' });
    }

    await prisma.studentEnrollment.delete({
      where: { id: params.enrollmentId },
    });

    return reply.code(204).send();
  });
};
