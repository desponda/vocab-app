import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const teachersRoutes = async (app: FastifyInstance) => {
  // All routes require authentication
  app.addHook('onRequest', requireAuth);

  /**
   * GET /api/teachers/dashboard-stats
   * Get overview statistics for teacher dashboard
   */
  app.get('/dashboard-stats', async (request, reply) => {
    const userId = request.userId;

    // Verify user is a teacher
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'TEACHER') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Only teachers can access this endpoint' });
    }

    // Get total students across all classrooms
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: userId },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    });

    const totalStudents = classrooms.reduce((sum, classroom) => sum + classroom._count.enrollments, 0);
    const activeClassrooms = classrooms.filter(c => c.isActive).length;

    // Get vocabulary sheets stats
    const vocabularySheets = await prisma.vocabularySheet.findMany({
      where: { teacherId: userId },
      select: { status: true },
    });

    const totalSheets = vocabularySheets.length;
    const processingSheets = vocabularySheets.filter(s => s.status === 'PROCESSING').length;

    // Get recent activity count (enrollments and test completions in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentEnrollments = await prisma.studentEnrollment.count({
      where: {
        classroom: { teacherId: userId },
        enrolledAt: { gte: sevenDaysAgo },
      },
    });

    const recentTestCompletions = await prisma.testAttempt.count({
      where: {
        test: {
          sheet: { teacherId: userId },
        },
        status: 'GRADED',
        completedAt: { gte: sevenDaysAgo },
      },
    });

    const recentActivityCount = recentEnrollments + recentTestCompletions;

    return reply.send({
      totalStudents,
      activeClassrooms,
      vocabularySheets: {
        total: totalSheets,
        processing: processingSheets,
      },
      recentActivityCount,
    });
  });
};
