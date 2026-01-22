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

    // ═══════════════════════════════════════════════════════════════
    // CRITICAL AUTHORIZATION: Student.id vs User.id
    // ═══════════════════════════════════════════════════════════════
    // DO NOT compare studentId with request.userId directly!
    // - studentId is Student.id (student record ID)
    // - request.userId is User.id (auth user ID)
    // These are DIFFERENT tables with DIFFERENT values!
    //
    // For STUDENTS: Check Student.userId === request.userId
    // For TEACHERS: Check student is in teacher's classroom
    //
    // Use helper: canAccessStudentData(studentId, request.userId)
    // See: /workspace/apps/api/src/lib/authorization.ts
    // ═══════════════════════════════════════════════════════════════

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

  /**
   * GET /api/classrooms/:id/stats
   * Get classroom statistics (student count, tests assigned, avg score, completion rate)
   */
  app.get('/:id/stats', async (request: FastifyRequest, reply) => {
    const params = classroomIdSchema.parse(request.params);

    // Verify ownership
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId,
      },
      include: {
        _count: {
          select: { enrollments: true, testAssignments: true },
        },
      },
    });

    if (!classroom) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    // Get test attempts for this classroom
    const testAttempts = await prisma.testAttempt.findMany({
      where: {
        test: {
          assignments: {
            some: {
              classroomId: params.id,
            },
          },
        },
        status: 'SUBMITTED',
      },
      select: {
        score: true,
        totalQuestions: true,
        correctAnswers: true,
      },
    });

    const totalAttempts = testAttempts.length;
    const avgTestScore = totalAttempts > 0
      ? Math.round(testAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / totalAttempts)
      : 0;

    // Calculate completion rate (completed tests / assigned tests)
    const assignedTests = classroom._count.testAssignments;
    const completedTestAttempts = await prisma.testAttempt.findMany({
      where: {
        test: {
          assignments: {
            some: {
              classroomId: params.id,
            },
          },
        },
        status: 'SUBMITTED',
      },
      select: {
        studentId: true,
        testId: true,
      },
    });

    // Count unique student-test combinations
    const uniqueCompletions = new Set(
      completedTestAttempts.map(a => `${a.studentId}-${a.testId}`)
    );
    const completedTests = uniqueCompletions.size;

    const completionRate = assignedTests > 0
      ? Math.round((completedTests / (assignedTests * classroom._count.enrollments)) * 100)
      : 0;

    return reply.send({
      studentCount: classroom._count.enrollments,
      testsAssigned: classroom._count.testAssignments,
      avgTestScore,
      completionRate,
    });
  });

  /**
   * GET /api/classrooms/:id/activity
   * Get recent classroom activity (enrollments, test completions, test assignments)
   */
  app.get('/:id/activity', async (request: FastifyRequest, reply) => {
    const params = classroomIdSchema.parse(request.params);

    // Verify ownership
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId,
      },
    });

    if (!classroom) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    // Get recent enrollments
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { classroomId: params.id },
      select: {
        enrolledAt: true,
        student: {
          select: { name: true },
        },
      },
      orderBy: { enrolledAt: 'desc' },
      take: 10,
    });

    // Get recent test completions
    const testCompletions = await prisma.testAttempt.findMany({
      where: {
        test: {
          assignments: {
            some: {
              classroomId: params.id,
            },
          },
        },
        status: 'SUBMITTED',
      },
      select: {
        completedAt: true,
        score: true,
        student: {
          select: { name: true },
        },
        test: {
          select: { name: true },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    // Get recent test assignments
    const testAssignments = await prisma.testAssignment.findMany({
      where: { classroomId: params.id },
      select: {
        assignedAt: true,
        test: {
          select: { name: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
      take: 10,
    });

    // Combine and sort activities
    const activities = [
      ...enrollments.map(e => ({
        type: 'enrollment' as const,
        studentName: e.student.name,
        timestamp: e.enrolledAt,
      })),
      ...testCompletions.map(tc => ({
        type: 'test_completion' as const,
        studentName: tc.student.name,
        testName: tc.test.name,
        score: tc.score,
        timestamp: tc.completedAt!,
      })),
      ...testAssignments.map(ta => ({
        type: 'test_assignment' as const,
        testName: ta.test.name,
        timestamp: ta.assignedAt,
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 15);

    return reply.send({ activities });
  });

  /**
   * GET /api/classrooms/:id/test-attempts
   * Get all test attempts for a classroom (for Results tab)
   */
  app.get('/:id/test-attempts', async (request: FastifyRequest, reply) => {
    const params = classroomIdSchema.parse(request.params);

    // Verify ownership
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: params.id,
        teacherId: request.userId,
      },
    });

    if (!classroom) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    // Get all completed test attempts for this classroom
    const attempts = await prisma.testAttempt.findMany({
      where: {
        test: {
          assignments: {
            some: {
              classroomId: params.id,
            },
          },
        },
        status: 'SUBMITTED', // Students submit tests, they're auto-graded
      },
      select: {
        id: true,
        score: true,
        completedAt: true,
        student: {
          select: {
            name: true,
          },
        },
        test: {
          select: {
            name: true,
            variant: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    return reply.send({
      attempts: attempts.map(attempt => ({
        id: attempt.id,
        studentName: attempt.student.name,
        testName: attempt.test.name,
        variant: attempt.test.variant,
        score: attempt.score || 0,
        completedAt: attempt.completedAt,
      })),
    });
  });
};
