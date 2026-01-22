import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

// Schemas for validation
const sheetIdSchema = z.object({
  sheetId: z.string().cuid(),
});

const wordIdSchema = z.object({
  wordId: z.string().cuid(),
});

const studentIdQuerySchema = z.object({
  studentId: z.string().cuid(),
});

const updateConfidenceSchema = z.object({
  studentId: z.string().cuid(),
  confidence: z.number().int().min(1).max(2), // 1 = "Not Yet", 2 = "Got It!"
});

export const studyRoutes = async (app: FastifyInstance) => {
  // All study routes require authentication
  app.addHook('onRequest', requireAuth);

  // GET /api/study/sheets/:sheetId/words
  // Get all words for a vocabulary sheet with student's progress
  app.get('/sheets/:sheetId/words', async (request: FastifyRequest, reply) => {
    const params = sheetIdSchema.parse(request.params);
    const query = studentIdQuerySchema.parse(request.query);

    // Verify student belongs to authenticated user
    const student = await prisma.student.findFirst({
      where: {
        id: query.studentId,
        userId: request.userId,
      },
    });

    if (!student) {
      return reply.code(403).send({ error: 'Unauthorized to access this student data' });
    }

    // Get vocabulary sheet with words
    const sheet = await prisma.vocabularySheet.findUnique({
      where: { id: params.sheetId },
      include: {
        words: {
          orderBy: { word: 'asc' },
        },
      },
    });

    if (!sheet) {
      return reply.code(404).send({ error: 'Vocabulary sheet not found' });
    }

    // Get study progress for this student and sheet
    const studyProgress = await prisma.studyProgress.findMany({
      where: {
        studentId: query.studentId,
        word: {
          sheetId: params.sheetId,
        },
      },
    });

    // Create a map of wordId -> progress
    const progressMap = new Map(
      studyProgress.map((p) => [p.wordId, p])
    );

    // Combine words with progress
    const wordsWithProgress = sheet.words.map((word) => {
      const progress = progressMap.get(word.id);
      return {
        id: word.id,
        word: word.word,
        definition: word.definition,
        context: word.context,
        confidence: progress?.confidence ?? 0,
        studyCount: progress?.studyCount ?? 0,
        lastStudiedAt: progress?.lastStudiedAt ?? null,
      };
    });

    // Calculate stats
    const stats = {
      total: wordsWithProgress.length,
      mastered: wordsWithProgress.filter((w) => w.confidence === 2).length,
      notYet: wordsWithProgress.filter((w) => w.confidence === 1).length,
      notSeen: wordsWithProgress.filter((w) => w.confidence === 0).length,
    };

    return reply.send({
      words: wordsWithProgress,
      stats,
    });
  });

  // POST /api/study/words/:wordId/confidence
  // Update confidence level for a word
  app.post('/words/:wordId/confidence', async (request: FastifyRequest, reply) => {
    const params = wordIdSchema.parse(request.params);
    const body = updateConfidenceSchema.parse(request.body);

    // Verify student belongs to authenticated user
    const student = await prisma.student.findFirst({
      where: {
        id: body.studentId,
        userId: request.userId,
      },
    });

    if (!student) {
      return reply.code(403).send({ error: 'Unauthorized to update this student data' });
    }

    // Verify word exists
    const word = await prisma.vocabularyWord.findUnique({
      where: { id: params.wordId },
    });

    if (!word) {
      return reply.code(404).send({ error: 'Word not found' });
    }

    // Upsert study progress
    const progress = await prisma.studyProgress.upsert({
      where: {
        studentId_wordId: {
          studentId: body.studentId,
          wordId: params.wordId,
        },
      },
      update: {
        confidence: body.confidence,
        studyCount: { increment: 1 },
        lastStudiedAt: new Date(),
      },
      create: {
        studentId: body.studentId,
        wordId: params.wordId,
        confidence: body.confidence,
        studyCount: 1,
        lastStudiedAt: new Date(),
      },
    });

    return reply.send({ progress });
  });

  // GET /api/study/sheets/:sheetId/stats
  // Get study statistics for a sheet
  app.get('/sheets/:sheetId/stats', async (request: FastifyRequest, reply) => {
    const params = sheetIdSchema.parse(request.params);
    const query = studentIdQuerySchema.parse(request.query);

    // Verify student belongs to authenticated user
    const student = await prisma.student.findFirst({
      where: {
        id: query.studentId,
        userId: request.userId,
      },
    });

    if (!student) {
      return reply.code(403).send({ error: 'Unauthorized to access this student data' });
    }

    // Get total words in sheet
    const totalWords = await prisma.vocabularyWord.count({
      where: { sheetId: params.sheetId },
    });

    // Get study progress counts
    const studyProgress = await prisma.studyProgress.findMany({
      where: {
        studentId: query.studentId,
        word: {
          sheetId: params.sheetId,
        },
      },
      select: {
        confidence: true,
      },
    });

    const mastered = studyProgress.filter((p) => p.confidence === 2).length;
    const notYet = studyProgress.filter((p) => p.confidence === 1).length;
    const notSeen = totalWords - mastered - notYet;

    const progressPercent = totalWords > 0 ? Math.round((mastered / totalWords) * 100) : 0;

    return reply.send({
      total: totalWords,
      mastered,
      notYet,
      notSeen,
      progressPercent,
    });
  });
};
