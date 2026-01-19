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

  /**
   * GET /api/students/all-enriched
   * Get all students across all classrooms with enriched data (teacher only)
   * Includes: classroom name, tests attempted, avg score, last active
   */
  app.get('/all-enriched', async (request: FastifyRequest, reply) => {
    // Verify user is a teacher
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { role: true },
    });

    if (!user || user.role !== 'TEACHER') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Only teachers can access this endpoint' });
    }

    // Get all classrooms for this teacher
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: request.userId },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        enrollments: {
          select: {
            enrolledAt: true,
            student: {
              select: {
                id: true,
                name: true,
                gradeLevel: true,
                testAttempts: {
                  where: { status: 'GRADED' },
                  select: {
                    score: true,
                    completedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Flatten and enrich student data
    const students = classrooms.flatMap(classroom =>
      classroom.enrollments.map(enrollment => {
        const attempts = enrollment.student.testAttempts;
        const testsAttempted = attempts.length;
        const avgScore = testsAttempted > 0
          ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / testsAttempted)
          : null;
        const lastActive = attempts.length > 0
          ? attempts.reduce((latest, a) =>
              !latest || (a.completedAt && a.completedAt > latest) ? a.completedAt : latest,
              null as Date | null
            )
          : null;

        return {
          id: enrollment.student.id,
          name: enrollment.student.name,
          gradeLevel: enrollment.student.gradeLevel || classroom.gradeLevel,
          classroomName: classroom.name,
          classroomId: classroom.id,
          testsAttempted,
          avgScore,
          lastActive,
          enrolledAt: enrollment.enrolledAt,
        };
      })
    );

    // Sort by most recent enrollment
    students.sort((a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime());

    return reply.send({ students });
  });

  /**
   * GET /api/students/me/stats
   * Get student dashboard stats (for logged-in student)
   */
  app.get('/me/stats', async (request: FastifyRequest, reply) => {
    // Get student record
    const student = await prisma.student.findFirst({
      where: { userId: request.userId },
    });

    if (!student) {
      return reply.status(404).send({ error: 'Student record not found' });
    }

    // Get all test assignments for student's classrooms
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: student.id },
      select: {
        classroom: {
          select: {
            testAssignments: {
              select: {
                testId: true,
              },
            },
          },
        },
      },
    });

    const assignedTestIds = new Set(
      enrollments.flatMap(e => e.classroom.testAssignments.map(ta => ta.testId))
    );

    const testsAssigned = assignedTestIds.size;

    // Get completed tests
    const completedAttempts = await prisma.testAttempt.findMany({
      where: {
        studentId: student.id,
        status: 'GRADED',
      },
      select: {
        score: true,
        completedAt: true,
        test: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 5,
    });

    const testsCompleted = completedAttempts.length;
    const avgScore = testsCompleted > 0
      ? Math.round(completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / testsCompleted)
      : 0;

    return reply.send({
      testsAssigned,
      testsCompleted,
      avgScore,
      recentAttempts: completedAttempts.map(a => ({
        testName: a.test.name,
        score: a.score || 0,
        completedAt: a.completedAt,
      })),
    });
  });
};
